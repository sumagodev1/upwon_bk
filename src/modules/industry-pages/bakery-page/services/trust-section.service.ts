// src/modules/industry-pages/bakery-page/services/trust-section.service.ts

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
  BakeryTrustLogo,
  BakeryTrustLogoFilters,
  BakeryTrustStat,
  BakeryTrustStatFilters,
  CreateBakeryTrustLogoInput,
  CreateBakeryTrustStatInput,
  PublicBakeryTrustSection,
  ResolvedBakeryTrustLogo,
  ResolvedBakeryTrustStat,
  UpdateBakeryTrustLogoInput,
  UpdateBakeryTrustStatInput,
} from '../types/trust-section.types';

const MODULE = 'bakery_page';
const LOGO_ENTITY = 'bakery_trust_logo';
const STAT_ENTITY = 'bakery_trust_stat';

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

const toResolvedLogo = async (logo: BakeryTrustLogo): Promise<ResolvedBakeryTrustLogo> => ({
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
  filters: BakeryTrustLogoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedBakeryTrustLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllLogos(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedLogo)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getLogoById = async (id: string): Promise<ResolvedBakeryTrustLogo> => {
  const logo = await repo.findLogoById(id);
  if (!logo) throw new NotFoundError('Logo');
  return toResolvedLogo(logo);
};

export const createLogo = async (
  input: CreateBakeryTrustLogoInput,
  context: RequestContext,
): Promise<ResolvedBakeryTrustLogo> => {
  if (input.imageFileId) await assertLogoImage(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countLogos(client);
    if (existing >= LIMITS.MAX_BAKERY_TRUST_LOGOS) {
      throw new ConflictError(
        `The logo row holds at most ${LIMITS.MAX_BAKERY_TRUST_LOGOS} logos. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextLogoOrder(client));
    const created = await repo.createLogo({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_TRUST_LOGO_CREATED,
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
  patch: UpdateBakeryTrustLogoInput,
  context: RequestContext,
): Promise<ResolvedBakeryTrustLogo> => {
  if (patch.imageFileId) await assertLogoImage(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    const updated = await repo.updateLogo(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_TRUST_LOGO_UPDATED,
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
): Promise<ResolvedBakeryTrustLogo> => updateLogo(id, { status }, context);

export const reorderLogos = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedBakeryTrustLogo[]> =>
  withTransaction(async (client) => {
    const total = await repo.countLogos(client);
    const existing = await repo.findExistingLogoIds(ids, client);
    assertCompleteOrder(ids, total, existing, 'logo');

    await repo.applyLogoOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_TRUST_LOGOS_REORDERED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllLogos(
      {},
      { page: 1, limit: LIMITS.MAX_BAKERY_TRUST_LOGOS, offset: 0 },
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
        action: AUDIT_ACTIONS.BAKERY_TRUST_LOGO_DELETED,
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

const toResolvedStat = async (stat: BakeryTrustStat): Promise<ResolvedBakeryTrustStat> => ({
  ...stat,
  icon: await resolveSource(stat.iconUrl, stat.iconFileId),
});

const assertStatIcon = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, 'bakeryStatIcon', 'iconFileId', 'Icon');

export const listStats = async (
  filters: BakeryTrustStatFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedBakeryTrustStat[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllStats(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedStat)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getStatById = async (id: string): Promise<ResolvedBakeryTrustStat> => {
  const stat = await repo.findStatById(id);
  if (!stat) throw new NotFoundError('Statistic');
  return toResolvedStat(stat);
};

export const createStat = async (
  input: CreateBakeryTrustStatInput,
  context: RequestContext,
): Promise<ResolvedBakeryTrustStat> => {
  if (input.iconFileId) await assertStatIcon(input.iconFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countStats(client);
    if (existing >= LIMITS.MAX_BAKERY_TRUST_STATS) {
      throw new ConflictError(
        `The strip holds at most ${LIMITS.MAX_BAKERY_TRUST_STATS} figures - it is a five-up row. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextStatOrder(client));
    const created = await repo.createStat({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_TRUST_STAT_CREATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: created.id,
        newValues: { value: created.value, label: created.label },
      },
      context,
      client,
    );

    return toResolvedStat(created);
  });
};

export const updateStat = async (
  id: string,
  patch: UpdateBakeryTrustStatInput,
  context: RequestContext,
): Promise<ResolvedBakeryTrustStat> => {
  if (patch.iconFileId) await assertStatIcon(patch.iconFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Statistic');

    const updated = await repo.updateStat(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Statistic');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_TRUST_STAT_UPDATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: id,
        oldValues: { value: existing.value, label: existing.label, status: existing.status },
        newValues: { value: updated.value, label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedStat(updated);
  });
};

export const setStatStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedBakeryTrustStat> => updateStat(id, { status }, context);

export const reorderStats = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedBakeryTrustStat[]> =>
  withTransaction(async (client) => {
    const total = await repo.countStats(client);
    const existing = await repo.findExistingStatIds(ids, client);
    assertCompleteOrder(ids, total, existing, 'figure');

    await repo.applyStatOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_TRUST_STATS_REORDERED,
        module: MODULE,
        entityType: STAT_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllStats(
      {},
      { page: 1, limit: LIMITS.MAX_BAKERY_TRUST_STATS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedStat));
  });

export const removeStat = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Statistic');

    await repo.removeStat(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_TRUST_STAT_DELETED,
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
export const getPublished = async (): Promise<PublicBakeryTrustSection | null> => {
  const [copy, logos, stats] = await Promise.all([
    sectionCopyService.get('bakery', 'trust'),
    repo.findPublishedLogos(),
    repo.findPublishedStats(),
  ]);
  if (!copy) return null;

  const resolvedLogos = (await Promise.all(logos.map(toResolvedLogo)))
    .filter((logo): logo is ResolvedBakeryTrustLogo & { image: string } => logo.image !== null)
    .map((logo) => ({ image: logo.image, alt: logo.alt }));

  if (resolvedLogos.length === 0 && stats.length === 0) return null;

  const resolvedStats = await Promise.all(stats.map(toResolvedStat));

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    logos: resolvedLogos,
    stats: resolvedStats.map((stat) => ({
      value: stat.value,
      label: stat.label,
      icon: stat.icon,
      featured: stat.isFeatured,
    })),
  };
};
