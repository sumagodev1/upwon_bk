// src/modules/industry-pages/dairy-page/services/faq-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as faqRepository from '../repositories/faq-section.repository';
import {
  CreateDairyFaqEntryInput,
  DairyFaqEntry,
  DairyFaqEntryFilters,
  PublicDairyFaqSection,
  UpdateDairyFaqEntryInput,
} from '../types/faq-section.types';

const MODULE = 'dairy_page';
const ENTITY = 'dairy_faq_entry';

/*
 * No media resolution here, unlike the page's other sections: the accordion is
 * text only, so the repository's shape is what callers get.
 */

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: DairyFaqEntryFilters,
  pagination: PaginationParams,
): Promise<{ rows: DairyFaqEntry[]; meta: PaginationMeta }> => {
  const { rows, total } = await faqRepository.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<DairyFaqEntry> => {
  const entry = await faqRepository.findById(id);
  if (!entry) throw new NotFoundError('Dairy & Ice Cream FAQ entry');
  return entry;
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy that heads the accordion and at least one
 * question. With either missing the site leaves the section out - better
 * than a heading over nothing.
 */
export const getPublished = async (): Promise<PublicDairyFaqSection | null> => {
  const entries = await faqRepository.findPublished();
  if (entries.length === 0) return null;

  const copy = await sectionCopyService.get('dairy', 'faq');
  if (!copy) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    faqs: entries.map((entry) => ({ q: entry.question, a: entry.answer })),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateDairyFaqEntryInput,
  context: RequestContext,
): Promise<DairyFaqEntry> => {
  const entry = await withTransaction(async (client) => {
    const existing = await faqRepository.countAll(client);
    if (existing >= LIMITS.MAX_DAIRY_FAQ_ENTRIES) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_DAIRY_FAQ_ENTRIES} questions. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await faqRepository.nextDisplayOrder(client));
    const created = await faqRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_FAQ_ENTRY_CREATED,
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

  return entry;
};

export const update = async (
  id: string,
  patch: UpdateDairyFaqEntryInput,
  context: RequestContext,
): Promise<DairyFaqEntry> => {
  const entry = await withTransaction(async (client) => {
    const existing = await faqRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Dairy & Ice Cream FAQ entry');

    const updated = await faqRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Dairy & Ice Cream FAQ entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_FAQ_ENTRY_UPDATED,
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

  return entry;
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<DairyFaqEntry> => {
  const entry = await withTransaction(async (client) => {
    const existing = await faqRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Dairy & Ice Cream FAQ entry');

    const updated = await faqRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Dairy & Ice Cream FAQ entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_FAQ_ENTRY_UPDATED,
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

  return entry;
};

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<DairyFaqEntry[]> => {
  const entries = await withTransaction(async (client) => {
    const total = await faqRepository.countAll(client);
    const existingIds = await faqRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more questions do not exist', [
        {
          field: 'ids',
          message: `Unknown question ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_DAIRY_FAQ_ENTRY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every question', [
        {
          field: 'ids',
          message: `Expected all ${total} question ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await faqRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_FAQ_ENTRIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return faqRepository.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_DAIRY_FAQ_ENTRIES, offset: 0 },
      client,
    );
  });

  return entries.rows;
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await faqRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Dairy & Ice Cream FAQ entry');

    await faqRepository.remove(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_FAQ_ENTRY_DELETED,
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
