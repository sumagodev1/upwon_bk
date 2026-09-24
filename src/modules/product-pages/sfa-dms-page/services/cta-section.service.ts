// src/modules/product-pages/sfa-dms-page/services/cta-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS } from '../../../../config/constants';
import { env } from '../../../../config/env';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { RequestContext } from '../../../../core/types/common.types';
import { getStorageProvider } from '../../../../storage/storage.factory';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../../files/repositories/file.repository';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import { checkImageDimensions, ImageSlot } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as repo from '../repositories/cta-section.repository';
import {
  PublicSfaCtaSection,
  ResolvedSfaCtaSection,
  SfaCtaSection,
  UpsertSfaCtaSectionInput,
} from '../types/cta-section.types';

const MODULE = 'sfa_dms_page';
const ENTITY = 'sfa_cta_section';

/** Only images belong in the band; a PDF behind it renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the band renders without that image rather
  // than failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

/** Rejects a file id that is not a live image of the right shape for a slot. */
const assertUsableImageFile = async (
  fileId: string,
  slot: ImageSlot,
  field: string,
  label: string,
): Promise<void> => {
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError(`${label} must be an image`, [
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
    throw new ValidationError(`${label} is the wrong size`, [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

const toResolved = async (section: SfaCtaSection): Promise<ResolvedSfaCtaSection> => ({
  ...section,
  backgroundImage: await resolveSource(
    section.backgroundImageUrl,
    section.backgroundImageFileId,
  ),
  dashboardImage: await resolveSource(
    section.dashboardImageUrl,
    section.dashboardImageFileId,
  ),
});

/** Null when the band has never been authored - a normal first-run state. */
export const get = async (): Promise<ResolvedSfaCtaSection | null> => {
  const section = await repo.find();
  return section ? toResolved(section) : null;
};

export const upsert = async (
  input: UpsertSfaCtaSectionInput,
  context: RequestContext,
): Promise<ResolvedSfaCtaSection> => {
  if (input.backgroundImageFileId) {
    await assertUsableImageFile(
      input.backgroundImageFileId,
      'sfaCtaBackground',
      'backgroundImageFileId',
      'Band background',
    );
  }
  if (input.dashboardImageFileId) {
    await assertUsableImageFile(
      input.dashboardImageFileId,
      'sfaCtaDashboard',
      'dashboardImageFileId',
      'Dashboard screenshot',
    );
  }

  return withTransaction(async (client) => {
    const existing = await repo.find(client);
    const saved = await repo.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_CTA_SECTION_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: saved.id,
        oldValues: existing ? { buttonLabel: existing.buttonLabel } : undefined,
        newValues: { buttonLabel: saved.buttonLabel },
      },
      context,
      client,
    );

    return toResolved(saved);
  });
};

/**
 * The website-facing read: the copy and the band in one response.
 *
 * Null when the copy or the record is missing - the page then keeps the band it
 * ships, which is a complete working one. The artwork is optional either way:
 * without it the band falls back to its navy ground, which is a design rather
 * than a hole.
 */
export const getPublished = async (): Promise<PublicSfaCtaSection | null> => {
  const [copy, section] = await Promise.all([
    sectionCopyService.get('sfa-dms', 'cta'),
    repo.find(),
  ]);
  if (!copy || !section) return null;

  const resolved = await toResolved(section);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    backgroundImage: resolved.backgroundImage,
    dashboardImage: resolved.dashboardImage,
    dashboardAlt: resolved.dashboardAlt,
    buttonLabel: resolved.buttonLabel,
    buttonHref: resolved.buttonHref,
  };
};
