// src/modules/industry-pages/qsr-franchise-page/services/trust-section.service.ts

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
import * as repo from '../repositories/trust-section.repository';
import {
  CreateQsrFranchiseTrustLogoInput,
  CreateQsrFranchiseTrustStatInput,
  PublicQsrFranchiseTrustSection,
  QsrFranchiseTrustLogo,
  QsrFranchiseTrustLogoFilters,
  QsrFranchiseTrustPanel,
  QsrFranchiseTrustStat,
  QsrFranchiseTrustStatFilters,
  ResolvedQsrFranchiseTrustLogo,
  ResolvedQsrFranchiseTrustPanel,
  UpdateQsrFranchiseTrustLogoInput,
  UpdateQsrFranchiseTrustStatInput,
  UpsertQsrFranchiseTrustPanelInput,
} from '../types/trust-section.types';

const MODULE = 'qsr_franchise_page';
const LOGO_ENTITY = 'qsr_franchise_trust_logo';
const STAT_ENTITY = 'qsr_franchise_trust_stat';
const PANEL_ENTITY = 'qsr_franchise_trust_panel';

/** Only images belong in the marquee; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

/*
 * The marks are checked against the home page's trust-strip slot rather than a
 * slot of their own, as the FMS proof strip's are: the same brand logos, drawn
 * the same way - object-contain at a fixed height.
 */
const LOGO_SLOT = 'trustLogo' as const;

// ── the logo marquee ──────────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the marquee skips that mark rather than
  // failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedLogo = async (
  logo: QsrFranchiseTrustLogo,
): Promise<ResolvedQsrFranchiseTrustLogo> => ({
  ...logo,
  image: await resolveSource(logo.imageUrl, logo.imageFileId),
});

