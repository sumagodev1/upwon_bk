// src/modules/clients-page/services/network-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../home-page/services/section-copy.service';
import * as repo from '../repositories/network-section.repository';
import {
  ClientsNetworkState,
  ClientsNetworkStateFilters,
  CreateClientsNetworkStateInput,
  PublicClientsNetworkSection,
  UpdateClientsNetworkStateInput,
} from '../types/network-section.types';

const MODULE = 'clients_page';
const ENTITY = 'clients_network_state';

/** The fields an audit entry records, so every write snapshots the same set. */
const auditSnapshot = (row: ClientsNetworkState): Record<string, unknown> => ({
  state: row.state,
  zone: row.zone,
  cities: row.cities,
  displayOrder: row.displayOrder,
  status: row.status,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: ClientsNetworkStateFilters,
  pagination: PaginationParams,
): Promise<{ rows: ClientsNetworkState[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ClientsNetworkState> => {
  const row = await repo.findById(id);
  if (!row) throw new NotFoundError('Network state');
  return row;
};

/**
 * The website-facing read: the copy and every active state in one response.
 * The site derives the counters and the map pins from `states`. Null when the
 * copy or the states are missing - the page then keeps the section it ships.
 */
export const getPublished = async (): Promise<PublicClientsNetworkSection | null> => {
  const [copy, rows] = await Promise.all([
    sectionCopyService.get('clients', 'network'),
    repo.findPublished(),
  ]);
  const states = rows.filter((row) => row.cities.length > 0);
  if (!copy || states.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext,
    states: states.map((row) => ({ state: row.state, zone: row.zone, cities: row.cities })),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateClientsNetworkStateInput,
  context: RequestContext,
): Promise<ClientsNetworkState> =>
  withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_CLIENTS_NETWORK_STATES) {
      throw new ConflictError(
        `The network holds at most ${LIMITS.MAX_CLIENTS_NETWORK_STATES} states. Delete or deactivate one first.`,
        'NETWORK_STATE_LIMIT_REACHED',
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_NETWORK_STATE_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: auditSnapshot(created),
      },
      context,
      client,
    );

    return created;
  });

export const update = async (
  id: string,
  patch: UpdateClientsNetworkStateInput,
  context: RequestContext,
): Promise<ClientsNetworkState> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Network state');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Network state');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_NETWORK_STATE_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
        newValues: auditSnapshot(updated),
      },
      context,
      client,
    );

    return updated;
  });

/** Publish / unpublish, separate from update() so the audit trail tells them apart. */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ClientsNetworkState> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Network state');

    // Already in the requested state: no no-op write, no misleading audit row.
    if (existing.status === status) return existing;

    const updated = await repo.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Network state');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_NETWORK_STATE_STATUS_CHANGED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

/** Takes the complete id list in its new order; partial lists are rejected. */
export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ClientsNetworkState[]> =>
  withTransaction(async (client) => {
    const total = await repo.count(client);
    if (ids.length !== total) {
      throw new ValidationError('The order must list every state', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a state that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_NETWORK_STATES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_CLIENTS_NETWORK_STATES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Network state');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_NETWORK_STATE_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        // The full row, so deleted cities are recoverable from the audit trail.
        oldValues: auditSnapshot(existing),
      },
      context,
      client,
    );
  });
};
