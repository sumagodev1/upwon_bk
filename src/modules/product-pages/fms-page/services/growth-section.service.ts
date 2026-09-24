// src/modules/product-pages/fms-page/services/growth-section.service.ts

import { Executor, withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/growth-section.repository';
import {
  CreateFmsGrowthFeatureInput,
  CreateFmsGrowthTierInput,
  FmsGrowthFeature,
  FmsGrowthSection,
  FmsGrowthTierFilters,
  PublicFmsGrowthSection,
  ResolvedFmsGrowthTier,
  UpdateFmsGrowthFeatureInput,
  UpdateFmsGrowthTierInput,
  UpsertFmsGrowthSectionInput,
} from '../types/growth-section.types';

const MODULE = 'fms_page';
const SECTION_ENTITY = 'fms_growth_section';
const TIER_ENTITY = 'fms_growth_tier';
const FEATURE_ENTITY = 'fms_growth_feature';

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
 * Refuses a second highlighted tier.
 *
 * The badge is centred on a single card, so two would read as no
 * recommendation at all. The partial unique index on the table is the actual
 * guarantee - it holds even when two administrators promote different tiers at
 * the same moment. This check exists so the ordinary case gets a message
 * naming what to do about it, rather than a raw constraint violation.
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

const toResolved = async (
  tier: Awaited<ReturnType<typeof repo.findTierById>>,
  features: FmsGrowthFeature[],
): Promise<ResolvedFmsGrowthTier> => ({ ...tier!, features });

// -- the reassurance line ---------------------------------------------------

/** Null before it has ever been set - a normal first-run state, not a 404. */
export const getSection = async (): Promise<FmsGrowthSection | null> => repo.findSection();

/**
 * Saves the line under the row, creating the record on the first call.
 *
 * An absent `footnote` keeps whatever is stored; `null` clears it, which is how
 * the line is turned off.
 */
export const saveSection = async (
  input: UpsertFmsGrowthSectionInput,
  context: RequestContext,
): Promise<FmsGrowthSection> =>
  withTransaction(async (client) => {
    const existing = await repo.findSection(client);
    const footnote =
      input.footnote !== undefined ? input.footnote : (existing?.footnote ?? null);

    const saved = await repo.upsertSection(footnote, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_GROWTH_SECTION_UPDATED,
        module: MODULE,
        entityType: SECTION_ENTITY,
        entityId: saved.id,
        oldValues: existing ? { footnote: existing.footnote } : undefined,
        newValues: { footnote: saved.footnote },
      },
      context,
      client,
    );

    return saved;
  });

// -- the tier cards ---------------------------------------------------------

/**
 * The admin list.
 *
 * Ticks come along, in one bulk query rather than one per row, so the list can
 * show how many each tier has without N round trips.
 */
export const listTiers = async (
  filters: FmsGrowthTierFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedFmsGrowthTier[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllTiers(filters, pagination);
  const features = await repo.findActiveFeaturesForTiers(rows.map((r) => r.id));

  const byTier = new Map<string, FmsGrowthFeature[]>();
  for (const feature of features) {
    const list = byTier.get(feature.tierId) ?? [];
    list.push(feature);
    byTier.set(feature.tierId, list);
  }

  return {
    rows: rows.map((row) => ({ ...row, features: byTier.get(row.id) ?? [] })),
    meta: buildPaginationMeta(total, pagination),
  };
};

/** One tier with every tick it owns, whatever their status. */
export const getTierById = async (id: string): Promise<ResolvedFmsGrowthTier> => {
  const tier = await repo.findTierById(id);
  if (!tier) throw new NotFoundError('Tier');
  return toResolved(tier, await repo.findFeaturesByTier(id));
};

export const createTier = async (
  input: CreateFmsGrowthTierInput,
  context: RequestContext,
): Promise<ResolvedFmsGrowthTier> => {
  const tier = await withTransaction(async (client) => {
    const existing = await repo.countTiers(client);
    if (existing >= LIMITS.MAX_FMS_GROWTH_TIERS) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_FMS_GROWTH_TIERS} tiers. Delete or deactivate one first.`,
      );
    }

    await assertSlugFree(input.slug, null, client);
    if (input.isPopular) await assertNoOtherPopular(null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextTierOrder(client));
    const created = await repo.createTier({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_GROWTH_TIER_CREATED,
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

  return toResolved(tier, []);
};

export const updateTier = async (
  id: string,
  patch: UpdateFmsGrowthTierInput,
  context: RequestContext,
): Promise<ResolvedFmsGrowthTier> => {
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
        action: AUDIT_ACTIONS.FMS_GROWTH_TIER_UPDATED,
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
): Promise<ResolvedFmsGrowthTier> => {
  await withTransaction(async (client) => {
    const existing = await repo.findTierByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Tier');

    const updated = await repo.updateTierStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Tier');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_GROWTH_TIER_UPDATED,
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

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorderTiers = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedFmsGrowthTier[]> => {
  const rows = await withTransaction(async (client) => {
    const total = await repo.countTiers(client);
    const existingIds = await repo.findExistingTierIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more tiers do not exist', [
        {
          field: 'ids',
          message: `Unknown tier ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_FMS_GROWTH_TIER',
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
        action: AUDIT_ACTIONS.FMS_GROWTH_TIERS_REORDERED,
        module: MODULE,
        entityType: TIER_ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAllTiers(
      {},
      { page: 1, limit: LIMITS.MAX_FMS_GROWTH_TIERS, offset: 0 },
      client,
    );
  });

  return rows.rows.map((row) => ({ ...row, features: [] }));
};

