// src/modules/industry-pages/non-food-fmcg-page/services/benefits-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { Executor } from '../../../../config/database';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/benefits-section.repository';

import {
  CreateNonFoodFmcgBenefitItemInput,
  PublicNonFoodFmcgBenefitsSection,
  NonFoodFmcgBenefitItem,
  NonFoodFmcgBenefitItemFilters,
  UpdateNonFoodFmcgBenefitItemInput,
} from '../types/benefits-section.types';

const MODULE = 'non_food_fmcg_page';
const ENTITY = 'non_food_fmcg_benefit_item';

const toResolved = async (item: NonFoodFmcgBenefitItem): Promise<NonFoodFmcgBenefitItem> => item;

const toResolvedMany = (items: NonFoodFmcgBenefitItem[]): Promise<NonFoodFmcgBenefitItem[]> => Promise.all(items.map(toResolved));

/**
 * Refuses a second live benefit with the same label.
 *
 * Two identical entries side by side read as a mistake rather than as more
 * content - most often an item added back instead of re-activating the old one.
 * Soft-deleted rows are ignored, so a deleted benefit's label can be reused.
 *
 * @param excludeId the benefit being edited, so re-saving its own value is fine
 */
const assertUnique = async (
  value: string,
  excludeId: string | null,
  client: Executor,
): Promise<void> => {
  const clash = await repo.findByLabel(value, client);
  if (clash && clash.id !== excludeId) {
    throw new ConflictError(
      `A benefit "${clash.label}" already exists. Edit or re-activate that one instead.`,
    );
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: NonFoodFmcgBenefitItemFilters,
  pagination: PaginationParams,
): Promise<{ rows: NonFoodFmcgBenefitItem[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<NonFoodFmcgBenefitItem> => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('Benefit');
  return toResolved(item);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy and at least one live benefit. With either
 * missing the site hides the section.
 */
export const getPublished = async (): Promise<PublicNonFoodFmcgBenefitsSection | null> => {
  const [copy, items] = await Promise.all([
    sectionCopyService.get('non-food-fmcg', 'benefits'),
    repo.findPublished(),
  ]);
  if (!copy) return null;

  const resolved = (await toResolvedMany(items))
    .map((item) => ({ icon: item.icon, label: item.label }));
  if (resolved.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    items: resolved,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateNonFoodFmcgBenefitItemInput,
  context: RequestContext,
): Promise<NonFoodFmcgBenefitItem> => {

  const item = await withTransaction(async (client) => {
    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_NON_FOOD_FMCG_BENEFIT_ITEMS) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_NON_FOOD_FMCG_BENEFIT_ITEMS} benefits. Delete one first.`,
      );
    }
    await assertUnique(input.label, null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.NON_FOOD_FMCG_BENEFIT_ITEM_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { label: created.label, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(item);
};

export const update = async (
  id: string,
  patch: UpdateNonFoodFmcgBenefitItemInput,
  context: RequestContext,
): Promise<NonFoodFmcgBenefitItem> => {

  const item = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Benefit');
    if (patch.label !== undefined) await assertUnique(patch.label, id, client);

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Benefit');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.NON_FOOD_FMCG_BENEFIT_ITEM_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(item);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<NonFoodFmcgBenefitItem> => update(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<NonFoodFmcgBenefitItem[]> => {
  const items = await withTransaction(async (client) => {
    const total = await repo.countAll(client);

    if (orderedIds.length !== total) {
      throw new ValidationError('The order must list every benefit', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existingIds = await repo.findExistingIds(orderedIds, client);
    if (existingIds.length !== orderedIds.length) {
      throw new ValidationError('The order names a benefit that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.NON_FOOD_FMCG_BENEFIT_ITEMS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAll({}, { page: 1, limit: LIMITS.MAX_NON_FOOD_FMCG_BENEFIT_ITEMS, offset: 0 }, client);
  });

  return toResolvedMany(items.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Benefit');

    await repo.remove(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.NON_FOOD_FMCG_BENEFIT_ITEM_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { label: existing.label },
      },
      context,
      client,
    );
  });
};
