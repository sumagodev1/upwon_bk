// src/modules/product-pages/erp-page/services/recognition-section.service.ts

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
import { checkImageDimensions, ImageSlot } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as repo from '../repositories/recognition-section.repository';
import {
  CreateErpIndustryBenefitInput,
  CreateErpIndustryFeatureInput,
  CreateErpIndustryInput,
  ErpIndustry,
  ErpIndustryBenefit,
  ErpIndustryFeature,
  ErpIndustryFilters,
  PublicErpRecognitionSection,
  ResolvedErpIndustry,
  UpdateErpIndustryBenefitInput,
  UpdateErpIndustryFeatureInput,
  UpdateErpIndustryInput,
} from '../types/recognition-section.types';

const MODULE = 'erp_page';
const INDUSTRY_ENTITY = 'erp_industry';
const FEATURE_ENTITY = 'erp_industry_feature';
const BENEFIT_ENTITY = 'erp_industry_benefit';

/** Only images belong in the panel; a PDF in an <img> is a broken frame. */
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
 * @param excludeId the industry being changed, so re-saving its own slug is fine
 */
const assertSlugFree = async (
  slug: string,
  excludeId: string | null,
  client?: Parameters<typeof repo.findIndustryBySlug>[1],
): Promise<void> => {
  const existing = await repo.findIndustryBySlug(slug, client);
  if (!existing || existing.id === excludeId) return;

  throw new ValidationError('That slug is already in use', [
    {
      field: 'slug',
      message: `"${slug}" already belongs to ${existing.name}. Slugs identify an industry in links, so they have to be unique.`,
      code: 'DUPLICATE_SLUG',
    },
  ]);
};

const toResolved = async (
  industry: ErpIndustry,
  features: ErpIndustryFeature[],
): Promise<ResolvedErpIndustry> => ({
  ...industry,
  image: await resolveSource(industry.imageUrl, industry.imageFileId),
  dashboard: await resolveSource(industry.dashboardUrl, industry.dashboardFileId),
  features,
});

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * The admin list.
 *
 * Features come along, in one bulk query rather than one per row, so the list
 * can show how many each industry has without N round trips.
 */