/** Rejects a file id that is not a live image of the right shape for the slot. */
const assertUsableImageFile = async (
  fileId: string,
  slot: 'trustLogo' | 'qsrFranchiseTrustPhoto' = LOGO_SLOT,
  what = 'Logo',
  field = 'imageFileId',
): Promise<void> => {
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

  const problem = checkImageDimensions(slot, dimensions);
  if (problem) {
    throw new ValidationError(`${what} is the wrong size`, [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

export const listLogos = async (
  filters: QsrFranchiseTrustLogoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedQsrFranchiseTrustLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllLogos(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedLogo)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getLogoById = async (id: string): Promise<ResolvedQsrFranchiseTrustLogo> => {
  const logo = await repo.findLogoById(id);
  if (!logo) throw new NotFoundError('Logo');
  return toResolvedLogo(logo);
};

export const createLogo = async (
  input: CreateQsrFranchiseTrustLogoInput,
  context: RequestContext,
): Promise<ResolvedQsrFranchiseTrustLogo> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countLogos(client);
    if (existing >= LIMITS.MAX_QSR_FRANCHISE_TRUST_LOGOS) {
      throw new ConflictError(
        `The marquee holds at most ${LIMITS.MAX_QSR_FRANCHISE_TRUST_LOGOS} logos`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextLogoOrder(client));
    const created = await repo.createLogo({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.QSR_FRANCHISE_TRUST_LOGO_CREATED,
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
  patch: UpdateQsrFranchiseTrustLogoInput,
  context: RequestContext,
): Promise<ResolvedQsrFranchiseTrustLogo> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    const updated = await repo.updateLogo(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.QSR_FRANCHISE_TRUST_LOGO_UPDATED,
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
): Promise<ResolvedQsrFranchiseTrustLogo> => updateLogo(id, { status }, context);

export const reorderLogos = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedQsrFranchiseTrustLogo[]> =>
  withTransaction(async (client) => {
    const total = await repo.countLogos(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every logo', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingLogoIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a logo that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyLogoOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.QSR_FRANCHISE_TRUST_LOGOS_REORDERED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllLogos(
      {},
      { page: 1, limit: LIMITS.MAX_QSR_FRANCHISE_TRUST_LOGOS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedLogo));
  });

export const removeLogo = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    await repo.removeLogo(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.QSR_FRANCHISE_TRUST_LOGO_DELETED,
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

// ── the stat tiles ────────────────────────────────────────────────────────

export const listStats = async (
  filters: QsrFranchiseTrustStatFilters,
  pagination: PaginationParams,
): Promise<{ rows: QsrFranchiseTrustStat[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllStats(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getStatById = async (id: string): Promise<QsrFranchiseTrustStat> => {
  const stat = await repo.findStatById(id);
  if (!stat) throw new NotFoundError('Stat');
  return stat;
};

export const createStat = async (
  input: CreateQsrFranchiseTrustStatInput,
  context: RequestContext,
): Promise<QsrFranchiseTrustStat> =>
  withTransaction(async (client) => {
    const existing = await repo.countStats(client);
    if (existing >= LIMITS.MAX_QSR_FRANCHISE_TRUST_STATS) {
      throw new ConflictError(
        `The mosaic holds at most ${LIMITS.MAX_QSR_FRANCHISE_TRUST_STATS} stat tiles`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextStatOrder(client));
    const created = await repo.createStat({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.QSR_FRANCHISE_TRUST_STAT_CREATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: created.id,
        newValues: { label: created.label, value: created.value },
      },
      context,
      client,
    );

    return created;
  });

export const updateStat = async (
  id: string,
  patch: UpdateQsrFranchiseTrustStatInput,
  context: RequestContext,
): Promise<QsrFranchiseTrustStat> =>
  withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Stat');

    const updated = await repo.updateStat(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Stat');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.QSR_FRANCHISE_TRUST_STAT_UPDATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, value: existing.value },
        newValues: { label: updated.label, value: updated.value },
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
): Promise<QsrFranchiseTrustStat> => updateStat(id, { status }, context);

export const reorderStats = async (
  ids: string[],
  context: RequestContext,
): Promise<QsrFranchiseTrustStat[]> =>
  withTransaction(async (client) => {
    const total = await repo.countStats(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every stat', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingStatIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a stat that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyStatOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.QSR_FRANCHISE_TRUST_STATS_REORDERED,
        module: MODULE,
        entityType: STAT_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllStats(
      {},
      { page: 1, limit: LIMITS.MAX_QSR_FRANCHISE_TRUST_STATS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeStat = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Stat');

    await repo.removeStat(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.QSR_FRANCHISE_TRUST_STAT_DELETED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, value: existing.value },
      },
      context,
      client,
    );
  });
};

// ── the photographs ───────────────────────────────────────────────────────

const toResolvedPanel = async (
  panel: QsrFranchiseTrustPanel,
): Promise<ResolvedQsrFranchiseTrustPanel> => {
  const [smallImage, tallImage] = await Promise.all([
    resolveSource(panel.smallImageUrl, panel.smallImageFileId),
    resolveSource(panel.tallImageUrl, panel.tallImageFileId),
  ]);
  return { ...panel, smallImage, tallImage };
};

/** Null when the panel has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<ResolvedQsrFranchiseTrustPanel | null> => {
  const panel = await repo.findPanel();
  return panel ? toResolvedPanel(panel) : null;
};

export const upsertPanel = async (
  input: UpsertQsrFranchiseTrustPanelInput,
  context: RequestContext,
): Promise<ResolvedQsrFranchiseTrustPanel> => {
  if (input.smallImageFileId) {
    await assertUsableImageFile(
      input.smallImageFileId,
      'qsrFranchiseTrustPhoto',
      'Small photo',
      'smallImageFileId',
    );
  }
  if (input.tallImageFileId) {
    await assertUsableImageFile(
      input.tallImageFileId,
      'qsrFranchiseTrustPhoto',
      'Tall photo',
      'tallImageFileId',
    );
  }

  return withTransaction(async (client) => {
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.QSR_FRANCHISE_TRUST_PANEL_UPDATED,
        module: MODULE,
        entityType: PANEL_ENTITY,
        entityId: saved.id,
        newValues: {
          smallImage: saved.smallImageFileId ?? saved.smallImageUrl,
          tallImage: saved.tallImageFileId ?? saved.tallImageUrl,
        },
      },
      context,
      client,
    );

    return toResolvedPanel(saved);
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy, the logos, the stats and the
 * photographs.
 *
 * Null when the copy is missing, or when neither list has anything to show -
 * the page then keeps the section it ships. One empty list is allowed.
 *
 * A logo whose file has been deleted is dropped rather than published with a
 * null source; a photograph whose file has gone is null, and the site keeps
 * its own in that place.
 */
export const getPublished = async (): Promise<PublicQsrFranchiseTrustSection | null> => {
  const [copy, logos, stats, panel] = await Promise.all([
    sectionCopyService.get('qsr-franchise', 'trust'),
    repo.findPublishedLogos(),
    repo.findPublishedStats(),
    repo.findPanel(),
  ]);
  if (!copy) return null;

  const resolvedLogos = (await Promise.all(logos.map(toResolvedLogo)))
    .filter(
      (logo): logo is ResolvedQsrFranchiseTrustLogo & { image: string } => logo.image !== null,
    )
    .map((logo) => ({ image: logo.image, alt: logo.alt }));

  if (resolvedLogos.length === 0 && stats.length === 0) return null;

  const resolvedPanel = panel ? await toResolvedPanel(panel) : null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    logos: resolvedLogos,
    stats: stats.map((stat) => ({
      value: stat.value,
      label: stat.label,
      description: stat.description,
      icon: stat.icon,
    })),
    smallImage: resolvedPanel?.smallImage ?? null,
    tallImage: resolvedPanel?.tallImage ?? null,
  };
};
