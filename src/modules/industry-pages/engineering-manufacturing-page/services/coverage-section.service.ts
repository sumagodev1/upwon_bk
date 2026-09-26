// src/modules/industry-pages/engineering-manufacturing-page/services/coverage-section.service.ts

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
  CreateEngineeringCoverageCategoryInput,
  EngineeringCoveragePanel,
  EngineeringCoverageCategory,
  EngineeringCoverageCategoryFilters,
  PublicEngineeringCoverageSection,
  ResolvedEngineeringCoveragePanel,
  UpdateEngineeringCoverageCategoryInput,
  UpsertEngineeringCoveragePanelInput,
} from '../types/coverage-section.types';

const MODULE = 'engineering_manufacturing_page';
const PANEL_ENTITY = 'engineering_coverage_panel';
const WORKFLOW_ENTITY = 'engineering_coverage_category';

/** Only images belong behind the section; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

// ── the background panel ──────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the site keeps its own illustration rather
  // than the request failing for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedPanel = async (
  panel: EngineeringCoveragePanel,
): Promise<ResolvedEngineeringCoveragePanel> => ({
  ...panel,
  image: await resolveSource(panel.imageUrl, panel.imageFileId),
});

/**
 * Rejects a file id that is not a live image of the right shape.
 *
 * The illustration is drawn at its own ratio behind the copy, so a
 * differently shaped upload would reach further down into the grid - which is
 * why the ratio rule applies here.
 */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const field = 'imageFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Illustration must be an image', [
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

  const problem = checkImageDimensions('engineeringCoverage', dimensions);
  if (problem) {
    throw new ValidationError('Illustration is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

/** Null when the panel has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<ResolvedEngineeringCoveragePanel | null> => {
  const panel = await repo.findPanel();
  return panel ? toResolvedPanel(panel) : null;
};

export const upsertPanel = async (
  input: UpsertEngineeringCoveragePanelInput,
  context: RequestContext,
): Promise<ResolvedEngineeringCoveragePanel> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findPanel(client);
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_COVERAGE_PANEL_UPDATED,
        module: MODULE,
        entityType: PANEL_ENTITY,
        entityId: saved.id,
        oldValues: existing ? { image: existing.imageUrl ?? existing.imageFileId } : undefined,
        newValues: { image: saved.imageUrl ?? saved.imageFileId },
      },
      context,
      client,
    );

    return toResolvedPanel(saved);
  });
};

// ── the categories ────────────────────────────────────────────────────────

export const listCategories = async (
  filters: EngineeringCoverageCategoryFilters,
  pagination: PaginationParams,
): Promise<{ rows: EngineeringCoverageCategory[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllCategories(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getCategoryById = async (id: string): Promise<EngineeringCoverageCategory> => {
  const category = await repo.findCategoryById(id);
  if (!category) throw new NotFoundError('Category');
  return category;
};

export const createCategory = async (
  input: CreateEngineeringCoverageCategoryInput,
  context: RequestContext,
): Promise<EngineeringCoverageCategory> =>
  withTransaction(async (client) => {
    const existing = await repo.countCategories(client);
    if (existing >= LIMITS.MAX_ENGINEERING_COVERAGE_CATEGORIES) {
      throw new ConflictError(
        `The grid holds at most ${LIMITS.MAX_ENGINEERING_COVERAGE_CATEGORIES} categories. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextCategoryOrder(client));
    const created = await repo.createCategory({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_COVERAGE_CATEGORY_CREATED,
        module: MODULE,
        entityType: WORKFLOW_ENTITY,
        entityId: created.id,
        newValues: { label: created.label, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateCategory = async (
  id: string,
  patch: UpdateEngineeringCoverageCategoryInput,
  context: RequestContext,
): Promise<EngineeringCoverageCategory> =>
  withTransaction(async (client) => {
    const existing = await repo.findCategoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    const updated = await repo.updateCategory(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_COVERAGE_CATEGORY_UPDATED,
        module: MODULE,
        entityType: WORKFLOW_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setCategoryStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<EngineeringCoverageCategory> => updateCategory(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorderCategories = async (
  ids: string[],
  context: RequestContext,
): Promise<EngineeringCoverageCategory[]> =>
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
        action: AUDIT_ACTIONS.ENGINEERING_COVERAGE_CATEGORIES_REORDERED,
        module: MODULE,
        entityType: WORKFLOW_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllCategories(
      {},
      { page: 1, limit: LIMITS.MAX_ENGINEERING_COVERAGE_CATEGORIES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeCategory = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCategoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    await repo.removeCategory(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_COVERAGE_CATEGORY_DELETED,
        module: MODULE,
        entityType: WORKFLOW_ENTITY,
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
 * The whole section in one call: the copy, the background and the categories.
 *
 * Null when the copy is missing or no category is active - the page then keeps
 * the section it ships. A missing panel is fine: the site keeps its own
 * illustration.
 */
export const getPublished = async (): Promise<PublicEngineeringCoverageSection | null> => {
  const [copy, panel, categories] = await Promise.all([
    sectionCopyService.get('engineering-manufacturing', 'coverage'),
    repo.findPanel(),
    repo.findPublishedCategories(),
  ]);
  if (!copy || categories.length === 0) return null;

  const resolvedPanel = panel ? await toResolvedPanel(panel) : null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    image: resolvedPanel?.image ?? null,
    categories: categories.map((category) => ({
      label: category.label,
      icon: category.icon,
    })),
  };
};
