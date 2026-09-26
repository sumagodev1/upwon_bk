// src/modules/industry-pages/dairy-page/services/coverage-section.service.ts

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
  CreateDairyCoverageItemInput,
  PublicDairyCoverageSection,
  ResolvedDairyCoverageItem,
  DairyCoverageItem,
  DairyCoverageItemFilters,
  UpdateDairyCoverageItemInput,
} from '../types/coverage-section.types';

const MODULE = 'dairy_page';
const ENTITY = 'dairy_coverage_item';

const toResolved = async (item: DairyCoverageItem): Promise<ResolvedDairyCoverageItem> => ({
  ...item,
  image: await resolveSource(item.imageUrl, item.imageFileId),
});

const toResolvedMany = (items: DairyCoverageItem[]): Promise<ResolvedDairyCoverageItem[]> => Promise.all(items.map(toResolved));

const assertItemImage = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, 'dairyCoverage', 'imageFileId', 'Category art');

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
  filters: DairyCoverageItemFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedDairyCoverageItem[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedDairyCoverageItem> => {
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
export const getPublished = async (): Promise<PublicDairyCoverageSection | null> => {
  const [copy, items] = await Promise.all([
    sectionCopyService.get('dairy', 'coverage'),
    repo.findPublished(),
  ]);
  if (!copy) return null;

  const resolved = (await toResolvedMany(items))
    .filter((item): item is ResolvedDairyCoverageItem & { image: string } => item.image !== null)
    .map((item) => ({ image: item.image, label: item.label }));
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
  input: CreateDairyCoverageItemInput,
  context: RequestContext,
): Promise<ResolvedDairyCoverageItem> => {
  if (input.imageFileId) await assertItemImage(input.imageFileId);

  const item = await withTransaction(async (client) => {
    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_DAIRY_COVERAGE_ITEMS) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_DAIRY_COVERAGE_ITEMS} categories. Delete one first.`,
      );
    }
    await assertUnique(input.label, null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_COVERAGE_ITEM_CREATED,
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
  patch: UpdateDairyCoverageItemInput,
  context: RequestContext,
): Promise<ResolvedDairyCoverageItem> => {
  if (patch.imageFileId) await assertItemImage(patch.imageFileId);

  const item = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Coverage category');
    if (patch.label !== undefined) await assertUnique(patch.label, id, client);

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Coverage category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_COVERAGE_ITEM_UPDATED,
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
): Promise<ResolvedDairyCoverageItem> => update(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedDairyCoverageItem[]> => {
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
        action: AUDIT_ACTIONS.DAIRY_COVERAGE_ITEMS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAll({}, { page: 1, limit: LIMITS.MAX_DAIRY_COVERAGE_ITEMS, offset: 0 }, client);
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
        action: AUDIT_ACTIONS.DAIRY_COVERAGE_ITEM_DELETED,
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
