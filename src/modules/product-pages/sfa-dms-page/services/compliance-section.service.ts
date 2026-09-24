// src/modules/product-pages/sfa-dms-page/services/compliance-section.service.ts

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
import * as integrationsService from '../../../home-page/services/integrations-section.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import { checkImageDimensions } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as repo from '../repositories/compliance-section.repository';
import {
  CreateSfaComplianceBadgeInput,
  PublicSfaComplianceSection,
  ResolvedSfaComplianceSection,
  SfaComplianceBadge,
  SfaComplianceBadgeFilters,
  SfaComplianceSection,
  UpdateSfaComplianceBadgeInput,
  UpsertSfaComplianceSectionInput,
} from '../types/compliance-section.types';

const MODULE = 'sfa_dms_page';
const SECTION_ENTITY = 'sfa_compliance_section';
const BADGE_ENTITY = 'sfa_compliance_badge';

/** Only images belong behind the panel; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

// ── the two panel headers ─────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the panel renders on its cream ground rather
  // than failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (
  section: SfaComplianceSection,
): Promise<ResolvedSfaComplianceSection> => ({
  ...section,
  backgroundImage: await resolveSource(
    section.backgroundImageUrl,
    section.backgroundImageFileId,
  ),
});

/** Rejects a file id that is not a live image of the right shape for the panel. */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const field = 'backgroundImageFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Panel artwork must be an image', [
      {
        field,
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
        field,
        message: `${file.originalName} is not a readable PNG, JPEG, GIF or WebP image`,
        code: 'UNREADABLE_IMAGE',
      },
    ]);
  }

  const problem = checkImageDimensions('sfaComplianceBackground', dimensions);
  if (problem) {
    throw new ValidationError('Panel artwork is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

/** Null when the panels have never been configured - a normal first-run state. */
export const getSection = async (): Promise<ResolvedSfaComplianceSection | null> => {
  const section = await repo.findSection();
  return section ? toResolved(section) : null;
};

export const upsertSection = async (
  input: UpsertSfaComplianceSectionInput,
  context: RequestContext,
): Promise<ResolvedSfaComplianceSection> => {
  if (input.backgroundImageFileId) await assertUsableImageFile(input.backgroundImageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findSection(client);
    const saved = await repo.upsertSection(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_COMPLIANCE_SECTION_UPDATED,
        module: MODULE,
        entityType: SECTION_ENTITY,
        entityId: saved.id,
        oldValues: existing ? { complianceLabel: existing.complianceLabel } : undefined,
        newValues: { complianceLabel: saved.complianceLabel },
      },
      context,
      client,
    );

    return toResolved(saved);
  });
};

// ── the badges ────────────────────────────────────────────────────────────

export const listBadges = async (
  filters: SfaComplianceBadgeFilters,
  pagination: PaginationParams,
): Promise<{ rows: SfaComplianceBadge[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllBadges(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getBadgeById = async (id: string): Promise<SfaComplianceBadge> => {
  const badge = await repo.findBadgeById(id);
  if (!badge) throw new NotFoundError('Badge');
  return badge;
};

export const createBadge = async (
  input: CreateSfaComplianceBadgeInput,
  context: RequestContext,
): Promise<SfaComplianceBadge> =>
  withTransaction(async (client) => {
    const existing = await repo.countBadges(client);
    if (existing >= LIMITS.MAX_SFA_COMPLIANCE_BADGES) {
      throw new ConflictError(
        `The panel holds at most ${LIMITS.MAX_SFA_COMPLIANCE_BADGES} badges - they run down one column beside the sphere`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextBadgeOrder(client));
    const created = await repo.createBadge({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_COMPLIANCE_BADGE_CREATED,
        module: MODULE,
        entityType: BADGE_ENTITY,
        entityId: created.id,
        newValues: { title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateBadge = async (
  id: string,
  patch: UpdateSfaComplianceBadgeInput,
  context: RequestContext,
): Promise<SfaComplianceBadge> =>
  withTransaction(async (client) => {
    const existing = await repo.findBadgeByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Badge');

    const updated = await repo.updateBadge(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Badge');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_COMPLIANCE_BADGE_UPDATED,
        module: MODULE,
        entityType: BADGE_ENTITY,
        entityId: id,
        oldValues: { title: existing.title, status: existing.status },
        newValues: { title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setBadgeStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<SfaComplianceBadge> => updateBadge(id, { status }, context);

export const reorderBadges = async (
  ids: string[],
  context: RequestContext,
): Promise<SfaComplianceBadge[]> =>
  withTransaction(async (client) => {
    const total = await repo.countBadges(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every badge', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingBadgeIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a badge that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyBadgeOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_COMPLIANCE_BADGES_REORDERED,
        module: MODULE,
        entityType: BADGE_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllBadges(
      {},
      { page: 1, limit: LIMITS.MAX_SFA_COMPLIANCE_BADGES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeBadge = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findBadgeByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Badge');

    await repo.removeBadge(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_COMPLIANCE_BADGE_DELETED,
        module: MODULE,
        entityType: BADGE_ENTITY,
        entityId: id,
        oldValues: { title: existing.title },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy, both panel headers, the badges, and
 * the sphere's logos.
 *
 * The logos come from the home page's integrations module rather than a list
 * of this section's own - the same partners, saying the same thing - so adding
 * one is a single edit that every page showing the sphere picks up.
 *
 * Null when the copy or the panel record is missing, or when neither panel has
 * anything to show: the page then keeps the section it ships, which is a
 * complete working one. One empty panel is allowed, because badges with no
 * sphere, or a sphere with no badges, is still a section worth rendering.
 */
export const getPublished = async (): Promise<PublicSfaComplianceSection | null> => {
  const [copy, section, badges, sphere] = await Promise.all([
    sectionCopyService.get('sfa-dms', 'establishers'),
    repo.findSection(),
    repo.findPublishedBadges(),
    integrationsService.getPublishedLogos(),
  ]);
  if (!copy || !section) return null;
  if (badges.length === 0 && sphere.logos.length === 0) return null;

  const resolved = await toResolved(section);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    compliance: {
      label: resolved.complianceLabel,
      icon: resolved.complianceIcon,
      backgroundImage: resolved.backgroundImage,
    },
    ecosystem: {
      label: resolved.ecosystemLabel,
      icon: resolved.ecosystemIcon,
      color: resolved.ecosystemColor,
    },
    badges: badges.map((badge) => ({
      icon: badge.icon,
      title: badge.title,
      subtext: badge.subtext,
    })),
    logos: sphere.logos,
    centreLogo: sphere.centreLogo,
  };
};
