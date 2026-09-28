// src/modules/industry-pages/food-processing-page/services/trust-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/trust-section.repository';
import { assertUsableImageFile, resolveSource } from '../utils/media';
import {
  FoodProcessingTrustLogo,
  FoodProcessingTrustLogoFilters,
  FoodProcessingTrustStat,
  FoodProcessingTrustStatFilters,
  FoodProcessingTrustPanel,
  ResolvedFoodProcessingTrustPanel,
  UpsertFoodProcessingTrustPanelInput,
  CreateFoodProcessingTrustLogoInput,
  CreateFoodProcessingTrustStatInput,
  PublicFoodProcessingTrustSection,
  ResolvedFoodProcessingTrustLogo,
  UpdateFoodProcessingTrustLogoInput,
  UpdateFoodProcessingTrustStatInput,
} from '../types/trust-section.types';

const MODULE = 'food_processing_page';
const LOGO_ENTITY = 'food_processing_trust_logo';
const STAT_ENTITY = 'food_processing_trust_stat';

/**
 * Checks a reorder's id list against the table: it must name every row, and
 * only rows that exist.
 */
function assertCompleteOrder(
  ids: string[],
  total: number,
  existing: string[],
  noun: string,
): void {
  if (ids.length !== total) {
    throw new ValidationError(`The order must list every ${noun}`, [
      { field: 'ids', message: `Expected ${total} ids, got ${ids.length}`, code: 'INCOMPLETE_ORDER' },
    ]);
  }
  if (existing.length !== ids.length) {
    throw new ValidationError(`The order names a ${noun} that does not exist`, [
      { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
    ]);
  }
}

// ── the customer logos ────────────────────────────────────────────────────

const toResolvedLogo = async (logo: FoodProcessingTrustLogo): Promise<ResolvedFoodProcessingTrustLogo> => ({
  ...logo,
  image: await resolveSource(logo.imageUrl, logo.imageFileId),
});

/*
 * Checked against the home page's trust-strip slot rather than a slot of its
 * own: the same marks, drawn the same way - object-contain at a fixed height -
 * so the rule that fits one fits the other.
 */
const assertLogoImage = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, 'trustLogo', 'imageFileId', 'Logo');

