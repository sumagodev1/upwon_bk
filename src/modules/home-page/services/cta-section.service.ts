// src/modules/home-page/services/cta-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { env } from '../../../config/env';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import { getStorageProvider } from '../../../storage/storage.factory';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../files/repositories/file.repository';
import * as ctaRepository from '../repositories/cta-section.repository';
import * as sectionCopyService from './section-copy.service';
import { checkImageDimensions, ImageSlot } from '../utils/image-spec';
import { readImageDimensions } from '../utils/image-dimensions';
import {
  CtaSection,
  PublicCtaSection,
  ResolvedCtaSection,
  UpsertCtaSectionInput,
} from '../types/cta-section.types';

const MODULE = 'home_page';
const ENTITY = 'home_cta_section';

/** Only images belong behind the band; a PDF in a CSS url() renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';
/** The report is handed to a visitor as a download, so it has to be a PDF. */
const REPORT_MIME_TYPE = 'application/pdf';

const publicFileUrl = (id: string): string => `${env.publicApiBaseUrl}/public/files/${id}`;

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
  return publicFileUrl(file.id);
};

const toResolved = async (section: CtaSection): Promise<ResolvedCtaSection> => {
  const report = section.reportFileId
    ? await fileRepository.findById(section.reportFileId)
    : null;

  return {
    ...section,
    desktopImage: await resolveImage(section.desktopImageUrl, section.desktopImageFileId),
    mobileImage: await resolveImage(section.mobileImageUrl, section.mobileImageFileId),
    /*
     * ?download is baked in here rather than left to the caller. The site and
     * this API are different origins, so an <a download> on the button would
     * be ignored and the PDF would open in a viewer instead of saving - the
     * server has to be the one to say "attachment".
     */
    reportUrl: report ? `${publicFileUrl(report.id)}?download` : null,
    reportFileName: report?.originalName ?? null,
    reportSizeBytes: report?.sizeBytes ?? null,
  };
};

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

/**
 * Rejects a file id that is not a live PDF.
 *
 * Exact type rather than a prefix, unlike the image and video slots: the
 * button hands this straight to a visitor as a download, and the public file
 * route only serves application/pdf out of the application/* family. Anything
 * else would upload fine and then 404 when someone clicked the button.
 */
const assertUsableReportFile = async (fileId: string): Promise<void> => {
  const field = 'reportFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Report file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (file.mimeType !== REPORT_MIME_TYPE) {
    throw new ValidationError('The report must be a PDF', [
      { field, message: `Expected a PDF, got ${file.mimeType}`, code: 'INVALID_FILE_TYPE' },
    ]);
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

/** The panel's read. Null when the band has never been authored. */
export const get = async (): Promise<ResolvedCtaSection | null> => {
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
export const getPublished = async (): Promise<PublicCtaSection | null> => {
  const [copy, section] = await Promise.all([sectionCopyService.get('home', 'cta'), ctaRepository.find()]);
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
    reportUrl: resolved.reportUrl,
    reportFileName: resolved.reportFileName,
    reportSizeBytes: resolved.reportSizeBytes,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const upsert = async (
  input: UpsertCtaSectionInput,
  context: RequestContext,
): Promise<ResolvedCtaSection> => {
  if (input.desktopImageFileId) {
    await assertUsableImageFile(input.desktopImageFileId, 'ctaDesktop', 'desktopImageFileId');
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(input.mobileImageFileId, 'ctaMobile', 'mobileImageFileId');
  }
  if (input.reportFileId) await assertUsableReportFile(input.reportFileId);

  const section = await withTransaction(async (client) => {
    const existing = await ctaRepository.find(client);
    const saved = await ctaRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_CTA_SECTION_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: saved.id,
        oldValues: existing
          ? { buttonLabel: existing.buttonLabel, reportFileId: existing.reportFileId }
          : undefined,
        newValues: { buttonLabel: saved.buttonLabel, reportFileId: saved.reportFileId },
      },
      context,
      client,
    );

    return saved;
  });

  return toResolved(section);
};
