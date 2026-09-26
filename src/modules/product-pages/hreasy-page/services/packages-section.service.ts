// src/modules/product-pages/hreasy-page/services/packages-section.service.ts

import { Executor, withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/packages-section.repository';
import {
  CreateHreasyPackageFeatureInput,
  CreateHreasyPackageTierInput,
  HreasyPackageFeature,
  HreasyPackageTierFilters,
  PublicHreasyPackagesSection,
  ResolvedHreasyPackageTier,
  UpdateHreasyPackageFeatureInput,
  UpdateHreasyPackageTierInput,
} from '../types/packages-section.types';

const MODULE = 'hreasy_page';
const TIER_ENTITY = 'hreasy_package_tier';
const FEATURE_ENTITY = 'hreasy_package_feature';

/**
 * Refuses a slug already in use.
 *
 * A field error rather than the raw unique-violation a 409 would carry: the
 * slug is authored, so the message belongs on the input that produced it.
 *
 * @param excludeId the tier being changed, so re-saving its own slug is fine
 */
const assertSlugFree = async (
  slug: string,
  excludeId: string | null,
  client?: Executor,
): Promise<void> => {
  const existing = await repo.findTierBySlug(slug, client);
  if (!existing || existing.id === excludeId) return;

  throw new ValidationError('That slug is already in use', [
    {
      field: 'slug',
      message: `"${slug}" already belongs to ${existing.name}. Slugs identify a tier in links, so they have to be unique.`,
      code: 'DUPLICATE_SLUG',
    },
  ]);
};

/**
 * Refuses a second highlighted card.
 *
 * The row wears one "Most Popular" badge, so promoting a tier while another
 * holds it is an editing mistake with a clear fix. Refusing here gives a
 * message naming what to do about it, rather than a raw constraint violation
 * from the partial unique index underneath.
 *
 * @param excludeId the tier being changed, so re-saving the popular one is fine
 */
const assertNoOtherPopular = async (
  excludeId: string | null,
  client?: Executor,
): Promise<void> => {
  const popular = await repo.findPopularTier(client);
  if (!popular || popular.id === excludeId) return;

  throw new ConflictError(
    `${popular.name} is already marked Most Popular, and the row highlights one tier at a time. Clear it there first.`,
  );
};

const toResolved = (
  tier: Awaited<ReturnType<typeof repo.findTierById>>,
  features: HreasyPackageFeature[],
): ResolvedHreasyPackageTier => ({ ...tier!, features });

/** Groups a flat bulk read back under the tier each tick belongs to. */
const groupByTier = (rows: HreasyPackageFeature[]): Map<string, HreasyPackageFeature[]> => {
  const byTier = new Map<string, HreasyPackageFeature[]>();
  for (const row of rows) {
    const list = byTier.get(row.tierId);
    if (list) list.push(row);
    else byTier.set(row.tierId, [row]);
  }
  return byTier;
};

// ── reads ─────────────────────────────────────────────────────────────────

export const listTiers = async (
  filters: HreasyPackageTierFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedHreasyPackageTier[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllTiers(filters, pagination);

  // One bulk read for every tick on the page rather than a query per card.
  const features = await repo.findActiveFeaturesForTiers(rows.map((tier) => tier.id));
  const byTier = groupByTier(features);

  return {
    rows: rows.map((tier) => toResolved(tier, byTier.get(tier.id) ?? [])),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getTierById = async (id: string): Promise<ResolvedHreasyPackageTier> => {
  const tier = await repo.findTierById(id);
  if (!tier) throw new NotFoundError('Tier');
  // Every status here, not just active: this is the editing view of the card.
  return toResolved(tier, await repo.findFeaturesByTier(id));
};

export const listFeatures = async (tierId: string): Promise<HreasyPackageFeature[]> => {
  const tier = await repo.findTierById(tierId);
  if (!tier) throw new NotFoundError('Tier');
  return repo.findFeaturesByTier(tierId);
};

export const getFeatureById = async (
  tierId: string,
  featureId: string,
): Promise<HreasyPackageFeature> => {
  const feature = await repo.findFeatureById(featureId);
  // The tier is checked too, so a tick cannot be read through another card.
  if (!feature || feature.tierId !== tierId) throw new NotFoundError('Feature');
  return feature;
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy that heads the row and at least one card. With
 * either missing the site keeps the row it ships, which is a complete working
 * section - better than a heading over nothing.
 */
export const getPublished = async (): Promise<PublicHreasyPackagesSection | null> => {
  const tiers = await repo.findPublishedTiers();
  if (tiers.length === 0) return null;

  const copy = await sectionCopyService.get('hreasy', 'packages');
  if (!copy) return null;

  const features = await repo.findActiveFeaturesForTiers(tiers.map((tier) => tier.id));
  const byTier = groupByTier(features);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    tiers: tiers.map((tier) => ({
      slug: tier.slug,
      name: tier.name,
      lead: tier.lead,
      tagline: tier.tagline,
      scope: tier.scope,
      inheritsLabel: tier.inheritsLabel,
      buttonLabel: tier.buttonLabel,
      buttonHref: tier.buttonHref,
      buttonStyle: tier.buttonStyle,
      isPopular: tier.isPopular,
      // Just the words: the site draws its own tick beside each one.
      features: (byTier.get(tier.id) ?? []).map((feature) => feature.label),
    })),
  };
};

// ── the tier cards ────────────────────────────────────────────────────────

export const createTier = async (
  input: CreateHreasyPackageTierInput,
  context: RequestContext,
): Promise<ResolvedHreasyPackageTier> => {
  const tier = await withTransaction(async (client) => {
    const existing = await repo.countTiers(client);
    if (existing >= LIMITS.MAX_HREASY_PACKAGE_TIERS) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_HREASY_PACKAGE_TIERS} tiers. Delete or deactivate one first.`,
      );
    }

    await assertSlugFree(input.slug, null, client);
    if (input.isPopular) await assertNoOtherPopular(null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextTierOrder(client));
    const created = await repo.createTier({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PACKAGE_TIER_CREATED,
        module: MODULE,
        entityType: TIER_ENTITY,
        entityId: created.id,
        newValues: { name: created.name, slug: created.slug, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  // A new card has no ticks yet, so there is nothing to read back for it.
  return toResolved(tier, []);
};

export const updateTier = async (
  id: string,
  patch: UpdateHreasyPackageTierInput,
  context: RequestContext,
): Promise<ResolvedHreasyPackageTier> => {
  await withTransaction(async (client) => {
    const existing = await repo.findTierByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Tier');

    if (patch.slug && patch.slug !== existing.slug) {
      await assertSlugFree(patch.slug, id, client);
    }
    if (patch.isPopular === true) await assertNoOtherPopular(id, client);

    const updated = await repo.updateTier(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Tier');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PACKAGE_TIER_UPDATED,
        module: MODULE,
        entityType: TIER_ENTITY,
        entityId: id,
        oldValues: {
          name: existing.name,
          slug: existing.slug,
          isPopular: existing.isPopular,
          status: existing.status,
        },
        newValues: {
          name: updated.name,
          slug: updated.slug,
          isPopular: updated.isPopular,
          status: updated.status,
        },
      },
      context,
      client,
    );
  });

  return getTierById(id);
};

export const setTierStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedHreasyPackageTier> => {
  await withTransaction(async (client) => {
    const existing = await repo.findTierByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Tier');

    const updated = await repo.updateTierStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Tier');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PACKAGE_TIER_UPDATED,
        module: MODULE,
        entityType: TIER_ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );
  });

  return getTierById(id);
};

export const reorderTiers = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedHreasyPackageTier[]> => {
  await withTransaction(async (client) => {
    const total = await repo.countTiers(client);
    const existingIds = await repo.findExistingTierIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more tiers do not exist', [
        {
          field: 'ids',
          message: `Unknown tier ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_HREASY_PACKAGE_TIER',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every tier', [
        {
          field: 'ids',
          message: `Expected all ${total} tier ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyTierOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PACKAGE_TIERS_REORDERED,
        module: MODULE,
        entityType: TIER_ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );
  });

  const { rows } = await listTiers(
    {},
    { page: 1, limit: LIMITS.MAX_HREASY_PACKAGE_TIERS, offset: 0 },
  );
  return rows;
};

export const removeTier = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findTierByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Tier');

    // The ticks go with it - the foreign key cascades.
    await repo.removeTier(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PACKAGE_TIER_DELETED,
        module: MODULE,
        entityType: TIER_ENTITY,
        entityId: id,
        oldValues: { name: existing.name, slug: existing.slug },
      },
      context,
      client,
    );
  });
};

// ── the ticks ─────────────────────────────────────────────────────────────

export const createFeature = async (
  tierId: string,
  input: CreateHreasyPackageFeatureInput,
  context: RequestContext,
): Promise<HreasyPackageFeature> =>
  withTransaction(async (client) => {
    const tier = await repo.findTierByIdForUpdate(tierId, client);
    if (!tier) throw new NotFoundError('Tier');

    const existing = await repo.countFeatures(tierId, client);
    if (existing >= LIMITS.MAX_HREASY_PACKAGE_FEATURES) {
      throw new ConflictError(
        `A tier holds at most ${LIMITS.MAX_HREASY_PACKAGE_FEATURES} ticks. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextFeatureOrder(tierId, client));
    const created = await repo.createFeature(
      tierId,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PACKAGE_FEATURE_CREATED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: created.id,
        newValues: { tierId, label: created.label, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateFeature = async (
  tierId: string,
  featureId: string,
  patch: UpdateHreasyPackageFeatureInput,
  context: RequestContext,
): Promise<HreasyPackageFeature> =>
  withTransaction(async (client) => {
    const existing = await repo.findFeatureByIdForUpdate(featureId, client);
    // The tier is checked too, so a tick cannot be edited through another card.
    if (!existing || existing.tierId !== tierId) throw new NotFoundError('Feature');

    const updated = await repo.updateFeature(featureId, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Feature');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PACKAGE_FEATURE_UPDATED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: featureId,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setFeatureStatus = async (
  tierId: string,
  featureId: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<HreasyPackageFeature> =>
  withTransaction(async (client) => {
    const existing = await repo.findFeatureByIdForUpdate(featureId, client);
    if (!existing || existing.tierId !== tierId) throw new NotFoundError('Feature');

    const updated = await repo.updateFeatureStatus(featureId, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Feature');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PACKAGE_FEATURE_UPDATED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: featureId,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const reorderFeatures = async (
  tierId: string,
  orderedIds: string[],
  context: RequestContext,
): Promise<HreasyPackageFeature[]> =>
  withTransaction(async (client) => {
    const tier = await repo.findTierByIdForUpdate(tierId, client);
    if (!tier) throw new NotFoundError('Tier');

    const total = await repo.countFeatures(tierId, client);
    const existingIds = await repo.findExistingFeatureIds(tierId, orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more ticks do not belong to this tier', [
        {
          field: 'ids',
          message: `Unknown tick ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_HREASY_PACKAGE_FEATURE',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every tick on this tier', [
        {
          field: 'ids',
          message: `Expected all ${total} tick ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyFeatureOrder(tierId, orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PACKAGE_FEATURES_REORDERED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: tierId,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findFeaturesByTier(tierId, client);
  });

export const removeFeature = async (
  tierId: string,
  featureId: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findFeatureByIdForUpdate(featureId, client);
    if (!existing || existing.tierId !== tierId) throw new NotFoundError('Feature');

    await repo.removeFeature(featureId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PACKAGE_FEATURE_DELETED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: featureId,
        oldValues: { tierId, label: existing.label },
      },
      context,
      client,
    );
  });
};
