// src/modules/industry-pages/non-food-fmcg-page/services/coverage-section.service.ts

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
import * as repo from '../repositories/coverage-section.repository';
import { assertUsableImageFile, resolveSource } from '../utils/media';
import {
  CreateNonFoodFmcgCoverageItemInput,
  PublicNonFoodFmcgCoverageSection,
  ResolvedNonFoodFmcgCoveragePanel,
  NonFoodFmcgCoveragePanel,
  UpsertNonFoodFmcgCoveragePanelInput,
  NonFoodFmcgCoverageItem,
  NonFoodFmcgCoverageItemFilters,
  UpdateNonFoodFmcgCoverageItemInput,
} from '../types/coverage-section.types';

const MODULE = 'non_food_fmcg_page';
const ENTITY = 'non_food_fmcg_coverage_item';

const toResolved = async (item: NonFoodFmcgCoverageItem): Promise<NonFoodFmcgCoverageItem> => item;

const toResolvedMany = (items: NonFoodFmcgCoverageItem[]): Promise<NonFoodFmcgCoverageItem[]> => Promise.all(items.map(toResolved));

/**
 * Refuses a second live category with the same name.
 *
 * Two identical entries side by side read as a mistake rather than as more
 * content - most often an item added back instead of re-activating the old one.
 * Soft-deleted rows are ignored, so a deleted category's name can be reused.
 *
 * @param excludeId the category being edited, so re-saving its own value is fine
 */
const assertUnique = async (
  value: string,
  excludeId: string | null,
  client: Executor,
): Promise<void> => {
  const clash = await repo.findByLabel(value, client);
  if (clash && clash.id !== excludeId) {
    throw new ConflictError(
      `A category "${clash.label}" already exists. Edit or re-activate that one instead.`,
    );
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: NonFoodFmcgCoverageItemFilters,
  pagination: PaginationParams,
): Promise<{ rows: NonFoodFmcgCoverageItem[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<NonFoodFmcgCoverageItem> => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('Coverage category');
  return toResolved(item);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy and at least one live category. With either
 * missing the site hides the section.
 */
export const getPublished = async (): Promise<PublicNonFoodFmcgCoverageSection | null> => {
  const [copy, items, panel] = await Promise.all([
    sectionCopyService.get('non-food-fmcg', 'coverage'),
    repo.findPublished(),
    repo.findPanel(),
  ]);
  if (!copy) return null;

  const resolved = (await toResolvedMany(items))
    .map((item) => ({ icon: item.icon, label: item.label }));
  if (resolved.length === 0) return null;
  const resolvedPanel = panel ? await toResolvedPanel(panel) : null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    panel: resolvedPanel?.image ? { image: resolvedPanel.image, alt: resolvedPanel.alt } : null,
    items: resolved,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateNonFoodFmcgCoverageItemInput,
  context: RequestContext,
): Promise<NonFoodFmcgCoverageItem> => {

  const item = await withTransaction(async (client) => {
    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_NON_FOOD_FMCG_COVERAGE_ITEMS) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_NON_FOOD_FMCG_COVERAGE_ITEMS} categories. Delete one first.`,
      );
    }
    await assertUnique(input.label, null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.NON_FOOD_FMCG_COVERAGE_ITEM_CREATED,
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
  patch: UpdateNonFoodFmcgCoverageItemInput,
  context: RequestContext,
): Promise<NonFoodFmcgCoverageItem> => {

  const item = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Coverage category');
    if (patch.label !== undefined) await assertUnique(patch.label, id, client);

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Coverage category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.NON_FOOD_FMCG_COVERAGE_ITEM_UPDATED,
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
): Promise<NonFoodFmcgCoverageItem> => update(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<NonFoodFmcgCoverageItem[]> => {
  const items = await withTransaction(async (client) => {
    const total = await repo.countAll(client);

    if (orderedIds.length !== total) {
      throw new ValidationError('The order must list every category', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existingIds = await repo.findExistingIds(orderedIds, client);
    if (existingIds.length !== orderedIds.length) {
      throw new ValidationError('The order names a category that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.NON_FOOD_FMCG_COVERAGE_ITEMS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAll({}, { page: 1, limit: LIMITS.MAX_NON_FOOD_FMCG_COVERAGE_ITEMS, offset: 0 }, client);
  });

  return toResolvedMany(items.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Coverage category');

    await repo.remove(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.NON_FOOD_FMCG_COVERAGE_ITEM_DELETED,
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

// ── the panel image ───────────────────────────────────────────────────────

const toResolvedPanel = async (panel: NonFoodFmcgCoveragePanel): Promise<ResolvedNonFoodFmcgCoveragePanel> => ({
  ...panel,
  image: await resolveSource(panel.imageUrl, panel.imageFileId),
});

/** Null when the panel has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<ResolvedNonFoodFmcgCoveragePanel | null> => {
  const panel = await repo.findPanel();
  return panel ? toResolvedPanel(panel) : null;
};

export const upsertPanel = async (
  input: UpsertNonFoodFmcgCoveragePanelInput,
  context: RequestContext,
): Promise<ResolvedNonFoodFmcgCoveragePanel> => {
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, 'nonFoodFmcgCoverageDashboard', 'imageFileId', 'Dashboard image');
  }

  return withTransaction(async (client) => {
    const existing = await repo.findPanel(client);
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.NON_FOOD_FMCG_COVERAGE_PANEL_UPDATED,
        module: MODULE,
        entityType: 'non_food_fmcg_coverage_panel',
        entityId: saved.id,
        oldValues: existing ? { alt: existing.alt } : undefined,
        newValues: { alt: saved.alt },
      },
      context,
      client,
    );

    return toResolvedPanel(saved);
  });
};
