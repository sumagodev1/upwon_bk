// src/modules/vs-sap-page/services/capabilities.service.ts

import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as capabilitiesRepository from '../repositories/capabilities.repository';
import {
  CreateVsSapCapabilityInput,
  PublicVsSapCapability,
  UpdateVsSapCapabilityInput,
  VsSapCapability,
  VsSapCapabilityFilters,
} from '../types/comparison.types';

const MODULE = 'vs_sap_page';
const ENTITY = 'vs_sap_capability';

/** The whole row, so a deleted row's label and ratings are recoverable from the trail. */
const auditSnapshot = (row: VsSapCapability): Record<string, unknown> => ({
  capability: row.capability,
  upwon: row.upwon,
  sap: row.sap,
  netsuite: row.netsuite,
  status: row.status,
  displayOrder: row.displayOrder,
});

/**
 * The website-facing shape of one row.
 *
 * Exported because the comparison SECTION's public read embeds the rows - the
 * page renders them as one table - and both halves must narrow a row the same
 * way.
 */
export const toPublicCapability = (row: VsSapCapability): PublicVsSapCapability => ({
  capability: row.capability,
  upwon: row.upwon,
  sap: row.sap,
  netsuite: row.netsuite,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (filters: VsSapCapabilityFilters): Promise<VsSapCapability[]> =>
  capabilitiesRepository.findAll(filters);

export const getById = async (id: string): Promise<VsSapCapability> => {
  const row = await capabilitiesRepository.findById(id);
  if (!row) throw new NotFoundError('Capability');
  return row;
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateVsSapCapabilityInput,
  context: RequestContext,
): Promise<VsSapCapability> =>
  withTransaction(async (client) => {
    const existing = await capabilitiesRepository.count(client);
    if (existing >= LIMITS.MAX_VS_SAP_CAPABILITIES) {
      throw new ConflictError(
        `The capability comparison holds at most ${LIMITS.MAX_VS_SAP_CAPABILITIES} rows. Delete or unpublish one first.`,
        'VS_SAP_CAPABILITY_LIMIT_REACHED',
      );
    }

    // Appended to the end of the table. Position is an editorial decision made
    // with the reorder arrows afterwards, not a number typed on the form.
    const displayOrder = await capabilitiesRepository.nextDisplayOrder(client);

    const row = await capabilitiesRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VS_SAP_CAPABILITY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: row.id,
        newValues: auditSnapshot(row),
      },
      context,
      client,
    );

    return row;
  });

export const update = async (
  id: string,
  patch: UpdateVsSapCapabilityInput,
  context: RequestContext,
): Promise<VsSapCapability> =>
  withTransaction(async (client) => {
    const existing = await capabilitiesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability');

    const saved = await capabilitiesRepository.update(id, patch, context.adminId, client);
    if (!saved) throw new NotFoundError('Capability');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VS_SAP_CAPABILITY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
        newValues: auditSnapshot(saved),
      },
      context,
      client,
    );

    return saved;
  });

/**
 * Publish / unpublish - the Active/Inactive control. Separate from update() for
 * the reason the About page's stat card's is: different decision, different
 * consequence, and the trail should say which one happened.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<VsSapCapability> =>
  withTransaction(async (client) => {
    const existing = await capabilitiesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) return existing;

    const saved = await capabilitiesRepository.updateStatus(
      id,
      status,
      context.adminId,
      client,
    );
    if (!saved) throw new NotFoundError('Capability');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VS_SAP_CAPABILITY_STATUS_CHANGED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: saved.status },
      },
      context,
      client,
    );

    return saved;
  });

/**
 * Takes every row's id in its new order and rewrites display_order to the array
 * index. Every row is required, so the result is a total order.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<VsSapCapability[]> =>
  withTransaction(async (client) => {
    const total = await capabilitiesRepository.count(client);
    const existingIds = await capabilitiesRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more capabilities do not exist', [
        {
          field: 'ids',
          message: `Unknown capability ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_VS_SAP_CAPABILITY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every capability', [
        {
          field: 'ids',
          message: `Expected all ${total} capability ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await capabilitiesRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VS_SAP_CAPABILITIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Read on `client` so the list reflects the order just written.
    return capabilitiesRepository.findAll({}, client);
  });

/** A hard delete; INACTIVE covers "not in the table right now". */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await capabilitiesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability');

    await capabilitiesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VS_SAP_CAPABILITY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
      },
      context,
      client,
    );
  });
};