/** Deleting a tier takes its ticks with it - the FK cascades. */
export const removeTier = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findTierByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Tier');

    const featureCount = await repo.countFeatures(id, client);
    await repo.removeTier(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_GROWTH_TIER_DELETED,
        module: MODULE,
        entityType: TIER_ENTITY,
        entityId: id,
        // Recorded because the cascade is otherwise invisible in the trail.
        oldValues: {
          name: existing.name,
          slug: existing.slug,
          featuresRemoved: featureCount,
        },
      },
      context,
      client,
    );
  });
};

// -- the ticks --------------------------------------------------------------

/**
 * Ticks are addressed through their tier, so the tier in the path is checked
 * rather than trusted. Without it the nesting would be decoration: any id
 * would resolve under any parent, and a panel could delete a tick belonging to
 * a tier the editor is not even looking at.
 *
 * A mismatch reads as "no such tick here", not as a permission error - the
 * tick genuinely is not at that address.
 */
const assertOwned = (
  feature: FmsGrowthFeature | null,
  tierId: string,
): FmsGrowthFeature => {
  if (!feature || feature.tierId !== tierId) throw new NotFoundError('Feature');
  return feature;
};

export const listFeatures = async (tierId: string): Promise<FmsGrowthFeature[]> => {
  const tier = await repo.findTierById(tierId);
  if (!tier) throw new NotFoundError('Tier');
  return repo.findFeaturesByTier(tierId);
};

export const getFeatureById = async (
  tierId: string,
  id: string,
): Promise<FmsGrowthFeature> => assertOwned(await repo.findFeatureById(id), tierId);

export const createFeature = async (
  tierId: string,
  input: CreateFmsGrowthFeatureInput,
  context: RequestContext,
): Promise<FmsGrowthFeature> =>
  withTransaction(async (client) => {
    const tier = await repo.findTierById(tierId, client);
    if (!tier) throw new NotFoundError('Tier');

    const existing = await repo.countFeatures(tierId, client);
    if (existing >= LIMITS.MAX_FMS_GROWTH_FEATURES) {
      throw new ConflictError(
        `A tier holds at most ${LIMITS.MAX_FMS_GROWTH_FEATURES} features. Delete or deactivate one first.`,
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
        action: AUDIT_ACTIONS.FMS_GROWTH_FEATURE_CREATED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: created.id,
        newValues: { tier: tier.slug, label: created.label, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateFeature = async (
  tierId: string,
  id: string,
  patch: UpdateFmsGrowthFeatureInput,
  context: RequestContext,
): Promise<FmsGrowthFeature> =>
  withTransaction(async (client) => {
    const existing = assertOwned(await repo.findFeatureByIdForUpdate(id, client), tierId);

    const updated = await repo.updateFeature(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Feature');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_GROWTH_FEATURE_UPDATED,
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
  tierId: string,
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<FmsGrowthFeature> => updateFeature(tierId, id, { status }, context);

export const reorderFeatures = async (
  tierId: string,
  orderedIds: string[],
  context: RequestContext,
): Promise<FmsGrowthFeature[]> =>
  withTransaction(async (client) => {
    const tier = await repo.findTierById(tierId, client);
    if (!tier) throw new NotFoundError('Tier');

    const current = await repo.findFeaturesByTier(tierId, client);
    const currentIds = current.map((f) => f.id);

    const foreign = orderedIds.filter((id) => !currentIds.includes(id));
    if (foreign.length > 0) {
      throw new ValidationError('One or more features do not belong to this tier', [
        {
          field: 'ids',
          message: `Not features of ${tier.name}: ${foreign.join(', ')}`,
          code: 'UNKNOWN_FMS_GROWTH_FEATURE',
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

    await repo.applyFeatureOrder(tierId, orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_GROWTH_FEATURES_REORDERED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: tierId,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    return repo.findFeaturesByTier(tierId, client);
  });

export const removeFeature = async (
  tierId: string,
  id: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = assertOwned(await repo.findFeatureByIdForUpdate(id, client), tierId);

    await repo.removeFeature(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_GROWTH_FEATURE_DELETED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: id,
        oldValues: { label: existing.label },
      },
      context,
      client,
    );
  });
};

// -- the website-facing read ------------------------------------------------

/**
 * The whole section in one response.
 *
 * The cards are drawn side by side and read against each other, so sending
 * them one at a time would mean three requests for one row of content. Null
 * when the copy or the tiers are missing - the page then keeps the section it
 * ships, which is a complete working one.
 */
export const getPublished = async (): Promise<PublicFmsGrowthSection | null> => {
  const [copy, section, tiers] = await Promise.all([
    sectionCopyService.get('fms', 'packages'),
    repo.findSection(),
    repo.findPublishedTiers(),
  ]);
  if (!copy || tiers.length === 0) return null;

  const features = await repo.findActiveFeaturesForTiers(tiers.map((t) => t.id));
  const byTier = new Map<string, FmsGrowthFeature[]>();
  for (const feature of features) {
    const list = byTier.get(feature.tierId) ?? [];
    list.push(feature);
    byTier.set(feature.tierId, list);
  }

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    footnote: section?.footnote ?? null,
    tiers: tiers.map((tier) => ({
      slug: tier.slug,
      name: tier.name,
      lead: tier.lead,
      tagline: tier.tagline,
      scope: tier.scope,
      inheritsLabel: tier.inheritsLabel,
      buttonLabel: tier.buttonLabel,
      buttonHref: tier.buttonHref,
      isPopular: tier.isPopular,
      // Just the text: the ticks carry no other field the card draws.
      features: (byTier.get(tier.id) ?? []).map((f) => f.label),
    })),
  };
};
