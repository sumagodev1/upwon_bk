// src/modules/industry-pages/spices-agro-page/services/cta-section.service.ts

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
  SpicesAgroCtaSection,
  PublicSpicesAgroCtaSection,
  ResolvedSpicesAgroCtaSection,
  UpsertSpicesAgroCtaSectionInput,
} from '../types/cta-section.types';

const MODULE = 'spices_agro_page';
const ENTITY = 'spices_agro_cta_section';

/** Only images belong in the band; a PDF behind it renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the site keeps its own artwork rather than
  // the whole request failing for one missing file.
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

const toResolved = async (section: SpicesAgroCtaSection): Promise<ResolvedSpicesAgroCtaSection> => ({
  ...section,
  desktopImage: await resolveSource(section.desktopImageUrl, section.desktopImageFileId),
  mobileImage: await resolveSource(section.mobileImageUrl, section.mobileImageFileId),
});

/** Null when the band has never been authored - a normal first-run state. */
export const get = async (): Promise<ResolvedSpicesAgroCtaSection | null> => {
  const section = await repo.find();
  return section ? toResolved(section) : null;
};

export const upsert = async (
  input: UpsertSpicesAgroCtaSectionInput,
  context: RequestContext,
): Promise<ResolvedSpicesAgroCtaSection> => {
  if (input.desktopImageFileId) {
    await assertUsableImageFile(
      input.desktopImageFileId,
      'spicesAgroCtaDesktop',
      'desktopImageFileId',
      'Desktop artwork',
    );
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      'spicesAgroCtaMobile',
      'mobileImageFileId',
      'Mobile artwork',
    );
  }

  return withTransaction(async (client) => {
    const existing = await repo.find(client);
    const saved = await repo.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SPICES_AGRO_CTA_SECTION_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: saved.id,
        oldValues: existing ? { primaryLabel: existing.primaryLabel } : undefined,
        newValues: { primaryLabel: saved.primaryLabel },
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
 * ships, which is a complete working one.
 */
export const getPublished = async (): Promise<PublicSpicesAgroCtaSection | null> => {
  const [copy, section] = await Promise.all([
    sectionCopyService.get('spices-agro', 'cta'),
    repo.find(),
  ]);
  if (!copy || !section) return null;

  const resolved = await toResolved(section);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    desktopImage: resolved.desktopImage,
    mobileImage: resolved.mobileImage,
    primary: { label: resolved.primaryLabel, href: resolved.primaryHref },
    // Both halves or neither, which the table also enforces - so one check here
    // is enough to know the pair is usable.
    secondary:
      resolved.secondaryLabel && resolved.secondaryHref
        ? { label: resolved.secondaryLabel, href: resolved.secondaryHref }
        : null,
  };
};
