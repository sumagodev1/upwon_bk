// src/modules/industry-pages/spices-agro-page/services/coverage-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { env } from '../../../../config/env';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import { getStorageProvider } from '../../../../storage/storage.factory';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../../files/repositories/file.repository';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import { checkImageDimensions } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as repo from '../repositories/coverage-section.repository';
import {
  CreateSpicesAgroCoverageCategoryInput,
  PublicSpicesAgroCoverageSection,
  ResolvedSpicesAgroCoverageCategory,
  SpicesAgroCoverageCategory,
  SpicesAgroCoverageCategoryFilters,
  UpdateSpicesAgroCoverageCategoryInput,
} from '../types/coverage-section.types';

const MODULE = 'spices_agro_page';
const CATEGORY_ENTITY = 'spices_agro_coverage_category';

/** Only images belong in a tile; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

/* The photos are cropped into circles, so they have their own roughly-square slot. */

// ── the categories ──────────────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the grid skips that tile rather than
  // failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedCategory = async (
  category: SpicesAgroCoverageCategory,
): Promise<ResolvedSpicesAgroCoverageCategory> => ({
  ...category,
  image: await resolveSource(category.imageUrl, category.imageFileId),
});

/** Rejects a file id that is not a live image of the right shape for the slot. */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const what = 'Photo';
  const field = 'imageFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError(`${what} must be an image`, [
      { field, message: `Expected an image, got ${file.mimeType}`, code: 'INVALID_FILE_TYPE' },
    ]);
  }

  const buffer = await getStorageProvider().getFile(file.storageKey);
  const dimensions = readImageDimensions(buffer);
  if (!dimensions) {
    throw new ValidationError('Image could not be read', [
      {
        field,
        message: `${file.originalName} is not a readable PNG, JPEG, GIF or WebP image`,
        code: 'UNREADABLE_IMAGE',
      },
    ]);
  }

  const problem = checkImageDimensions('spicesAgroCoverageTile', dimensions);
  if (problem) {
    throw new ValidationError(`${what} is the wrong size`, [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

export const listCategories = async (
  filters: SpicesAgroCoverageCategoryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedSpicesAgroCoverageCategory[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllCategories(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedCategory)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getCategoryById = async (id: string): Promise<ResolvedSpicesAgroCoverageCategory> => {
  const category = await repo.findCategoryById(id);
  if (!category) throw new NotFoundError('Category');
  return toResolvedCategory(category);
};

export const createCategory = async (
  input: CreateSpicesAgroCoverageCategoryInput,
  context: RequestContext,
): Promise<ResolvedSpicesAgroCoverageCategory> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countCategories(client);
    if (existing >= LIMITS.MAX_SPICES_AGRO_COVERAGE_CATEGORIES) {
      throw new ConflictError(
        `The grid holds at most ${LIMITS.MAX_SPICES_AGRO_COVERAGE_CATEGORIES} categories`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextCategoryOrder(client));
    const created = await repo.createCategory({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SPICES_AGRO_COVERAGE_CATEGORY_CREATED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: created.id,
        newValues: { label: created.label, status: created.status },
      },
      context,
      client,
    );

    return toResolvedCategory(created);
  });
};

export const updateCategory = async (
  id: string,
  patch: UpdateSpicesAgroCoverageCategoryInput,
  context: RequestContext,
): Promise<ResolvedSpicesAgroCoverageCategory> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findCategoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    const updated = await repo.updateCategory(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SPICES_AGRO_COVERAGE_CATEGORY_UPDATED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedCategory(updated);
  });
};

export const setCategoryStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedSpicesAgroCoverageCategory> => updateCategory(id, { status }, context);

export const reorderCategories = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedSpicesAgroCoverageCategory[]> =>
  withTransaction(async (client) => {
    const total = await repo.countCategories(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every category', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingCategoryIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a category that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyCategoryOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SPICES_AGRO_COVERAGE_CATEGORIES_REORDERED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllCategories(
      {},
      { page: 1, limit: LIMITS.MAX_SPICES_AGRO_COVERAGE_CATEGORIES, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedCategory));
  });

export const removeCategory = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCategoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    await repo.removeCategory(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SPICES_AGRO_COVERAGE_CATEGORY_DELETED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: id,
        oldValues: { label: existing.label },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy and the categories, in order.
 *
 * A category whose photo has been deleted is dropped rather than published
 * with a null source, which would draw an empty circle. Null when the copy is
 * missing or nothing is left - the page then keeps the section it ships.
 */
export const getPublished = async (): Promise<PublicSpicesAgroCoverageSection | null> => {
  const [copy, categories] = await Promise.all([
    sectionCopyService.get('spices-agro', 'coverage'),
    repo.findPublishedCategories(),
  ]);
  if (!copy) return null;

  const resolved = (await Promise.all(categories.map(toResolvedCategory)))
    .filter(
      (category): category is ResolvedSpicesAgroCoverageCategory & { image: string } =>
        category.image !== null,
    )
    .map((category) => ({ image: category.image, label: category.label }));

  if (resolved.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    categories: resolved,
  };
};
