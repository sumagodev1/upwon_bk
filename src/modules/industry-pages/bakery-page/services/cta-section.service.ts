// src/modules/industry-pages/bakery-page/services/cta-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/cta-section.repository';
import { assertUsableImageFile, resolveSource } from '../utils/media';
import {
  BakeryCtaFeature,
  BakeryCtaFeatureFilters,
  BakeryCtaSection,
  CreateBakeryCtaFeatureInput,
  PublicBakeryCtaSection,
  ResolvedBakeryCtaSection,
  UpdateBakeryCtaFeatureInput,
  UpsertBakeryCtaSectionInput,
} from '../types/cta-section.types';

const MODULE = 'bakery_page';
const ENTITY = 'bakery_cta_section';
const FEATURE_ENTITY = 'bakery_cta_feature';

// ── the band ──────────────────────────────────────────────────────────────

const toResolved = async (section: BakeryCtaSection): Promise<ResolvedBakeryCtaSection> => ({
  ...section,
  desktopImage: await resolveSource(section.desktopImageUrl, section.desktopImageFileId),
  mobileImage: await resolveSource(section.mobileImageUrl, section.mobileImageFileId),
});

/** Null when the band has never been authored - a normal first-run state. */
export const get = async (): Promise<ResolvedBakeryCtaSection | null> => {
  const section = await repo.find();
  return section ? toResolved(section) : null;
};

export const upsert = async (
  input: UpsertBakeryCtaSectionInput,
  context: RequestContext,
): Promise<ResolvedBakeryCtaSection> => {
  if (input.desktopImageFileId) {
    await assertUsableImageFile(
      input.desktopImageFileId,
      'bakeryCtaDesktop',
      'desktopImageFileId',
      'Desktop artwork',
    );
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      'bakeryCtaMobile',
      'mobileImageFileId',
      'Mobile artwork',
    );
  }

  return withTransaction(async (client) => {
    const existing = await repo.find(client);
    const saved = await repo.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_CTA_SECTION_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: saved.id,
        oldValues: existing ? { primaryLabel: existing.primaryLabel } : undefined,
        newValues: { primaryLabel: saved.primaryLabel },
      },
      context,
      client,
    );

    return toResolved(saved);
  });
};

// ── the capability marks ──────────────────────────────────────────────────

export const listFeatures = async (
  filters: BakeryCtaFeatureFilters,
  pagination: PaginationParams,
): Promise<{ rows: BakeryCtaFeature[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllFeatures(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getFeatureById = async (id: string): Promise<BakeryCtaFeature> => {
  const feature = await repo.findFeatureById(id);
  if (!feature) throw new NotFoundError('Bakery CTA feature');
  return feature;
};

export const createFeature = async (
  input: CreateBakeryCtaFeatureInput,
  context: RequestContext,
): Promise<BakeryCtaFeature> =>
  withTransaction(async (client) => {
    const existing = await repo.countFeatures(client);
    if (existing >= LIMITS.MAX_BAKERY_CTA_FEATURES) {
      throw new ConflictError(
        `The band holds at most ${LIMITS.MAX_BAKERY_CTA_FEATURES} marks - it is a four-up row. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextFeatureOrder(client));
    const created = await repo.createFeature({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_CTA_FEATURE_CREATED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: created.id,
        newValues: { label: created.label, subLabel: created.subLabel, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateFeature = async (
  id: string,
  patch: UpdateBakeryCtaFeatureInput,
  context: RequestContext,
): Promise<BakeryCtaFeature> =>
  withTransaction(async (client) => {
    const existing = await repo.findFeatureByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Bakery CTA feature');

    const updated = await repo.updateFeature(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Bakery CTA feature');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_CTA_FEATURE_UPDATED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setFeatureStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<BakeryCtaFeature> => updateFeature(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorderFeatures = async (
  ids: string[],
  context: RequestContext,
): Promise<BakeryCtaFeature[]> =>
  withTransaction(async (client) => {
    const total = await repo.countFeatures(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every mark', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingFeatureIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a mark that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyFeatureOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_CTA_FEATURES_REORDERED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    const reordered = await repo.findAllFeatures(
      {},
      { page: 1, limit: LIMITS.MAX_BAKERY_CTA_FEATURES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeFeature = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findFeatureByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Bakery CTA feature');

    await repo.removeFeature(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_CTA_FEATURE_DELETED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, subLabel: existing.subLabel },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The copy, the band and its marks in one response.
 *
 * Null when the copy or the band is missing - the page then keeps the band it
 * ships, which is a complete working one.
 */
export const getPublished = async (): Promise<PublicBakeryCtaSection | null> => {
  const [copy, section, features] = await Promise.all([
    sectionCopyService.get('bakery', 'cta'),
    repo.find(),
    repo.findPublishedFeatures(),
  ]);
  if (!copy || !section) return null;

  const resolved = await toResolved(section);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    desktopImage: resolved.desktopImage,
    mobileImage: resolved.mobileImage,
    primary: { label: resolved.primaryLabel, href: resolved.primaryHref },
    // Both halves or neither, which the table also enforces.
    secondary:
      resolved.secondaryLabel && resolved.secondaryHref
        ? { label: resolved.secondaryLabel, href: resolved.secondaryHref }
        : null,
    features: features.map((feature) => ({
      icon: feature.icon,
      label: feature.label,
      subLabel: feature.subLabel,
    })),
  };
};
