// src/modules/product-pages/vendor-portal-page/services/faq-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/faq-section.repository';
import {
  CreateVmsFaqEntryInput,
  PublicVmsFaqSection,
  UpdateVmsFaqEntryInput,
  VmsFaqEntry,
  VmsFaqEntryFilters,
} from '../types/faq-section.types';

const MODULE = 'vendor_portal_page';
const ENTITY = 'vms_faq_entry';

export const list = async (
  filters: VmsFaqEntryFilters,
  pagination: PaginationParams,
): Promise<{ rows: VmsFaqEntry[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<VmsFaqEntry> => {
  const entry = await repo.findById(id);
  if (!entry) throw new NotFoundError('FAQ entry');
  return entry;
};

export const create = async (
  input: CreateVmsFaqEntryInput,
  context: RequestContext,
): Promise<VmsFaqEntry> =>
  withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_VMS_FAQ_ENTRIES) {
      throw new ConflictError(
        `The FAQ holds at most ${LIMITS.MAX_VMS_FAQ_ENTRIES} questions. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_FAQ_ENTRY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { question: created.question, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const update = async (
  id: string,
  patch: UpdateVmsFaqEntryInput,
  context: RequestContext,
): Promise<VmsFaqEntry> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('FAQ entry');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('FAQ entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_FAQ_ENTRY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { question: existing.question, status: existing.status },
        newValues: { question: updated.question, status: updated.status },
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
): Promise<VmsFaqEntry> => update(id, { status }, context);

export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<VmsFaqEntry[]> =>
  withTransaction(async (client) => {
    const total = await repo.count(client);

    const existing = await repo.findExistingIds(ids, client);
    const unknown = ids.filter((id) => !existing.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('The order names a question that does not exist', [
        {
          field: 'ids',
          message: `Unknown entry ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_VMS_FAQ_ENTRY',
        },
      ]);
    }

    if (ids.length !== total) {
      throw new ValidationError('The order must list every question', [
        {
          field: 'ids',
          message: `Expected all ${total} entry ids, received ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_FAQ_ENTRIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    // Read on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_VMS_FAQ_ENTRIES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('FAQ entry');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_FAQ_ENTRY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { question: existing.question },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy above the accordion and the
 * questions in it.
 *
 * Null when the copy is missing or nothing is published - the page then keeps
 * the FAQ it ships, which is a complete working one.
 */
export const getPublished = async (): Promise<PublicVmsFaqSection | null> => {
  const [copy, entries] = await Promise.all([
    sectionCopyService.get('vms', 'faq'),
    repo.findPublished(),
  ]);
  if (!copy || entries.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    faqs: entries.map((entry) => ({ q: entry.question, a: entry.answer })),
  };
};