export const listLogos = async (
  filters: FoodProcessingTrustLogoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedFoodProcessingTrustLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllLogos(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedLogo)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getLogoById = async (id: string): Promise<ResolvedFoodProcessingTrustLogo> => {
  const logo = await repo.findLogoById(id);
  if (!logo) throw new NotFoundError('Logo');
  return toResolvedLogo(logo);
};

export const createLogo = async (
  input: CreateFoodProcessingTrustLogoInput,
  context: RequestContext,
): Promise<ResolvedFoodProcessingTrustLogo> => {
  if (input.imageFileId) await assertLogoImage(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countLogos(client);
    if (existing >= LIMITS.MAX_FOOD_PROCESSING_TRUST_LOGOS) {
      throw new ConflictError(
        `The logo row holds at most ${LIMITS.MAX_FOOD_PROCESSING_TRUST_LOGOS} logos. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextLogoOrder(client));
    const created = await repo.createLogo({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FOOD_PROCESSING_TRUST_LOGO_CREATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: created.id,
        newValues: { alt: created.alt, status: created.status },
      },
      context,
      client,
    );

    return toResolvedLogo(created);
  });
};

export const updateLogo = async (
  id: string,
  patch: UpdateFoodProcessingTrustLogoInput,
  context: RequestContext,
): Promise<ResolvedFoodProcessingTrustLogo> => {
  if (patch.imageFileId) await assertLogoImage(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    const updated = await repo.updateLogo(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FOOD_PROCESSING_TRUST_LOGO_UPDATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { alt: existing.alt, status: existing.status },
        newValues: { alt: updated.alt, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedLogo(updated);
  });
};

export const setLogoStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedFoodProcessingTrustLogo> => updateLogo(id, { status }, context);

export const reorderLogos = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedFoodProcessingTrustLogo[]> =>
  withTransaction(async (client) => {
    const total = await repo.countLogos(client);
    const existing = await repo.findExistingLogoIds(ids, client);
    assertCompleteOrder(ids, total, existing, 'logo');

    await repo.applyLogoOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FOOD_PROCESSING_TRUST_LOGOS_REORDERED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllLogos(
      {},
      { page: 1, limit: LIMITS.MAX_FOOD_PROCESSING_TRUST_LOGOS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedLogo));
  });

export const removeLogo = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    await repo.removeLogo(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FOOD_PROCESSING_TRUST_LOGO_DELETED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { alt: existing.alt },
      },
      context,
      client,
    );
  });
};

// ── the figures ───────────────────────────────────────────────────────────

export const listStats = async (
  filters: FoodProcessingTrustStatFilters,
  pagination: PaginationParams,
): Promise<{ rows: FoodProcessingTrustStat[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllStats(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getStatById = async (id: string): Promise<FoodProcessingTrustStat> => {
  const stat = await repo.findStatById(id);
  if (!stat) throw new NotFoundError('Statistic');
  return stat;
};

export const createStat = async (
  input: CreateFoodProcessingTrustStatInput,
  context: RequestContext,
): Promise<FoodProcessingTrustStat> =>
  withTransaction(async (client) => {
    const existing = await repo.countStats(client);
    if (existing >= LIMITS.MAX_FOOD_PROCESSING_TRUST_STATS) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_FOOD_PROCESSING_TRUST_STATS} figures - it is a three-up row. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextStatOrder(client));
    const created = await repo.createStat({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FOOD_PROCESSING_TRUST_STAT_CREATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: created.id,
        newValues: { value: created.value, label: created.label },
      },
      context,
      client,
    );

    return created;
  });

export const updateStat = async (
  id: string,
  patch: UpdateFoodProcessingTrustStatInput,
  context: RequestContext,
): Promise<FoodProcessingTrustStat> =>
  withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Statistic');

    const updated = await repo.updateStat(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Statistic');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FOOD_PROCESSING_TRUST_STAT_UPDATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: id,
        oldValues: { value: existing.value, label: existing.label, status: existing.status },
        newValues: { value: updated.value, label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setStatStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<FoodProcessingTrustStat> => updateStat(id, { status }, context);

export const reorderStats = async (
  ids: string[],
  context: RequestContext,
): Promise<FoodProcessingTrustStat[]> =>
  withTransaction(async (client) => {
    const total = await repo.countStats(client);
    const existing = await repo.findExistingStatIds(ids, client);
    assertCompleteOrder(ids, total, existing, 'figure');

    await repo.applyStatOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FOOD_PROCESSING_TRUST_STATS_REORDERED,
        module: MODULE,
        entityType: STAT_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllStats(
      {},
      { page: 1, limit: LIMITS.MAX_FOOD_PROCESSING_TRUST_STATS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeStat = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Statistic');

    await repo.removeStat(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FOOD_PROCESSING_TRUST_STAT_DELETED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: id,
        oldValues: { value: existing.value, label: existing.label },
      },
      context,
      client,
    );
  });
};

// ── the photo panel ───────────────────────────────────────────────────────

const toResolvedPanel = async (
  panel: FoodProcessingTrustPanel,
): Promise<ResolvedFoodProcessingTrustPanel> => ({
  ...panel,
  image: await resolveSource(panel.imageUrl, panel.imageFileId),
});

/** Null when the panel has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<ResolvedFoodProcessingTrustPanel | null> => {
  const panel = await repo.findPanel();
  return panel ? toResolvedPanel(panel) : null;
};

export const upsertPanel = async (
  input: UpsertFoodProcessingTrustPanelInput,
  context: RequestContext,
): Promise<ResolvedFoodProcessingTrustPanel> => {
  if (input.imageFileId) {
    await assertUsableImageFile(
      input.imageFileId,
      'foodProcessingTrustPanel',
      'imageFileId',
      'Photograph',
    );
  }

  return withTransaction(async (client) => {
    const existing = await repo.findPanel(client);
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FOOD_PROCESSING_TRUST_PANEL_UPDATED,
        module: MODULE,
        entityType: 'food_processing_trust_panel',
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

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call.
 *
 * Null when the copy is missing, or when neither row has anything to show -
 * the page then keeps the section it ships. One empty row is allowed: logos
 * with no figures, or figures with no logos, is still a section worth showing.
 *
 * A logo whose file has been deleted is dropped rather than published with a
 * null source, which would render a broken image.
 */
export const getPublished = async (): Promise<PublicFoodProcessingTrustSection | null> => {
  const [copy, logos, stats, panel] = await Promise.all([
    sectionCopyService.get('food-processing', 'trust'),
    repo.findPublishedLogos(),
    repo.findPublishedStats(),
    repo.findPanel(),
  ]);
  if (!copy) return null;

  const resolvedLogos = (await Promise.all(logos.map(toResolvedLogo)))
    .filter((logo): logo is ResolvedFoodProcessingTrustLogo & { image: string } => logo.image !== null)
    .map((logo) => ({ image: logo.image, alt: logo.alt }));

  if (resolvedLogos.length === 0 && stats.length === 0) return null;

  const resolvedPanel = panel ? await toResolvedPanel(panel) : null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    panel: resolvedPanel?.image ? { image: resolvedPanel.image, alt: resolvedPanel.alt } : null,
    logos: resolvedLogos,
    stats: stats.map((stat) => ({ value: stat.value, label: stat.label })),
  };
};
