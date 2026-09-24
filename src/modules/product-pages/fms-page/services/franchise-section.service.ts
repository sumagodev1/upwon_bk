// src/modules/product-pages/fms-page/services/franchise-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, AuditAction, ContentStatus, LIMITS } from '../../../../config/constants';
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
import { checkImageDimensions, ImageSlot } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as repo from '../repositories/franchise-section.repository';
import {
  CreateFmsFranchiseCategoryInput,
  CreateFmsFranchiseEntryInput,
  FmsFranchiseBenefit,
  FmsFranchiseCategory,
  FmsFranchiseCategoryFilters,
  FmsFranchiseStep,
  PublicFmsFranchiseSection,
  ResolvedFmsFranchiseCategory,
  UpdateFmsFranchiseCategoryInput,
  UpdateFmsFranchiseEntryInput,
} from '../types/franchise-section.types';

const MODULE = 'fms_page';
const CATEGORY_ENTITY = 'fms_franchise_category';
const STEP_ENTITY = 'fms_franchise_step';
const BENEFIT_ENTITY = 'fms_franchise_benefit';

/** Only images belong in the tab or the panel; a PDF in an <img> is a broken frame. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the panel renders without that image rather
  // than failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

/** Rejects a file id that is not a live image of the right shape for a slot. */
const assertUsableImageFile = async (
  fileId: string,
  slot: ImageSlot,
  field: string,
): Promise<void> => {
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('That file must be an image', [
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

  const problem = checkImageDimensions(slot, dimensions);
  if (problem) {
    throw new ValidationError('That image is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

/**
 * Refuses a slug already in use.
 *
 * A field error rather than the raw unique-violation a 409 would carry: the
 * slug is authored, so the message belongs on the input that produced it.
 *
 * @param excludeId the category being changed, so re-saving its own slug is fine
 */
const assertSlugFree = async (
  slug: string,
  excludeId: string | null,
  client?: Parameters<typeof repo.findCategoryBySlug>[1],
): Promise<void> => {
  const existing = await repo.findCategoryBySlug(slug, client);
  if (!existing || existing.id === excludeId) return;

  throw new ValidationError('That slug is already in use', [
    {
      field: 'slug',
      message: `"${slug}" already belongs to ${existing.name}. Slugs identify a category in links, so they have to be unique.`,
      code: 'DUPLICATE_SLUG',
    },
  ]);
};

const toResolved = async (
  category: FmsFranchiseCategory,
  steps: FmsFranchiseStep[],
  benefits: FmsFranchiseBenefit[],
): Promise<ResolvedFmsFranchiseCategory> => ({
  ...category,
  icon: await resolveSource(category.iconUrl, category.iconFileId),
  image: await resolveSource(category.imageUrl, category.imageFileId),
  steps,
  benefits,
});

/** Groups a flat bulk read back under the category each row belongs to. */
const groupByCategory = <T extends { categoryId: string }>(rows: T[]): Map<string, T[]> => {
  const byCategory = new Map<string, T[]>();
  for (const row of rows) {
    const list = byCategory.get(row.categoryId) ?? [];
    list.push(row);
    byCategory.set(row.categoryId, list);
  }
  return byCategory;
};

// -- reads ------------------------------------------------------------------

/**
 * The admin list.
 *
 * Both child lists come along, in one bulk query each rather than one per row,
 * so the list can show how many steps and benefits a category has without N
 * round trips.
 */
export const listCategories = async (
  filters: FmsFranchiseCategoryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedFmsFranchiseCategory[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllCategories(filters, pagination);
  const ids = rows.map((r) => r.id);
  const [stepRows, benefitRows] = await Promise.all([
    repo.steps.findActiveForCategories(ids),
    repo.benefits.findActiveForCategories(ids),
  ]);

  const stepsBy = groupByCategory(stepRows);
  const benefitsBy = groupByCategory(benefitRows);

  const resolved = await Promise.all(
    rows.map((row) =>
      toResolved(row, stepsBy.get(row.id) ?? [], benefitsBy.get(row.id) ?? []),
    ),
  );
  return { rows: resolved, meta: buildPaginationMeta(total, pagination) };
};

/** One category with every step and benefit it owns, whatever their status. */
export const getCategoryById = async (
  id: string,
): Promise<ResolvedFmsFranchiseCategory> => {
  const category = await repo.findCategoryById(id);
  if (!category) throw new NotFoundError('Category');
  const [steps, benefits] = await Promise.all([
    repo.steps.findByCategory(id),
    repo.benefits.findByCategory(id),
  ]);
  return toResolved(category, steps, benefits);
};

/**
 * The website-facing read: the whole section in one response.
 *
 * The tabs switch panels in the browser and autoplay every few seconds, so
 * sending categories one at a time would mean a request per rotation for
 * content already known. Null when the copy or the categories are missing -
 * the page then keeps the section it ships, which is a complete working one.
 */
export const getPublished = async (): Promise<PublicFmsFranchiseSection | null> => {
  const [copy, categories] = await Promise.all([
    sectionCopyService.get('fms', 'recognition'),
    repo.findPublishedCategories(),
  ]);
  if (!copy || categories.length === 0) return null;

  const ids = categories.map((c) => c.id);
  const [stepRows, benefitRows] = await Promise.all([
    repo.steps.findActiveForCategories(ids),
    repo.benefits.findActiveForCategories(ids),
  ]);
  const stepsBy = groupByCategory(stepRows);
  const benefitsBy = groupByCategory(benefitRows);

  const panels = await Promise.all(
    categories.map(async (category) => ({
      slug: category.slug,
      name: category.name,
      tagline: category.tagline,
      description: category.description,
      icon: await resolveSource(category.iconUrl, category.iconFileId),
      image: await resolveSource(category.imageUrl, category.imageFileId),
      accentColor: category.accentColor,
      surfaceColor: category.surfaceColor,
      exploreLabel: category.exploreLabel,
      exploreHref: category.exploreHref,
      steps: (stepsBy.get(category.id) ?? []).map((s) => ({
        title: s.title,
        description: s.description,
        icon: s.icon,
      })),
      benefits: (benefitsBy.get(category.id) ?? []).map((b) => ({
        title: b.title,
        description: b.description,
        icon: b.icon,
      })),
    })),
  );

  /*
   * A category whose pictogram or photograph went missing would draw a blank
   * tab or an empty panel, so it is dropped rather than shown half-built. The
   * narrowing is what lets the published shape promise both as strings.
   */
  const usable = panels.filter(
    (panel): panel is typeof panel & { icon: string; image: string } =>
      panel.icon !== null && panel.image !== null,
  );
  if (usable.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    categories: usable,
  };
};

// -- categories: writes -----------------------------------------------------

export const createCategory = async (
  input: CreateFmsFranchiseCategoryInput,
  context: RequestContext,
): Promise<ResolvedFmsFranchiseCategory> => {
  if (input.iconFileId) {
    await assertUsableImageFile(input.iconFileId, 'fmsFranchiseIcon', 'iconFileId');
  }
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, 'fmsFranchisePhoto', 'imageFileId');
  }

  const category = await withTransaction(async (client) => {
    const existing = await repo.countCategories(client);
    if (existing >= LIMITS.MAX_FMS_FRANCHISE_CATEGORIES) {
      throw new ConflictError(
        `The tab row holds at most ${LIMITS.MAX_FMS_FRANCHISE_CATEGORIES} categories. Delete or deactivate one first.`,
      );
    }

    await assertSlugFree(input.slug, null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextCategoryOrder(client));
    const created = await repo.createCategory(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_FRANCHISE_CATEGORY_CREATED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: created.id,
        newValues: { name: created.name, slug: created.slug, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(category, [], []);
};

export const updateCategory = async (
  id: string,
  patch: UpdateFmsFranchiseCategoryInput,
  context: RequestContext,
): Promise<ResolvedFmsFranchiseCategory> => {
  if (patch.iconFileId) {
    await assertUsableImageFile(patch.iconFileId, 'fmsFranchiseIcon', 'iconFileId');
  }
  if (patch.imageFileId) {
    await assertUsableImageFile(patch.imageFileId, 'fmsFranchisePhoto', 'imageFileId');
  }

  await withTransaction(async (client) => {
    const existing = await repo.findCategoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    if (patch.slug && patch.slug !== existing.slug) {
      await assertSlugFree(patch.slug, id, client);
    }

    const updated = await repo.updateCategory(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_FRANCHISE_CATEGORY_UPDATED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: id,
        oldValues: { name: existing.name, slug: existing.slug, status: existing.status },
        newValues: { name: updated.name, slug: updated.slug, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return getCategoryById(id);
};

export const setCategoryStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedFmsFranchiseCategory> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCategoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    const updated = await repo.updateCategoryStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_FRANCHISE_CATEGORY_UPDATED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return getCategoryById(id);
};

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorderCategories = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedFmsFranchiseCategory[]> => {
  const rows = await withTransaction(async (client) => {
    const total = await repo.countCategories(client);
    const existingIds = await repo.findExistingCategoryIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more categories do not exist', [
        {
          field: 'ids',
          message: `Unknown category ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_FMS_FRANCHISE_CATEGORY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every category', [
        {
          field: 'ids',
          message: `Expected all ${total} category ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyCategoryOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_FRANCHISE_CATEGORIES_REORDERED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAllCategories(
      {},
      { page: 1, limit: LIMITS.MAX_FMS_FRANCHISE_CATEGORIES, offset: 0 },
      client,
    );
  });

  return Promise.all(rows.rows.map((row) => toResolved(row, [], [])));
};

/** Deleting a category takes its steps and benefits with it - both FKs cascade. */
export const removeCategory = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCategoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    const [stepCount, benefitCount] = await Promise.all([
      repo.steps.count(id, client),
      repo.benefits.count(id, client),
    ]);
    await repo.removeCategory(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_FRANCHISE_CATEGORY_DELETED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: id,
        // Recorded because the cascade is otherwise invisible in the trail.
        oldValues: {
          name: existing.name,
          slug: existing.slug,
          stepsRemoved: stepCount,
          benefitsRemoved: benefitCount,
        },
      },
      context,
      client,
    );
  });
};

// -- the two child lists ----------------------------------------------------

/**
 * Steps and benefits differ only in which table they live in, which cap they
 * answer to and which audit action they record, so the write half is built
 * once and bound twice.
 *
 * `kind` is closed over here - it is never read from a request - so no caller
 * can aim a benefit write at the steps table by passing the wrong string.
 */
interface EntryBinding {
  noun: 'Step' | 'Benefit';
  table: typeof repo.steps;
  entity: string;
  limit: number;
  /** What the cap means, in the sentence the editor reads when they hit it. */
  limitHint: string;
  created: AuditAction;
  updated: AuditAction;
  deleted: AuditAction;
  reordered: AuditAction;
  unknownCode: string;
}

const entryService = (bind: EntryBinding) => {
  /**
   * Entries are addressed through their category, so the category in the path
   * is checked rather than trusted. Without it the nesting would be decoration:
   * any id would resolve under any parent, and a panel could delete a step
   * belonging to a category the editor is not even looking at.
   *
   * A mismatch reads as "no such step here", not as a permission error - the
   * step genuinely is not at that address.
   */
  const assertOwned = (
    entry: FmsFranchiseStep | null,
    categoryId: string,
  ): FmsFranchiseStep => {
    if (!entry || entry.categoryId !== categoryId) throw new NotFoundError(bind.noun);
    return entry;
  };

  const list = async (categoryId: string): Promise<FmsFranchiseStep[]> => {
    const category = await repo.findCategoryById(categoryId);
    if (!category) throw new NotFoundError('Category');
    return bind.table.findByCategory(categoryId);
  };

  const getById = async (categoryId: string, id: string): Promise<FmsFranchiseStep> =>
    assertOwned(await bind.table.findById(id), categoryId);

  const create = async (
    categoryId: string,
    input: CreateFmsFranchiseEntryInput,
    context: RequestContext,
  ): Promise<FmsFranchiseStep> =>
    withTransaction(async (client) => {
      const category = await repo.findCategoryById(categoryId, client);
      if (!category) throw new NotFoundError('Category');

      const existing = await bind.table.count(categoryId, client);
      if (existing >= bind.limit) {
        throw new ConflictError(
          `${bind.limitHint} holds at most ${bind.limit} entries. Delete or deactivate one first.`,
        );
      }

      const displayOrder =
        input.displayOrder ?? (await bind.table.nextOrder(categoryId, client));
      const created = await bind.table.create(
        categoryId,
        { ...input, displayOrder },
        context.adminId,
        client,
      );

      await auditLogService.record(
        {
          action: bind.created,
          module: MODULE,
          entityType: bind.entity,
          entityId: created.id,
          newValues: { category: category.slug, title: created.title, status: created.status },
        },
        context,
        client,
      );

      return created;
    });

  const update = async (
    categoryId: string,
    id: string,
    patch: UpdateFmsFranchiseEntryInput,
    context: RequestContext,
  ): Promise<FmsFranchiseStep> =>
    withTransaction(async (client) => {
      const existing = assertOwned(
        await bind.table.findByIdForUpdate(id, client),
        categoryId,
      );

      const updated = await bind.table.update(id, patch, context.adminId, client);
      if (!updated) throw new NotFoundError(bind.noun);

      await auditLogService.record(
        {
          action: bind.updated,
          module: MODULE,
          entityType: bind.entity,
          entityId: id,
          oldValues: { title: existing.title, status: existing.status },
          newValues: { title: updated.title, status: updated.status },
        },
        context,
        client,
      );

      return updated;
    });

  const setStatus = async (
    categoryId: string,
    id: string,
    status: ContentStatus,
    context: RequestContext,
  ): Promise<FmsFranchiseStep> => update(categoryId, id, { status }, context);

  const reorder = async (
    categoryId: string,
    orderedIds: string[],
    context: RequestContext,
  ): Promise<FmsFranchiseStep[]> =>
    withTransaction(async (client) => {
      const category = await repo.findCategoryById(categoryId, client);
      if (!category) throw new NotFoundError('Category');

      const current = await bind.table.findByCategory(categoryId, client);
      const currentIds = current.map((e) => e.id);

      const foreign = orderedIds.filter((id) => !currentIds.includes(id));
      if (foreign.length > 0) {
        throw new ValidationError(
          `One or more entries do not belong to this category`,
          [
            {
              field: 'ids',
              message: `Not entries of ${category.name}: ${foreign.join(', ')}`,
              code: bind.unknownCode,
            },
          ],
        );
      }

      if (orderedIds.length !== currentIds.length) {
        throw new ValidationError('Reorder must list every entry', [
          {
            field: 'ids',
            message: `Expected all ${currentIds.length} ids, received ${orderedIds.length}`,
            code: 'INCOMPLETE_ORDER',
          },
        ]);
      }

      await bind.table.applyOrder(categoryId, orderedIds, context.adminId, client);

      await auditLogService.record(
        {
          action: bind.reordered,
          module: MODULE,
          entityType: bind.entity,
          entityId: categoryId,
          newValues: { order: orderedIds },
        },
        context,
        client,
      );

      return bind.table.findByCategory(categoryId, client);
    });

  const remove = async (
    categoryId: string,
    id: string,
    context: RequestContext,
  ): Promise<void> => {
    await withTransaction(async (client) => {
      const existing = assertOwned(
        await bind.table.findByIdForUpdate(id, client),
        categoryId,
      );

      await bind.table.remove(id, client);

      await auditLogService.record(
        {
          action: bind.deleted,
          module: MODULE,
          entityType: bind.entity,
          entityId: id,
          oldValues: { title: existing.title },
        },
        context,
        client,
      );
    });
  };

  return { list, getById, create, update, setStatus, reorder, remove };
};

export const steps = entryService({
  noun: 'Step',
  table: repo.steps,
  entity: STEP_ENTITY,
  limit: LIMITS.MAX_FMS_FRANCHISE_STEPS,
  limitHint: 'The flow',
  created: AUDIT_ACTIONS.FMS_FRANCHISE_STEP_CREATED,
  updated: AUDIT_ACTIONS.FMS_FRANCHISE_STEP_UPDATED,
  deleted: AUDIT_ACTIONS.FMS_FRANCHISE_STEP_DELETED,
  reordered: AUDIT_ACTIONS.FMS_FRANCHISE_STEPS_REORDERED,
  unknownCode: 'UNKNOWN_FMS_FRANCHISE_STEP',
});

export const benefits = entryService({
  noun: 'Benefit',
  table: repo.benefits,
  entity: BENEFIT_ENTITY,
  limit: LIMITS.MAX_FMS_FRANCHISE_BENEFITS,
  limitHint: 'The benefits strip',
  created: AUDIT_ACTIONS.FMS_FRANCHISE_BENEFIT_CREATED,
  updated: AUDIT_ACTIONS.FMS_FRANCHISE_BENEFIT_UPDATED,
  deleted: AUDIT_ACTIONS.FMS_FRANCHISE_BENEFIT_DELETED,
  reordered: AUDIT_ACTIONS.FMS_FRANCHISE_BENEFITS_REORDERED,
  unknownCode: 'UNKNOWN_FMS_FRANCHISE_BENEFIT',
});
