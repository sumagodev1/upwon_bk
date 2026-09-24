// src/modules/product-pages/fms-page/services/proof-section.service.ts

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
import * as repo from '../repositories/proof-section.repository';
import {
  CreateFmsProofLogoInput,
  CreateFmsProofStatInput,
  FmsProofLogo,
  FmsProofLogoFilters,
  FmsProofStat,
  FmsProofStatFilters,
  PublicFmsProofSection,
  ResolvedFmsProofLogo,
  UpdateFmsProofLogoInput,
  UpdateFmsProofStatInput,
} from '../types/proof-section.types';

const MODULE = 'fms_page';
const LOGO_ENTITY = 'fms_proof_logo';
const STAT_ENTITY = 'fms_proof_stat';

/** Only images belong in the wall; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

/*
 * The marks are checked against the home page's trust-strip slot rather than a
 * slot of their own: the same brand logos, drawn the same way - object-contain
 * at a fixed height - so the rule that fits one fits the other, and a second
 * copy of it would only be a second thing to keep in step.
 */
const LOGO_SLOT = 'trustLogo' as const;

// ── the brand wall ────────────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the wall skips that mark rather than failing
  // the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedLogo = async (logo: FmsProofLogo): Promise<ResolvedFmsProofLogo> => ({
  ...logo,
  image: await resolveSource(logo.imageUrl, logo.imageFileId),
});

/** Rejects a file id that is not a live image of the right shape for the slot. */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const field = 'imageFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Logo must be an image', [
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

  const problem = checkImageDimensions(LOGO_SLOT, dimensions);
  if (problem) {
    throw new ValidationError('Logo is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

export const listLogos = async (
  filters: FmsProofLogoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedFmsProofLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllLogos(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedLogo)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getLogoById = async (id: string): Promise<ResolvedFmsProofLogo> => {
  const logo = await repo.findLogoById(id);
  if (!logo) throw new NotFoundError('Logo');
  return toResolvedLogo(logo);
};

export const createLogo = async (
  input: CreateFmsProofLogoInput,
  context: RequestContext,
): Promise<ResolvedFmsProofLogo> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countLogos(client);
    if (existing >= LIMITS.MAX_FMS_PROOF_LOGOS) {
      throw new ConflictError(`The wall holds at most ${LIMITS.MAX_FMS_PROOF_LOGOS} logos`);
    }

    const displayOrder = input.displayOrder ?? (await repo.nextLogoOrder(client));
    const created = await repo.createLogo({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_PROOF_LOGO_CREATED,
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
  patch: UpdateFmsProofLogoInput,
  context: RequestContext,
): Promise<ResolvedFmsProofLogo> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    const updated = await repo.updateLogo(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_PROOF_LOGO_UPDATED,
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
): Promise<ResolvedFmsProofLogo> => updateLogo(id, { status }, context);

export const reorderLogos = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedFmsProofLogo[]> =>
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
        action: AUDIT_ACTIONS.FMS_PROOF_LOGOS_REORDERED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllLogos(
      {},
      { page: 1, limit: LIMITS.MAX_FMS_PROOF_LOGOS, offset: 0 },
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
        action: AUDIT_ACTIONS.FMS_PROOF_LOGO_DELETED,
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

// ── the numbers ───────────────────────────────────────────────────────────

export const listStats = async (
  filters: FmsProofStatFilters,
  pagination: PaginationParams,
): Promise<{ rows: FmsProofStat[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllStats(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getStatById = async (id: string): Promise<FmsProofStat> => {
  const stat = await repo.findStatById(id);
  if (!stat) throw new NotFoundError('Statistic');
  return stat;
};

export const createStat = async (
  input: CreateFmsProofStatInput,
  context: RequestContext,
): Promise<FmsProofStat> =>
  withTransaction(async (client) => {
    const existing = await repo.countStats(client);
    if (existing >= LIMITS.MAX_FMS_PROOF_STATS) {
      throw new ConflictError(
        `The panel holds at most ${LIMITS.MAX_FMS_PROOF_STATS} figures - it is a two-by-two grid`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextStatOrder(client));
    const created = await repo.createStat({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_PROOF_STAT_CREATED,
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
  patch: UpdateFmsProofStatInput,
  context: RequestContext,
): Promise<FmsProofStat> =>
  withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Statistic');

    const updated = await repo.updateStat(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Statistic');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_PROOF_STAT_UPDATED,
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
): Promise<FmsProofStat> => updateStat(id, { status }, context);

export const reorderStats = async (
  ids: string[],
  context: RequestContext,
): Promise<FmsProofStat[]> =>
  withTransaction(async (client) => {
    const total = await repo.countStats(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every figure', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingStatIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a figure that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyStatOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_PROOF_STATS_REORDERED,
        module: MODULE,
        entityType: STAT_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllStats(
      {},
      { page: 1, limit: LIMITS.MAX_FMS_PROOF_STATS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeStat = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Statistic');

    await repo.removeStat(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_PROOF_STAT_DELETED,
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

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy, the brand wall, and the numbers.
 *
 * Null when the copy is missing, or when neither panel has anything to show -
 * the page then keeps the strip it ships, which is a complete working one. One
 * empty panel is allowed: logos with no figures, or figures with no logos, is
 * still a section worth rendering.
 *
 * A logo whose file has been deleted is dropped rather than published with a
 * null source, which would render a broken image in the wall.
 */
export const getPublished = async (): Promise<PublicFmsProofSection | null> => {
  const [copy, logos, stats] = await Promise.all([
    sectionCopyService.get('fms', 'proof'),
    repo.findPublishedLogos(),
    repo.findPublishedStats(),
  ]);
  if (!copy) return null;

  const resolvedLogos = (await Promise.all(logos.map(toResolvedLogo)))
    .filter((logo): logo is ResolvedFmsProofLogo & { image: string } => logo.image !== null)
    .map((logo) => ({ image: logo.image, alt: logo.alt }));

  if (resolvedLogos.length === 0 && stats.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    logos: resolvedLogos,
    stats: stats.map((stat) => ({
      icon: stat.icon,
      label: stat.label,
      subtext: stat.subtext,
      value: stat.value,
      accentColor: stat.accentColor,
    })),
  };
};
