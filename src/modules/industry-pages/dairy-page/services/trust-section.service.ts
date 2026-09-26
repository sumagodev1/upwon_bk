// src/modules/industry-pages/dairy-page/services/trust-section.service.ts

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
  DairyTrustLogo,
  DairyTrustLogoFilters,
  DairyTrustStat,
  DairyTrustStatFilters,
  ResolvedDairyTrustStat,
  CreateDairyTrustLogoInput,
  CreateDairyTrustStatInput,
  PublicDairyTrustSection,
  ResolvedDairyTrustLogo,
  UpdateDairyTrustLogoInput,
  UpdateDairyTrustStatInput,
} from '../types/trust-section.types';

const MODULE = 'dairy_page';
const LOGO_ENTITY = 'dairy_trust_logo';
const STAT_ENTITY = 'dairy_trust_stat';

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

const toResolvedLogo = async (logo: DairyTrustLogo): Promise<ResolvedDairyTrustLogo> => ({
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
  filters: DairyTrustLogoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedDairyTrustLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllLogos(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedLogo)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getLogoById = async (id: string): Promise<ResolvedDairyTrustLogo> => {
  const logo = await repo.findLogoById(id);
  if (!logo) throw new NotFoundError('Logo');
  return toResolvedLogo(logo);
};

export const createLogo = async (
  input: CreateDairyTrustLogoInput,
  context: RequestContext,
): Promise<ResolvedDairyTrustLogo> => {
  if (input.imageFileId) await assertLogoImage(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countLogos(client);
    if (existing >= LIMITS.MAX_DAIRY_TRUST_LOGOS) {
      throw new ConflictError(
        `The logo row holds at most ${LIMITS.MAX_DAIRY_TRUST_LOGOS} logos. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextLogoOrder(client));
    const created = await repo.createLogo({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_TRUST_LOGO_CREATED,
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
  patch: UpdateDairyTrustLogoInput,
  context: RequestContext,
): Promise<ResolvedDairyTrustLogo> => {
  if (patch.imageFileId) await assertLogoImage(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    const updated = await repo.updateLogo(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_TRUST_LOGO_UPDATED,
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
): Promise<ResolvedDairyTrustLogo> => updateLogo(id, { status }, context);

export const reorderLogos = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedDairyTrustLogo[]> =>
  withTransaction(async (client) => {
    const total = await repo.countLogos(client);
    const existing = await repo.findExistingLogoIds(ids, client);
    assertCompleteOrder(ids, total, existing, 'logo');

    await repo.applyLogoOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_TRUST_LOGOS_REORDERED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllLogos(
      {},
      { page: 1, limit: LIMITS.MAX_DAIRY_TRUST_LOGOS, offset: 0 },
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
        action: AUDIT_ACTIONS.DAIRY_TRUST_LOGO_DELETED,
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

const toResolvedStat = async (stat: DairyTrustStat): Promise<ResolvedDairyTrustStat> => ({
  ...stat,
  image: await resolveSource(stat.imageUrl, stat.imageFileId),
});

const assertStatImage = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, 'dairyTrustStat', 'imageFileId', 'Photograph');

export const listStats = async (
  filters: DairyTrustStatFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedDairyTrustStat[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllStats(filters, pagination);
  return { rows: await Promise.all(rows.map(toResolvedStat)), meta: buildPaginationMeta(total, pagination) };
};

export const getStatById = async (id: string): Promise<ResolvedDairyTrustStat> => {
  const stat = await repo.findStatById(id);
  if (!stat) throw new NotFoundError('Statistic');
  return toResolvedStat(stat);
};

export const createStat = async (
  input: CreateDairyTrustStatInput,
  context: RequestContext,
): Promise<ResolvedDairyTrustStat> => {
  if (input.imageFileId) await assertStatImage(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countStats(client);
    if (existing >= LIMITS.MAX_DAIRY_TRUST_STATS) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_DAIRY_TRUST_STATS} figures - the card rotates through them. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextStatOrder(client));
    const created = await repo.createStat({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_TRUST_STAT_CREATED,
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
  patch: UpdateDairyTrustStatInput,
  context: RequestContext,
): Promise<ResolvedDairyTrustStat> => {
  if (patch.imageFileId) await assertStatImage(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Statistic');

    const updated = await repo.updateStat(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Statistic');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_TRUST_STAT_UPDATED,
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
): Promise<ResolvedDairyTrustStat> => updateStat(id, { status }, context);

export const reorderStats = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedDairyTrustStat[]> =>
  withTransaction(async (client) => {
    const total = await repo.countStats(client);
    const existing = await repo.findExistingStatIds(ids, client);
    assertCompleteOrder(ids, total, existing, 'figure');

    await repo.applyStatOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_TRUST_STATS_REORDERED,
        module: MODULE,
        entityType: STAT_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllStats(
      {},
      { page: 1, limit: LIMITS.MAX_DAIRY_TRUST_STATS, offset: 0 },
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
        action: AUDIT_ACTIONS.DAIRY_TRUST_STAT_DELETED,
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
 * Null when the copy is missing, or when neither part has anything to show -
 * the page then leaves the section out. One empty part is allowed: logos with
 * no figures, or figures with no logos, is still a section worth showing.
 *
 * A logo or figure whose file has been deleted is dropped rather than
 * published with a null source, which would render a broken image.
 */
export const getPublished = async (): Promise<PublicDairyTrustSection | null> => {
  const [copy, logos, stats] = await Promise.all([
    sectionCopyService.get('dairy', 'trust'),
    repo.findPublishedLogos(),
    repo.findPublishedStats(),
  ]);
  if (!copy) return null;

  const resolvedLogos = (await Promise.all(logos.map(toResolvedLogo)))
    .filter((logo): logo is ResolvedDairyTrustLogo & { image: string } => logo.image !== null)
    .map((logo) => ({ image: logo.image, alt: logo.alt }));

  const resolvedStats = (await Promise.all(stats.map(toResolvedStat)))
    .filter((stat): stat is ResolvedDairyTrustStat & { image: string } => stat.image !== null)
    .map((stat) => ({ value: stat.value, label: stat.label, image: stat.image }));

  if (resolvedLogos.length === 0 && resolvedStats.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    logos: resolvedLogos,
    stats: resolvedStats,
  };
};
