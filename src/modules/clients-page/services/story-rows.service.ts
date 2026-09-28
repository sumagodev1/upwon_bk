// src/modules/clients-page/services/story-rows.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as caseRepo from '../repositories/cases-section.repository';
import * as repo from '../repositories/story-rows.repository';
import {
  CreateStoryRowInput,
  StoryRow,
  StoryRowKind,
  UpdateStoryRowInput,
} from '../types/story-rows.types';

const MODULE = 'clients_page';

/*
 * The four story list sections, one set of rules. Every call names its case
 * study, and a row is only ever found through the case it belongs to - a row
 * id from another case study answers 404, never someone else's row.
 */

const capitalised = (noun: string) => noun.charAt(0).toUpperCase() + noun.slice(1);

const assertCaseExists = async (caseId: string, executor?: Parameters<typeof caseRepo.findById>[1]) => {
  const found = await caseRepo.findById(caseId, executor);
  if (!found) throw new NotFoundError('Case study');
};

const snapshot = (row: StoryRow): Record<string, unknown> => ({
  caseId: row.caseId,
  ...row.values,
  displayOrder: row.displayOrder,
  status: row.status,
});

export const list = async (
  kind: StoryRowKind,
  caseId: string,
  status?: ContentStatus,
): Promise<StoryRow[]> => {
  await assertCaseExists(caseId);
  return repo.findByCase(kind, caseId, { status });
};

export const getById = async (kind: StoryRowKind, caseId: string, id: string): Promise<StoryRow> => {
  const row = await repo.findById(kind, caseId, id);
  if (!row) throw new NotFoundError(capitalised(kind.noun));
  return row;
};

export const create = async (
  kind: StoryRowKind,
  caseId: string,
  input: CreateStoryRowInput,
  context: RequestContext,
): Promise<StoryRow> =>
  withTransaction(async (client) => {
    // Lock the case, so two concurrent creates cannot both pass the cap.
    const parent = await caseRepo.findByIdForUpdate(caseId, client);
    if (!parent) throw new NotFoundError('Case study');

    const existing = await repo.countByCase(kind, caseId, client);
    if (existing >= kind.maxRows) {
      throw new ConflictError(
        `A case study holds at most ${kind.maxRows} ${kind.noun}s. Delete or deactivate one first.`,
        'STORY_ROW_LIMIT_REACHED',
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(kind, caseId, client));
    const created = await repo.create(kind, caseId, { ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_ROW_CREATED,
        module: MODULE,
        entityType: kind.entity,
        entityId: created.id,
        newValues: snapshot(created),
      },
      context,
      client,
    );

    return created;
  });

export const update = async (
  kind: StoryRowKind,
  caseId: string,
  id: string,
  patch: UpdateStoryRowInput,
  context: RequestContext,
): Promise<StoryRow> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(kind, caseId, id, client);
    if (!existing) throw new NotFoundError(capitalised(kind.noun));

    const updated = await repo.update(kind, caseId, id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError(capitalised(kind.noun));

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_ROW_UPDATED,
        module: MODULE,
        entityType: kind.entity,
        entityId: id,
        oldValues: snapshot(existing),
        newValues: snapshot(updated),
      },
      context,
      client,
    );

    return updated;
  });

export const setStatus = async (
  kind: StoryRowKind,
  caseId: string,
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<StoryRow> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(kind, caseId, id, client);
    if (!existing) throw new NotFoundError(capitalised(kind.noun));

    // Already in the requested state: no no-op write, no misleading audit row.
    if (existing.status === status) return existing;

    const updated = await repo.update(kind, caseId, id, { values: {}, status }, context.adminId, client);
    if (!updated) throw new NotFoundError(capitalised(kind.noun));

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_ROW_STATUS_CHANGED,
        module: MODULE,
        entityType: kind.entity,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

/** Takes the case's complete id list in its new order; partial lists are rejected. */
export const reorder = async (
  kind: StoryRowKind,
  caseId: string,
  ids: string[],
  context: RequestContext,
): Promise<StoryRow[]> =>
  withTransaction(async (client) => {
    const parent = await caseRepo.findByIdForUpdate(caseId, client);
    if (!parent) throw new NotFoundError('Case study');

    const rows = await repo.findByCase(kind, caseId, {}, client);
    const known = new Set(rows.map((row) => row.id));

    if (ids.length !== rows.length || ids.some((id) => !known.has(id))) {
      throw new ValidationError(`The order must list every ${kind.noun} of this case study`, [
        {
          field: 'ids',
          message: `Expected the ${rows.length} ${kind.noun} ids of this case study`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyOrder(kind, caseId, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_ROWS_REORDERED,
        module: MODULE,
        entityType: kind.entity,
        entityId: caseId,
        newValues: { order: ids },
      },
      context,
      client,
    );

    return repo.findByCase(kind, caseId, {}, client);
  });

export const remove = async (
  kind: StoryRowKind,
  caseId: string,
  id: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(kind, caseId, id, client);
    if (!existing) throw new NotFoundError(capitalised(kind.noun));

    await repo.remove(kind, caseId, id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_CASE_ROW_DELETED,
        module: MODULE,
        entityType: kind.entity,
        entityId: id,
        // The full row, so deleted copy is recoverable from the audit trail.
        oldValues: snapshot(existing),
      },
      context,
      client,
    );
  });
};
