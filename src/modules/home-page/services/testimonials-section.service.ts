// src/modules/home-page/services/testimonials-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { env } from '../../../config/env';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import { getStorageProvider } from '../../../storage/storage.factory';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../files/repositories/file.repository';
import * as testimonialsRepository from '../repositories/testimonials-section.repository';
import * as sectionCopyService from './section-copy.service';
import { checkImageDimensions } from '../utils/image-spec';
import { readImageDimensions } from '../utils/image-dimensions';
import {
  CreateTestimonialEntryInput,
  PublicTestimonialsSection,
  ResolvedTestimonialEntry,
  TestimonialEntry,
  TestimonialEntryFilters,
  UpdateTestimonialEntryInput,
} from '../types/testimonials-section.types';

const MODULE = 'home_page';
const ENTITY = 'home_testimonial_entry';

/** Only images belong in the card's <img>; a PDF there is a broken card. */
const IMAGE_MIME_PREFIX = 'image/';
/** Only video belongs in the modal's <video>; an image there is a blank player. */
const VIDEO_MIME_PREFIX = 'video/';

/**
 * Turns a url/fileId pair into the one URL to render.
 *
 * A soft-deleted or purged asset resolves to null rather than failing the
 * request: a card that lost its poster is dropped from the public read, and
 * one that lost its clip simply loses its play button.
 */
const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (
  entry: TestimonialEntry,
): Promise<ResolvedTestimonialEntry> => ({
  ...entry,
  poster: await resolveSource(entry.posterUrl, entry.posterFileId),
  video: await resolveSource(entry.videoUrl, entry.videoFileId),
});

const toResolvedMany = (
  entries: TestimonialEntry[],
): Promise<ResolvedTestimonialEntry[]> => Promise.all(entries.map(toResolved));

/**
 * Rejects a file id that is not a live image of the right size.
 *
 * No ratio check: the card is cropped to 1:1 or 2:1 depending on where the
 * marquee puts it, which the author does not control - see the spec registry.
 */
const assertUsablePosterFile = async (fileId: string): Promise<void> => {
  const field = 'posterFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Poster file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Poster must be an image', [
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

  const problem = checkImageDimensions('testimonialPoster', dimensions);
  if (problem) {
    throw new ValidationError('Poster is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

/**
 * Rejects a file id that is not a live video.
 *
 * There is no dimension check here, unlike the poster: a video's useful
 * properties - codec, duration, bitrate - are not readable from a header the
 * way width and height are, and guessing at them would mean either a decoder
 * dependency or a rule that rejects valid files. The MIME allowlist on upload
 * already limits this to the two formats browsers play. Same reasoning as the
 * industries section's clip.
 */
const assertUsableVideoFile = async (fileId: string): Promise<void> => {
  const field = 'videoFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Video file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(VIDEO_MIME_PREFIX)) {
    throw new ValidationError('The file must be a video', [
      {
        field,
        message: `Expected an MP4 or WebM video, got ${file.mimeType}`,
        code: 'INVALID_FILE_TYPE',
      },
    ]);
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: TestimonialEntryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedTestimonialEntry[]; meta: PaginationMeta }> => {
  const { rows, total } = await testimonialsRepository.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedTestimonialEntry> => {
  const entry = await testimonialsRepository.findById(id);
  if (!entry) throw new NotFoundError('Testimonial');
  return toResolved(entry);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Folds the rows back into the one block the site renders: the copy comes from
 * the first active card, and the marquee is every active card whose poster
 * still resolves. Null rather than an empty section, so "nothing published"
 * stays distinguishable from "a section with empty fields", which would render
 * as a heading beside an empty rail.
 */
export const getPublished = async (): Promise<PublicTestimonialsSection | null> => {
  const entries = await testimonialsRepository.findPublished();
  if (entries.length === 0) return null;

  /*
   * The section's copy lives in home_section_copy, not on these rows, so a
   * section with entries but no copy authored yet has nothing to head them
   * with - which reads as "not published" rather than as a bare list.
   */
  const copy = await sectionCopyService.get('home', 'testimonials');
  if (!copy) return null;

  const resolved = await toResolvedMany(entries);

  const cards = resolved.flatMap((entry) =>
    entry.poster
      ? [
          {
            poster: entry.poster,
            video: entry.video,
            quote: entry.quote,
            clientName: entry.clientName,
            clientPosition: entry.clientPosition,
          },
        ]
      : [],
  );

  // A heading beside an empty rail is a worse page than the built-in marquee.
  if (cards.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    cards,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateTestimonialEntryInput,
  context: RequestContext,
): Promise<ResolvedTestimonialEntry> => {
  if (input.posterFileId) await assertUsablePosterFile(input.posterFileId);
  if (input.videoFileId) await assertUsableVideoFile(input.videoFileId);

  const entry = await withTransaction(async (client) => {
    const existing = await testimonialsRepository.countAll(client);
    if (existing >= LIMITS.MAX_TESTIMONIAL_ENTRIES) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_TESTIMONIAL_ENTRIES} testimonials. Delete or deactivate one first.`,
      );
    }

    const displayOrder =
      input.displayOrder ?? (await testimonialsRepository.nextDisplayOrder(client));
    const created = await testimonialsRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_TESTIMONIAL_ENTRY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { clientName: created.clientName, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(entry);
};

export const update = async (
  id: string,
  patch: UpdateTestimonialEntryInput,
  context: RequestContext,
): Promise<ResolvedTestimonialEntry> => {
  if (patch.posterFileId) await assertUsablePosterFile(patch.posterFileId);
  if (patch.videoFileId) await assertUsableVideoFile(patch.videoFileId);

  const entry = await withTransaction(async (client) => {
    const existing = await testimonialsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Testimonial');

    const updated = await testimonialsRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Testimonial');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_TESTIMONIAL_ENTRY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { clientName: existing.clientName, status: existing.status },
        newValues: { clientName: updated.clientName, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(entry);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedTestimonialEntry> => {
  const entry = await withTransaction(async (client) => {
    const existing = await testimonialsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Testimonial');

    const updated = await testimonialsRepository.updateStatus(
      id,
      status,
      context.adminId,
      client,
    );
    if (!updated) throw new NotFoundError('Testimonial');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_TESTIMONIAL_ENTRY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(entry);
};

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates, which
 * a "move card X to position N" endpoint can when two admins drag at once.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedTestimonialEntry[]> => {
  const entries = await withTransaction(async (client) => {
    const total = await testimonialsRepository.countAll(client);
    const existingIds = await testimonialsRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more testimonials do not exist', [
        {
          field: 'ids',
          message: `Unknown testimonial ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_TESTIMONIAL_ENTRY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every testimonial', [
        {
          field: 'ids',
          message: `Expected all ${total} testimonial ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await testimonialsRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_TESTIMONIAL_ENTRIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return testimonialsRepository.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_TESTIMONIAL_ENTRIES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(entries.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await testimonialsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Testimonial');

    await testimonialsRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_TESTIMONIAL_ENTRY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { clientName: existing.clientName },
      },
      context,
      client,
    );
  });
};
