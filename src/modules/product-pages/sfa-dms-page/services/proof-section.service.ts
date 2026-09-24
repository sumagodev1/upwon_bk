// src/modules/product-pages/sfa-dms-page/services/proof-section.service.ts

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
  CreateSfaProofLogoInput,
  CreateSfaProofStatInput,
  PublicSfaProofSection,
  ResolvedSfaProofLogo,
  SfaProofLogo,
  SfaProofLogoFilters,
  SfaProofPanel,
  SfaProofStat,
  SfaProofStatFilters,
  UpdateSfaProofLogoInput,
  UpdateSfaProofStatInput,
  UpsertSfaProofPanelInput,
} from '../types/proof-section.types';

const MODULE = 'sfa_dms_page';

/** Only images belong in the marquee; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

/*
 * The logos are checked against the home page's trust-strip slot rather than a
 * slot of their own: the same marks, drawn the same way - object-contain at a
 * fixed height - so the rule that fits one fits the other, and a second copy
 * of it would only be a second thing to keep in step.
 */
const LOGO_SLOT = 'trustLogo' as const;

// ── the left card ─────────────────────────────────────────────────────────

/** Null when the card has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<SfaProofPanel | null> => repo.findPanel();

export const upsertPanel = async (
  input: UpsertSfaProofPanelInput,
  context: RequestContext,
): Promise<SfaProofPanel> =>
  withTransaction(async (client) => {
    const existing = await repo.findPanel(client);
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PROOF_PANEL_UPDATED,
        module: MODULE,
        entityType: 'sfa_proof_panel',
        entityId: saved.id,
        oldValues: existing ? { heading: existing.heading } : undefined,
        newValues: { heading: saved.heading },
      },
      context,
      client,
    );

    return saved;
  });

// ── the customer logos ────────────────────────────────────────────────────

const LOGO_ENTITY = 'sfa_proof_logo';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the marquee skips that logo rather than
  // failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedLogo = async (logo: SfaProofLogo): Promise<ResolvedSfaProofLogo> => ({
  ...logo,
  image: await resolveSource(logo.imageUrl, logo.imageFileId),
});

/** Rejects a file id that is not a live image of the right shape for the slot. */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      {
        field: 'imageFileId',
        message: 'No such uploaded file, or it has been deleted',
        code: 'UNKNOWN_FILE',
      },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Logo must be an image', [
      {
        field: 'imageFileId',
        message: `Expected an image, got ${file.mimeType}`,
        code: 'INVALID_FILE_TYPE',
      },
    ]);
  }

  const buffer = await getStorageProvider().getFile(file.storageKey);
  const dimensions = readImageDimensions(buffer);
  if (!dimensions) {
    throw new ValidationError('Image could not be read', [
      {
        field: 'imageFileId',
        message: `${file.originalName} is not a readable PNG, JPEG, GIF or WebP image`,
        code: 'UNREADABLE_IMAGE',
      },
    ]);
  }

  const problem = checkImageDimensions(LOGO_SLOT, dimensions);
  if (problem) {
    throw new ValidationError('Logo is the wrong size', [
      { field: 'imageFileId', message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

export const listLogos = async (
  filters: SfaProofLogoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedSfaProofLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllLogos(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedLogo)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getLogoById = async (id: string): Promise<ResolvedSfaProofLogo> => {
  const logo = await repo.findLogoById(id);
  if (!logo) throw new NotFoundError('Logo');
  return toResolvedLogo(logo);
};

export const createLogo = async (
  input: CreateSfaProofLogoInput,
  context: RequestContext,
): Promise<ResolvedSfaProofLogo> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countLogos(client);
    if (existing >= LIMITS.MAX_SFA_PROOF_LOGOS) {
      throw new ConflictError(
        `The marquee holds at most ${LIMITS.MAX_SFA_PROOF_LOGOS} logos`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextLogoOrder(client));
    const created = await repo.createLogo({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PROOF_LOGO_CREATED,
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
  patch: UpdateSfaProofLogoInput,
  context: RequestContext,
): Promise<ResolvedSfaProofLogo> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    const updated = await repo.updateLogo(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PROOF_LOGO_UPDATED,
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
): Promise<ResolvedSfaProofLogo> => updateLogo(id, { status }, context);

export const reorderLogos = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedSfaProofLogo[]> =>
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
        action: AUDIT_ACTIONS.SFA_PROOF_LOGOS_REORDERED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllLogos(
      {},
      { page: 1, limit: LIMITS.MAX_SFA_PROOF_LOGOS, offset: 0 },
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
        action: AUDIT_ACTIONS.SFA_PROOF_LOGO_DELETED,
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

const STAT_ENTITY = 'sfa_proof_stat';

export const listStats = async (
  filters: SfaProofStatFilters,
  pagination: PaginationParams,
): Promise<{ rows: SfaProofStat[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllStats(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getStatById = async (id: string): Promise<SfaProofStat> => {
  const stat = await repo.findStatById(id);
  if (!stat) throw new NotFoundError('Statistic');
  return stat;
};

export const createStat = async (
  input: CreateSfaProofStatInput,
  context: RequestContext,
): Promise<SfaProofStat> =>
  withTransaction(async (client) => {
    const existing = await repo.countStats(client);
    if (existing >= LIMITS.MAX_SFA_PROOF_STATS) {
      throw new ConflictError(
        `The panel holds at most ${LIMITS.MAX_SFA_PROOF_STATS} figures - it is a two-by-two grid`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextStatOrder(client));
    const created = await repo.createStat({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PROOF_STAT_CREATED,
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
  patch: UpdateSfaProofStatInput,
  context: RequestContext,
): Promise<SfaProofStat> =>
  withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Statistic');

    const updated = await repo.updateStat(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Statistic');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PROOF_STAT_UPDATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: id,
        oldValues: { value: existing.value, label: existing.label },
        newValues: { value: updated.value, label: updated.label },
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
): Promise<SfaProofStat> => updateStat(id, { status }, context);

export const reorderStats = async (
  ids: string[],
  context: RequestContext,
): Promise<SfaProofStat[]> =>
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
        action: AUDIT_ACTIONS.SFA_PROOF_STATS_REORDERED,
        module: MODULE,
        entityType: STAT_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllStats(
      {},
      { page: 1, limit: LIMITS.MAX_SFA_PROOF_STATS, offset: 0 },
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
        action: AUDIT_ACTIONS.SFA_PROOF_STAT_DELETED,
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
 * The whole section in one call: the copy, the card with its logos, and the
 * numbers.
 *
 * Null when the copy is missing, or when neither panel has anything to show -
 * the page then keeps the section it ships, which is a complete working one.
 * One empty panel is allowed: a card with no figures beside it, or figures
 * with no card, is still a section worth rendering.
 *
 * A logo whose file has been deleted is dropped rather than published with a
 * null source, which would render a broken image in the marquee.
 */
export const getPublished = async (): Promise<PublicSfaProofSection | null> => {
  const [copy, panel, logos, stats] = await Promise.all([
    sectionCopyService.get('sfa-dms', 'proof'),
    repo.findPanel(),
    repo.findPublishedLogos(),
    repo.findPublishedStats(),
  ]);
  if (!copy) return null;

  const resolvedLogos = (await Promise.all(logos.map(toResolvedLogo)))
    .filter((logo): logo is ResolvedSfaProofLogo & { image: string } => logo.image !== null)
    .map((logo) => ({ image: logo.image, alt: logo.alt }));

  if (!panel && resolvedLogos.length === 0 && stats.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    panel: panel
      ? {
          heading: panel.heading,
          bodyText: panel.bodyText,
          linkLabel: panel.linkLabel,
          linkHref: panel.linkHref,
          logosLabel: panel.logosLabel,
        }
      : null,
    logos: resolvedLogos,
    stats: stats.map((stat) => ({ value: stat.value, label: stat.label })),
  };
};
