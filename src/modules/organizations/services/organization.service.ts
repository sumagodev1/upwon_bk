// src/modules/organizations/services/organization.service.ts

import { withTransaction } from '../../../config/database';
import {
  AUDIT_ACTIONS,
  OrganizationStatus,
  SubscriptionStatus,
} from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import { slugify } from '../../../core/utils/validation';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { diffSnapshots } from '../../audit-logs/services/audit-log.service';
import * as subscriptionRepository from '../../subscriptions/repositories/subscription.repository';
import * as organizationRepository from '../repositories/organization.repository';
import {
  CreateOrganizationDto,
  OrganizationDetailDto,
  OrganizationDto,
  OrganizationListItemDto,
  toOrganizationDetailDto,
  toOrganizationDto,
  toOrganizationListItemDto,
  UpdateOrganizationDto,
  UpdateOrganizationStatusDto,
} from '../types/organization.dto';
import { OrganizationFilters } from '../types/organization.types';

/**
 * Status transitions are the entire business logic of this module, so they are
 * modelled explicitly rather than as scattered if-statements.
 */
const ALLOWED_TRANSITIONS: Record<OrganizationStatus, OrganizationStatus[]> = {
  ACTIVE: ['INACTIVE', 'SUSPENDED'],
  INACTIVE: ['ACTIVE', 'SUSPENDED'],
  SUSPENDED: ['ACTIVE', 'INACTIVE'],
};

/**
 * Side effects of a status change on the organization's subscriptions.
 *
 * Suspension pauses billing state. Reactivation deliberately does NOT resume a
 * subscription: restoring billing is a separate, separately audited act.
 */
const SUBSCRIPTION_EFFECT: Partial<Record<OrganizationStatus, SubscriptionStatus | null>> = {
  SUSPENDED: 'PAST_DUE',
  INACTIVE: null,
  ACTIVE: null,
};

export const list = async (
  filters: OrganizationFilters,
  pagination: PaginationParams,
): Promise<{ rows: OrganizationListItemDto[]; meta: PaginationMeta }> => {
  const { rows, total } = await organizationRepository.findAll(filters, pagination);
  return {
    rows: rows.map(toOrganizationListItemDto),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getById = async (id: string): Promise<OrganizationDetailDto> => {
  const organization = await organizationRepository.findDetailById(id);
  if (!organization) throw new NotFoundError('Organization');
  return toOrganizationDetailDto(organization);
};

export const create = async (
  input: CreateOrganizationDto,
  context: RequestContext,
): Promise<OrganizationDto> => {
  const slug = input.slug ?? slugify(input.name);
  if (!slug) {
    throw new ConflictError(
      'Could not derive a slug from the organization name; provide one explicitly',
      'SLUG_UNDERIVABLE',
    );
  }

  const organization = await withTransaction(async (client) => {
    // The partial unique index organizations_slug_unique_live is the real
    // guarantee; this check produces the nicer error.
    if (await organizationRepository.existsBySlug(slug, undefined, client)) {
      throw new ConflictError('An organization with this slug already exists', 'SLUG_TAKEN');
    }

    const created = await organizationRepository.create(
      {
        name: input.name,
        slug,
        email: input.email,
        phone: input.phone ?? null,
        status: input.status,
      },
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ORGANIZATION_CREATED,
        module: 'organizations',
        entityType: 'organization',
        entityId: created.id,
        newValues: {
          name: created.name,
          slug: created.slug,
          email: created.email,
          status: created.status,
        },
      },
      context,
      client,
    );

    return created;
  });

  return toOrganizationDto(organization);
};

export const update = async (
  id: string,
  input: UpdateOrganizationDto,
  context: RequestContext,
): Promise<OrganizationDto> =>
  withTransaction(async (client) => {
    const existing = await organizationRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Organization');

    if (input.slug && input.slug !== existing.slug) {
      if (await organizationRepository.existsBySlug(input.slug, id, client)) {
        throw new ConflictError(
          'An organization with this slug already exists',
          'SLUG_TAKEN',
        );
      }
    }

    const updated = await organizationRepository.update(id, input, client);
    if (!updated) throw new NotFoundError('Organization');

    const { oldValues, newValues } = diffSnapshots(
      existing as unknown as Record<string, unknown>,
      input as Record<string, unknown>,
    );

    if (Object.keys(newValues).length > 0) {
      await auditLogService.record(
        {
          action: AUDIT_ACTIONS.ORGANIZATION_UPDATED,
          module: 'organizations',
          entityType: 'organization',
          entityId: id,
          oldValues,
          newValues,
        },
        context,
        client,
      );
    }

    return toOrganizationDto(updated);
  });

export const changeStatus = async (
  id: string,
  input: UpdateOrganizationStatusDto,
  context: RequestContext,
): Promise<OrganizationDto> =>
  withTransaction(async (client) => {
    const existing = await organizationRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Organization');

    if (existing.status === input.status) {
      throw new ConflictError(`Organization is already ${input.status}`, 'STATUS_UNCHANGED');
    }

    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new ConflictError(
        `Cannot transition from ${existing.status} to ${input.status}`,
        'INVALID_STATUS_TRANSITION',
        { from: existing.status, to: input.status, allowed },
      );
    }

    const updated = await organizationRepository.updateStatus(id, input.status, client);
    if (!updated) throw new NotFoundError('Organization');

    // Cascade to subscriptions where the transition demands it.
    const subscriptionEffect = SUBSCRIPTION_EFFECT[input.status];
    let affectedSubscriptions = 0;
    if (subscriptionEffect) {
      affectedSubscriptions = await subscriptionRepository.updateStatusByOrganization(
        id,
        ['ACTIVE', 'TRIALING'],
        subscriptionEffect,
        client,
      );
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ORGANIZATION_STATUS_CHANGED,
        module: 'organizations',
        entityType: 'organization',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: {
          status: input.status,
          reason: input.reason ?? null,
          affectedSubscriptions,
        },
      },
      context,
      client,
    );

    return toOrganizationDto(updated);
  });

export const softDelete = async (
  id: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await organizationRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Organization');

    const liveCount = await subscriptionRepository.countLiveByOrganization(id, client);
    if (liveCount > 0) {
      throw new ConflictError(
        'Cannot delete an organization with active subscriptions. Cancel them first.',
        'HAS_ACTIVE_SUBSCRIPTIONS',
        { activeSubscriptions: liveCount },
      );
    }

    await organizationRepository.softDelete(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ORGANIZATION_DELETED,
        module: 'organizations',
        entityType: 'organization',
        entityId: id,
        oldValues: { name: existing.name, slug: existing.slug, status: existing.status },
      },
      context,
      client,
    );
  });
};
