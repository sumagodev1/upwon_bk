// src/modules/product-pages/erp-page/services/cta-section.service.ts

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
import * as ctaRepository from '../repositories/cta-section.repository';
import {
  ErpCtaSection,
  PublicErpCtaSection,
  ResolvedErpCtaSection,
  UpsertErpCtaSectionInput,
} from '../types/cta-section.types';

const MODULE = 'erp_page';
const ENTITY = 'erp_cta_section';

/** Only images belong behind the band; a PDF in a CSS url() renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

/**
 * Turns a url/fileId pair into the one URL to render.
 *
 * A soft-deleted or purged asset resolves to null rather than failing the
 * request: the band then falls back to the artwork the site ships.
 */
const resolveImage = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (section: ErpCtaSection): Promise<ResolvedErpCtaSection> => ({
  ...section,
  desktopImage: await resolveImage(section.desktopImageUrl, section.desktopImageFileId),
  mobileImage: await resolveImage(section.mobileImageUrl, section.mobileImageFileId),
});

/** Rejects a file id that is not a live image of the right shape for a slot. */
const assertUsableImageFile = async (
  fileId: string,
  slot: ImageSlot,
  field: string,
): Promise<void> => {
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Background must be an image', [
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
    throw new ValidationError('Background is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

/** The panel's read. Null when the band has never been authored. */
export const get = async (): Promise<ResolvedErpCtaSection | null> => {
  const section = await ctaRepository.find();
  return section ? toResolved(section) : null;
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy that heads the band and the band itself. With
 * either missing the site keeps what it ships, which is a complete working
 * section - better than a heading over no button, or a button under no words.
 */
export const getPublished = async (): Promise<PublicErpCtaSection | null> => {
  const [copy, section] = await Promise.all([
    sectionCopyService.get('erp', 'cta'),
    ctaRepository.find(),
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
    buttonLabel: resolved.buttonLabel,
    buttonHref: resolved.buttonHref,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const upsert = async (
  input: UpsertErpCtaSectionInput,
  context: RequestContext,
): Promise<ResolvedErpCtaSection> => {
  if (input.desktopImageFileId) {
    await assertUsableImageFile(input.desktopImageFileId, 'erpCtaDesktop', 'desktopImageFileId');
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(input.mobileImageFileId, 'erpCtaMobile', 'mobileImageFileId');
  }

  const section = await withTransaction(async (client) => {
    const existing = await ctaRepository.find(client);
    const saved = await ctaRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_CTA_SECTION_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: saved.id,
        oldValues: existing
          ? { buttonLabel: existing.buttonLabel, buttonHref: existing.buttonHref }
          : undefined,
        newValues: { buttonLabel: saved.buttonLabel, buttonHref: saved.buttonHref },
      },
      context,
      client,
    );

    return saved;
  });

  return toResolved(section);
};
