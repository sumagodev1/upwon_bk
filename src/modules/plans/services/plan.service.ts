// src/modules/plans/services/plan.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { diffSnapshots } from '../../audit-logs/services/audit-log.service';
import * as subscriptionRepository from '../../subscriptions/repositories/subscription.repository';
import * as planRepository from '../repositories/plan.repository';
import {
  CreatePlanInput,
  Plan,
  PlanFilters,
  PlanWithUsage,
  UpdatePlanInput,
} from '../types/plan.types';

export const list = async (
  filters: PlanFilters,
  pagination: PaginationParams,
): Promise<{ rows: PlanWithUsage[]; meta: PaginationMeta }> => {
  const { rows, total } = await planRepository.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<PlanWithUsage> => {
  const plan = await planRepository.findDetailById(id);
  if (!plan) throw new NotFoundError('Plan');
  return plan;
};

export const create = async (
  input: CreatePlanInput,
  context: RequestContext,
): Promise<Plan> =>
  withTransaction(async (client) => {
    const existing = await planRepository.findByCode(input.code, client);
    if (existing) {
      throw new ConflictError('A plan with this code already exists', 'PLAN_CODE_TAKEN');
    }

    const plan = await planRepository.create(input, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.PLAN_CREATED,
        module: 'plans',
        entityType: 'plan',
        entityId: plan.id,
        newValues: {
          name: plan.name,
          code: plan.code,
          price: plan.price,
          currency: plan.currency,
          billingInterval: plan.billingInterval,
          status: plan.status,
        },
      },
      context,
      client,
    );

    return plan;
  });

export const update = async (
  id: string,
  input: UpdatePlanInput,
  context: RequestContext,
): Promise<Plan> =>
  withTransaction(async (client) => {
    const existing = await planRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Plan');

    /**
     * A subscription references a plan by id, so changing plans.price would
     * silently reprice every live subscriber. Creating a new plan and
     * migrating subscribers is the supported path.
     */
    const repricing =
      (input.price !== undefined && input.price !== existing.price) ||
      (input.billingInterval !== undefined &&
        input.billingInterval !== existing.billingInterval) ||
      (input.currency !== undefined && input.currency !== existing.currency);

    if (repricing) {
      const liveSubscriptions = await subscriptionRepository.countLiveByPlan(id, client);
      if (liveSubscriptions > 0) {
        throw new ConflictError(
          'Cannot change price, currency, or billing interval on a plan with active ' +
            'subscriptions. Create a new plan and migrate subscribers instead.',
          'PLAN_REPRICING_BLOCKED',
          { activeSubscriptions: liveSubscriptions },
        );
      }
    }

    const updated = await planRepository.update(id, input, client);
    if (!updated) throw new NotFoundError('Plan');

    const { oldValues, newValues } = diffSnapshots(
      existing as unknown as Record<string, unknown>,
      input as Record<string, unknown>,
    );

    if (Object.keys(newValues).length > 0) {
      await auditLogService.record(
        {
          action: AUDIT_ACTIONS.PLAN_UPDATED,
          module: 'plans',
          entityType: 'plan',
          entityId: id,
          oldValues,
          newValues,
        },
        context,
        client,
      );
    }

    return updated;
  });

/**
 * Plans are never hard-deleted. DELETE /plans/:id archives.
 * The ON DELETE RESTRICT FK on subscriptions.plan_id is the backstop.
 */
export const archive = async (id: string, context: RequestContext): Promise<Plan> =>
  withTransaction(async (client) => {
    const existing = await planRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Plan');
    if (existing.status === 'ARCHIVED') {
      throw new ConflictError('Plan is already archived', 'ALREADY_ARCHIVED');
    }

    const liveSubscriptions = await subscriptionRepository.countLiveByPlan(id, client);
    if (liveSubscriptions > 0) {
      throw new ConflictError(
        'Cannot archive a plan with active subscriptions. Migrate them to another plan first.',
        'PLAN_IN_USE',
        { activeSubscriptions: liveSubscriptions },
      );
    }

    const archived = await planRepository.updateStatus(id, 'ARCHIVED', client);
    if (!archived) throw new NotFoundError('Plan');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.PLAN_ARCHIVED,
        module: 'plans',
        entityType: 'plan',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: 'ARCHIVED' },
      },
      context,
      client,
    );

    return archived;
  });
