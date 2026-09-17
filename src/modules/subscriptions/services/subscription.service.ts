// src/modules/subscriptions/services/subscription.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, SubscriptionStatus } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { diffSnapshots } from '../../audit-logs/services/audit-log.service';
import * as organizationRepository from '../../organizations/repositories/organization.repository';
import * as planRepository from '../../plans/repositories/plan.repository';
import * as subscriptionRepository from '../repositories/subscription.repository';
import {
  CancelSubscriptionDto,
  SubscriptionFilters,
  SubscriptionWithRefs,
} from '../types/subscription.types';
import { computeEndDate } from '../types/subscription.utils';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from '../validators/subscription.validator';

/** CANCELLED and EXPIRED are terminal - nothing leaves them. */
const SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIALING: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
  ACTIVE: ['PAST_DUE', 'CANCELLED', 'EXPIRED'],
  PAST_DUE: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
  CANCELLED: [],
  EXPIRED: [],
};

export const list = async (
  filters: SubscriptionFilters,
  pagination: PaginationParams,
): Promise<{ rows: SubscriptionWithRefs[]; meta: PaginationMeta }> => {
  const { rows, total } = await subscriptionRepository.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<SubscriptionWithRefs> => {
  const subscription = await subscriptionRepository.findDetailById(id);
  if (!subscription) throw new NotFoundError('Subscription');
  return subscription;
};

export const create = async (
  input: CreateSubscriptionDto,
  context: RequestContext,
): Promise<SubscriptionWithRefs> => {
  const created = await withTransaction(async (client) => {
    const organization = await organizationRepository.findById(
      input.organizationId,
      client,
    );
    if (!organization) throw new NotFoundError('Organization');
    if (organization.status !== 'ACTIVE') {
      throw new ConflictError(
        `Cannot create a subscription for a ${organization.status} organization`,
        'ORGANIZATION_NOT_ACTIVE',
      );
    }

    const plan = await planRepository.findById(input.planId, client);
    if (!plan) throw new NotFoundError('Plan');
    if (plan.status !== 'ACTIVE') {
      throw new ConflictError('Cannot subscribe to a non-active plan', 'PLAN_NOT_ACTIVE');
    }

    // No pre-check for an existing live subscription: the partial unique index
    // subscriptions_one_live_per_org makes that atomic, and DatabaseError.from()
    // maps the violation to SUBSCRIPTION_EXISTS - exactly the message a
    // pre-check would have produced, without the race.
    const subscription = await subscriptionRepository.create(
      {
        organizationId: input.organizationId,
        planId: input.planId,
        status: input.status ?? 'ACTIVE',
        startDate: input.startDate,
        endDate: input.endDate ?? computeEndDate(input.startDate, plan.billingInterval),
      },
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SUBSCRIPTION_CREATED,
        module: 'subscriptions',
        entityType: 'subscription',
        entityId: subscription.id,
        newValues: {
          organizationId: subscription.organizationId,
          organizationSlug: organization.slug,
          planId: subscription.planId,
          planCode: plan.code,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        },
      },
      context,
      client,
    );

    return subscription;
  });

  return getById(created.id);
};

export const update = async (
  id: string,
  input: UpdateSubscriptionDto,
  context: RequestContext,
): Promise<SubscriptionWithRefs> => {
  await withTransaction(async (client) => {
    const existing = await subscriptionRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Subscription');

    if (input.status && input.status !== existing.status) {
      const allowed = SUBSCRIPTION_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new ConflictError(
          `Cannot transition a subscription from ${existing.status} to ${input.status}`,
          'INVALID_STATUS_TRANSITION',
          { from: existing.status, to: input.status, allowed },
        );
      }
    }

    if (input.planId && input.planId !== existing.planId) {
      const plan = await planRepository.findById(input.planId, client);
      if (!plan) throw new NotFoundError('Plan');
      if (plan.status === 'ARCHIVED') {
        throw new ConflictError(
          'Cannot migrate a subscription to an archived plan',
          'PLAN_ARCHIVED',
        );
      }
    }

    const startDate = input.startDate ?? existing.startDate;
    const endDate = input.endDate !== undefined ? input.endDate : existing.endDate;
    if (endDate && endDate < startDate) {
      throw new ConflictError('endDate must be on or after startDate', 'INVALID_DATE_RANGE');
    }

    const updated = await subscriptionRepository.update(id, input, client);
    if (!updated) throw new NotFoundError('Subscription');

    const { oldValues, newValues } = diffSnapshots(
      existing as unknown as Record<string, unknown>,
      input as Record<string, unknown>,
    );

    if (Object.keys(newValues).length > 0) {
      await auditLogService.record(
        {
          action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATED,
          module: 'subscriptions',
          entityType: 'subscription',
          entityId: id,
          oldValues,
          newValues,
        },
        context,
        client,
      );
    }
  });

  return getById(id);
};

export const cancel = async (
  id: string,
  input: CancelSubscriptionDto,
  context: RequestContext,
): Promise<SubscriptionWithRefs> => {
  await withTransaction(async (client) => {
    const existing = await subscriptionRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Subscription');

    if (!SUBSCRIPTION_TRANSITIONS[existing.status].includes('CANCELLED')) {
      throw new ConflictError(
        `A ${existing.status} subscription cannot be cancelled`,
        'INVALID_STATUS_TRANSITION',
      );
    }

    // immediate: end now. Otherwise the subscription runs to its paid-through
    // date and is swept to EXPIRED by the expiry job.
    const endDate = input.immediate ? new Date() : existing.endDate;

    const cancelled = await subscriptionRepository.cancel(id, endDate, client);
    if (!cancelled) throw new NotFoundError('Subscription');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
        module: 'subscriptions',
        entityType: 'subscription',
        entityId: id,
        oldValues: { status: existing.status, endDate: existing.endDate },
        newValues: {
          status: 'CANCELLED',
          endDate,
          reason: input.reason ?? null,
          immediate: Boolean(input.immediate),
        },
      },
      context,
      client,
    );
  });

  return getById(id);
};

/**
 * Scheduled sweep. Runs with adminId null - these are system-initiated
 * transitions with no human actor.
 */
export const expireOverdue = async (
  context: RequestContext,
): Promise<{ expired: number }> => {
  const expired = await withTransaction(async (client) => {
    const rows = await subscriptionRepository.expirePastDue(client);

    for (const row of rows) {
      await auditLogService.record(
        {
          action: AUDIT_ACTIONS.SUBSCRIPTION_EXPIRED,
          module: 'subscriptions',
          entityType: 'subscription',
          entityId: row.id,
          newValues: { status: 'EXPIRED', organizationId: row.organizationId },
        },
        { ...context, adminId: null },
        client,
      );
    }

    return rows.length;
  });

  return { expired };
};
