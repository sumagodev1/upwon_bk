// src/modules/industry-pages/engineering-manufacturing-page/services/capabilities-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/capabilities-section.repository';
import {
  CreateEngineeringCapabilityInput,
  EngineeringCapability,
  EngineeringCapabilityFilters,
  PublicEngineeringCapabilitiesSection,
  UpdateEngineeringCapabilityInput,
} from '../types/capabilities-section.types';

const MODULE = 'engineering_manufacturing_page';
const ENTITY = 'engineering_capability';

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: EngineeringCapabilityFilters,
  pagination: PaginationParams,
): Promise<{ rows: EngineeringCapability[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<EngineeringCapability> => {
  const capability = await repo.findById(id);
  if (!capability) throw new NotFoundError('Capability');
  return capability;
};

/**
 * The website-facing read: the copy and every active capability, in order.
 *
 * Null when the copy is missing or nothing is active - the site treats that as
 * "keep the built-in section", the same as an unreachable API.
 */
export const getPublished = async (): Promise<PublicEngineeringCapabilitiesSection | null> => {
  const [copy, capabilities] = await Promise.all([
    sectionCopyService.get('engineering-manufacturing', 'capabilities'),
    repo.findPublished(),
  ]);
  if (!copy || capabilities.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    capabilities: capabilities.map((capability) => ({
      title: capability.title,
      description: capability.description,
      icon: capability.icon,
      accentColor: capability.accentColor,
      tintColor: capability.tintColor,
    })),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateEngineeringCapabilityInput,
  context: RequestContext,
): Promise<EngineeringCapability> =>
  withTransaction(async (client) => {
    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_ENGINEERING_CAPABILITIES) {
      throw new ConflictError(
        `The artwork holds at most ${LIMITS.MAX_ENGINEERING_CAPABILITIES} capabilities. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_CAPABILITY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const update = async (
  id: string,
  patch: UpdateEngineeringCapabilityInput,
  context: RequestContext,
): Promise<EngineeringCapability> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Capability');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_CAPABILITY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { title: existing.title, status: existing.status },
        newValues: { title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<EngineeringCapability> => update(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<EngineeringCapability[]> =>
  withTransaction(async (client) => {
    const total = await repo.countAll(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every capability', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a capability that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_CAPABILITIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_ENGINEERING_CAPABILITIES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_CAPABILITY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { title: existing.title },
      },
      context,
      client,
    );
  });
};