export const listIndustries = async (
  filters: ErpIndustryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedErpIndustry[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllIndustries(filters, pagination);
  const features = await repo.findActiveFeaturesForIndustries(rows.map((r) => r.id));

  const byIndustry = new Map<string, ErpIndustryFeature[]>();
  for (const feature of features) {
    const list = byIndustry.get(feature.industryId) ?? [];
    list.push(feature);
    byIndustry.set(feature.industryId, list);
  }

  const resolved = await Promise.all(
    rows.map((row) => toResolved(row, byIndustry.get(row.id) ?? [])),
  );
  return { rows: resolved, meta: buildPaginationMeta(total, pagination) };
};

/** One industry with every feature it owns, whatever their status. */
export const getIndustryById = async (id: string): Promise<ResolvedErpIndustry> => {
  const industry = await repo.findIndustryById(id);
  if (!industry) throw new NotFoundError('Industry');
  return toResolved(industry, await repo.findFeaturesByIndustry(id));
};

export const listFeatures = async (industryId: string): Promise<ErpIndustryFeature[]> => {
  const industry = await repo.findIndustryById(industryId);
  if (!industry) throw new NotFoundError('Industry');
  return repo.findFeaturesByIndustry(industryId);
};

/**
 * Features are addressed through their industry, so the industry in the path
 * is checked rather than trusted. Without it the nesting would be decoration:
 * any id would resolve under any parent, and a panel could delete a feature
 * belonging to an industry the editor is not even looking at.
 *
 * A mismatch reads as "no such feature here", not as a permission error - the
 * feature genuinely is not at that address.
 */
const assertOwned = (
  feature: ErpIndustryFeature | null,
  industryId: string,
): ErpIndustryFeature => {
  if (!feature || feature.industryId !== industryId) throw new NotFoundError('Feature');
  return feature;
};

export const getFeatureById = async (
  industryId: string,
  id: string,
): Promise<ErpIndustryFeature> => assertOwned(await repo.findFeatureById(id), industryId);

export const listBenefits = async (): Promise<ErpIndustryBenefit[]> => repo.findAllBenefits();

export const getBenefitById = async (id: string): Promise<ErpIndustryBenefit> => {
  const benefit = await repo.findBenefitById(id);
  if (!benefit) throw new NotFoundError('Benefit');
  return benefit;
};

/**
 * The website-facing read: the whole section in one response.
 *
 * The site switches panels in the browser without going back to the server, so
 * sending industries one at a time would mean a request per click for content
 * already known. Null when the copy or the industries are missing - the page
 * then keeps the section it ships, which is a complete working one.
 */
export const getPublished = async (): Promise<PublicErpRecognitionSection | null> => {
  const [copy, industries, benefits] = await Promise.all([
    sectionCopyService.get('erp', 'recognition'),
    repo.findPublishedIndustries(),
    repo.findPublishedBenefits(),
  ]);
  if (!copy || industries.length === 0) return null;

  const features = await repo.findActiveFeaturesForIndustries(industries.map((i) => i.id));
  const byIndustry = new Map<string, ErpIndustryFeature[]>();
  for (const feature of features) {
    const list = byIndustry.get(feature.industryId) ?? [];
    list.push(feature);
    byIndustry.set(feature.industryId, list);
  }

  const panels = await Promise.all(
    industries.map(async (industry) => ({
      slug: industry.slug,
      name: industry.name,
      icon: industry.icon,
      shortDescription: industry.shortDescription,
      erpTitle: industry.erpTitle,
      erpDescription: industry.erpDescription,
      image: await resolveSource(industry.imageUrl, industry.imageFileId),
      imageAlt: industry.imageAlt,
      dashboard: await resolveSource(industry.dashboardUrl, industry.dashboardFileId),
      dashboardAlt: industry.dashboardAlt,
      features: (byIndustry.get(industry.id) ?? []).map((f) => ({
        title: f.title,
        description: f.description,
        icon: f.icon,
      })),
    })),
  );

  // An industry whose photo went missing would render an empty frame, so it is
  // dropped rather than shown half-built.
  const usable = panels.filter((panel) => panel.image !== null);
  if (usable.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    industries: usable,
    benefits: benefits.map((b) => ({ title: b.title, icon: b.icon })),
  };
};

// ── industries: writes ────────────────────────────────────────────────────

export const createIndustry = async (
  input: CreateErpIndustryInput,
  context: RequestContext,
): Promise<ResolvedErpIndustry> => {
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, 'erpIndustry', 'imageFileId');
  }
  if (input.dashboardFileId) {
    await assertUsableImageFile(input.dashboardFileId, 'erpDashboard', 'dashboardFileId');
  }

  const industry = await withTransaction(async (client) => {
    const existing = await repo.countIndustries(client);
    if (existing >= LIMITS.MAX_ERP_INDUSTRIES) {
      throw new ConflictError(
        `The selector holds at most ${LIMITS.MAX_ERP_INDUSTRIES} industries. Delete or deactivate one first.`,
      );
    }

    await assertSlugFree(input.slug, null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextIndustryOrder(client));
    const created = await repo.createIndustry(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_CREATED,
        module: MODULE,
        entityType: INDUSTRY_ENTITY,
        entityId: created.id,
        newValues: { name: created.name, slug: created.slug, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(industry, []);
};

export const updateIndustry = async (
  id: string,
  patch: UpdateErpIndustryInput,
  context: RequestContext,
): Promise<ResolvedErpIndustry> => {
  if (patch.imageFileId) {
    await assertUsableImageFile(patch.imageFileId, 'erpIndustry', 'imageFileId');
  }
  if (patch.dashboardFileId) {
    await assertUsableImageFile(patch.dashboardFileId, 'erpDashboard', 'dashboardFileId');
  }

  const industry = await withTransaction(async (client) => {
    const existing = await repo.findIndustryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Industry');

    if (patch.slug && patch.slug !== existing.slug) {
      await assertSlugFree(patch.slug, id, client);
    }

    const updated = await repo.updateIndustry(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Industry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_UPDATED,
        module: MODULE,
        entityType: INDUSTRY_ENTITY,
        entityId: id,
        oldValues: { name: existing.name, slug: existing.slug, status: existing.status },
        newValues: { name: updated.name, slug: updated.slug, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(industry, await repo.findFeaturesByIndustry(id));
};

export const setIndustryStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedErpIndustry> => {
  const industry = await withTransaction(async (client) => {
    const existing = await repo.findIndustryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Industry');

    const updated = await repo.updateIndustryStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Industry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_UPDATED,
        module: MODULE,
        entityType: INDUSTRY_ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(industry, await repo.findFeaturesByIndustry(id));
};

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorderIndustries = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedErpIndustry[]> => {
  const rows = await withTransaction(async (client) => {
    const total = await repo.countIndustries(client);
    const existingIds = await repo.findExistingIndustryIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more industries do not exist', [
        {
          field: 'ids',
          message: `Unknown industry ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_ERP_INDUSTRY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every industry', [
        {
          field: 'ids',
          message: `Expected all ${total} industry ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyIndustryOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRIES_REORDERED,
        module: MODULE,
        entityType: INDUSTRY_ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAllIndustries(
      {},
      { page: 1, limit: LIMITS.MAX_ERP_INDUSTRIES, offset: 0 },
      client,
    );
  });

  return Promise.all(rows.rows.map((row) => toResolved(row, [])));
};

/** Deleting an industry takes its features with it - the FK cascades. */
export const removeIndustry = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findIndustryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Industry');

    const featureCount = await repo.countFeatures(id, client);
    await repo.removeIndustry(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_DELETED,
        module: MODULE,
        entityType: INDUSTRY_ENTITY,
        entityId: id,
        // Recorded because the cascade is otherwise invisible in the trail.
        oldValues: { name: existing.name, slug: existing.slug, featuresRemoved: featureCount },
      },
      context,
      client,
    );
  });
};

// ── features: writes ──────────────────────────────────────────────────────

export const createFeature = async (
  industryId: string,
  input: CreateErpIndustryFeatureInput,
  context: RequestContext,
): Promise<ErpIndustryFeature> =>
  withTransaction(async (client) => {
    const industry = await repo.findIndustryById(industryId, client);
    if (!industry) throw new NotFoundError('Industry');

    const existing = await repo.countFeatures(industryId, client);
    if (existing >= LIMITS.MAX_ERP_INDUSTRY_FEATURES) {
      throw new ConflictError(
        `An industry holds at most ${LIMITS.MAX_ERP_INDUSTRY_FEATURES} features. Delete or deactivate one first.`,
      );
    }

    const displayOrder =
      input.displayOrder ?? (await repo.nextFeatureOrder(industryId, client));
    const created = await repo.createFeature(
      industryId,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_FEATURE_CREATED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: created.id,
        newValues: { industry: industry.slug, title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateFeature = async (
  industryId: string,
  id: string,
  patch: UpdateErpIndustryFeatureInput,
  context: RequestContext,
): Promise<ErpIndustryFeature> =>
  withTransaction(async (client) => {
    const existing = assertOwned(
      await repo.findFeatureByIdForUpdate(id, client),
      industryId,
    );

    const updated = await repo.updateFeature(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Feature');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_FEATURE_UPDATED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: id,
        oldValues: { title: existing.title, status: existing.status },
        newValues: { title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setFeatureStatus = async (
  industryId: string,
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ErpIndustryFeature> => updateFeature(industryId, id, { status }, context);

export const reorderFeatures = async (
  industryId: string,
  orderedIds: string[],
  context: RequestContext,
): Promise<ErpIndustryFeature[]> =>
  withTransaction(async (client) => {
    const industry = await repo.findIndustryById(industryId, client);
    if (!industry) throw new NotFoundError('Industry');

    const current = await repo.findFeaturesByIndustry(industryId, client);
    const currentIds = current.map((f) => f.id);

    const foreign = orderedIds.filter((id) => !currentIds.includes(id));
    if (foreign.length > 0) {
      throw new ValidationError('One or more features do not belong to this industry', [
        {
          field: 'ids',
          message: `Not features of ${industry.name}: ${foreign.join(', ')}`,
          code: 'UNKNOWN_ERP_INDUSTRY_FEATURE',
        },
      ]);
    }

    if (orderedIds.length !== currentIds.length) {
      throw new ValidationError('Reorder must list every feature', [
        {
          field: 'ids',
          message: `Expected all ${currentIds.length} feature ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyFeatureOrder(industryId, orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_FEATURES_REORDERED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: industryId,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    return repo.findFeaturesByIndustry(industryId, client);
  });

export const removeFeature = async (
  industryId: string,
  id: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = assertOwned(
      await repo.findFeatureByIdForUpdate(id, client),
      industryId,
    );

    await repo.removeFeature(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_FEATURE_DELETED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: id,
        oldValues: { title: existing.title },
      },
      context,
      client,
    );
  });
};

// ── benefits: writes ──────────────────────────────────────────────────────

export const createBenefit = async (
  input: CreateErpIndustryBenefitInput,
  context: RequestContext,
): Promise<ErpIndustryBenefit> =>
  withTransaction(async (client) => {
    const existing = await repo.countBenefits(client);
    if (existing >= LIMITS.MAX_ERP_INDUSTRY_BENEFITS) {
      throw new ConflictError(
        `The strip holds at most ${LIMITS.MAX_ERP_INDUSTRY_BENEFITS} benefits. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextBenefitOrder(client));
    const created = await repo.createBenefit(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_BENEFIT_CREATED,
        module: MODULE,
        entityType: BENEFIT_ENTITY,
        entityId: created.id,
        newValues: { title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateBenefit = async (
  id: string,
  patch: UpdateErpIndustryBenefitInput,
  context: RequestContext,
): Promise<ErpIndustryBenefit> =>
  withTransaction(async (client) => {
    const existing = await repo.findBenefitByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Benefit');

    const updated = await repo.updateBenefit(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Benefit');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_BENEFIT_UPDATED,
        module: MODULE,
        entityType: BENEFIT_ENTITY,
        entityId: id,
        oldValues: { title: existing.title, status: existing.status },
        newValues: { title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setBenefitStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ErpIndustryBenefit> => updateBenefit(id, { status }, context);

export const reorderBenefits = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ErpIndustryBenefit[]> =>
  withTransaction(async (client) => {
    const total = await repo.countBenefits(client);
    const existingIds = await repo.findExistingBenefitIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more benefits do not exist', [
        {
          field: 'ids',
          message: `Unknown benefit ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_ERP_INDUSTRY_BENEFIT',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every benefit', [
        {
          field: 'ids',
          message: `Expected all ${total} benefit ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyBenefitOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_BENEFITS_REORDERED,
        module: MODULE,
        entityType: BENEFIT_ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    return repo.findAllBenefits(client);
  });

export const removeBenefit = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findBenefitByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Benefit');

    await repo.removeBenefit(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_INDUSTRY_BENEFIT_DELETED,
        module: MODULE,
        entityType: BENEFIT_ENTITY,
        entityId: id,
        oldValues: { title: existing.title },
      },
      context,
      client,
    );
  });
};
