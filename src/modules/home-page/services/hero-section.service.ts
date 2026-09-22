// src/modules/home-page/services/hero-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../files/repositories/file.repository';
import { env } from '../../../config/env';
import { getStorageProvider } from '../../../storage/storage.factory';
import * as heroRepository from '../repositories/hero-section.repository';
import { parseHeading, plainHeading } from '../utils/heading-markup';
import { checkHeroImageDimensions, HeroImageVariant } from '../utils/hero-image-spec';
import { readImageDimensions } from '../utils/image-dimensions';
import {
  CreateHeroSlideInput,
  HeroSlide,
  HeroSlideFilters,
  PublicHeroSlide,
  ResolvedHeroSlide,
  UpdateHeroSlideInput,
} from '../types/hero-section.types';

const MODULE = 'home_page';
const ENTITY = 'home_hero_slide';

/** Only images belong in the hero; a PDF in an <img> is a broken slide. */
const IMAGE_MIME_PREFIX = 'image/';

/**
 * Turns an imageFileId into a URL an anonymous browser can render.
 *
 * Deliberately NOT the storage provider's getPublicUrl. Under LOCAL storage
 * that points at the files module's download route, which requires FILES_READ
 * and responds with Content-Disposition: attachment - so the marketing site,
 * which holds no token, could neither fetch it nor render it in an <img>.
 *
 * The public file route has neither problem: it is unauthenticated, serves
 * inline, and is restricted to uploads that opted in by entity type. It also
 * behaves identically whatever STORAGE_DRIVER is set to, so moving to S3 later
 * does not change the URLs already embedded in the site.
 */
const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: render the slide without an image rather than
  // failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const resolveImage = (slide: HeroSlide): Promise<string | null> =>
  resolveSource(slide.imageUrl, slide.imageFileId);

/** Null here means "no mobile-specific art" - the site falls back to `image`. */
const resolveMobileImage = (slide: HeroSlide): Promise<string | null> =>
  resolveSource(slide.mobileImageUrl, slide.mobileImageFileId);

const toResolved = async (slide: HeroSlide): Promise<ResolvedHeroSlide> => {
  const [image, mobileImage] = await Promise.all([
    resolveImage(slide),
    resolveMobileImage(slide),
  ]);
  return { ...slide, image, mobileImage, headingLines: parseHeading(slide.heading) };
};

const toResolvedMany = (slides: HeroSlide[]): Promise<ResolvedHeroSlide[]> =>
  Promise.all(slides.map(toResolved));

/** Drops the admin-only fields and renames to match the frontend's slide objects. */
const toPublic = (slide: ResolvedHeroSlide): PublicHeroSlide => ({
  eyebrow: slide.eyebrow,
  heading: slide.heading,
  headingLines: slide.headingLines,
  subtext: slide.subtext,
  image: slide.image,
  mobileImage: slide.mobileImage,
  // Falls back to the plain heading so a slide is never announced as an unlabelled
  // image, which is the most common accessibility miss in a CMS-driven hero.
  imageAlt: slide.image ? (slide.imageAlt ?? plainHeading(slide.heading)) : null,
  shine: slide.shine,
});

/**
 * Rejects a file id that does not point at a live image asset of the right
 * shape for the viewport it is destined for.
 *
 * Checked in the service rather than the validator for two reasons: it needs
 * the database (the FK alone would accept a soft-deleted row or a PDF), and the
 * dimension check needs the stored bytes.
 */
const assertUsableImageFile = async (
  fileId: string,
  variant: HeroImageVariant,
  field: string,
): Promise<void> => {
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      {
        field,
        message: 'No such uploaded file, or it has been deleted',
        code: 'UNKNOWN_FILE',
      },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Image file must be an image', [
      { field, message: `Expected an image, got ${file.mimeType}`, code: 'INVALID_FILE_TYPE' },
    ]);
  }

  /*
   * The dimension check reads the blob back. That is one storage round trip per
   * changed image on save - only on create/update, never on a read path - and
   * it is the only way to know what was actually uploaded. The admin panel
   * checks the same rules in the browser before uploading, so reaching a
   * failure here means the client was bypassed.
   */
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

  const problem = checkHeroImageDimensions(variant, dimensions);
  if (problem) {
    throw new ValidationError('Image is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: HeroSlideFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedHeroSlide[]; meta: PaginationMeta }> => {
  const { rows, total } = await heroRepository.findAll(filters, pagination);
  return {
    rows: await toResolvedMany(rows),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getById = async (id: string): Promise<ResolvedHeroSlide> => {
  const slide = await heroRepository.findById(id);
  if (!slide) throw new NotFoundError('Hero slide');
  return toResolved(slide);
};

/** The website-facing read. Returns only ACTIVE slides, already in order. */
export const getPublished = async (): Promise<PublicHeroSlide[]> => {
  const slides = await heroRepository.findPublished();
  const resolved = await toResolvedMany(slides);
  return resolved.map(toPublic);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedHeroSlide> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId, 'desktop', 'imageFileId');
  if (input.mobileImageFileId) {
    await assertUsableImageFile(input.mobileImageFileId, 'mobile', 'mobileImageFileId');
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.countAll(client);
    if (existing >= LIMITS.MAX_HERO_SLIDES) {
      throw new ConflictError(
        `The hero section holds at most ${LIMITS.MAX_HERO_SLIDES} slides. Delete or deactivate one first.`,
        'HERO_SLIDE_LIMIT_REACHED',
      );
    }

    const displayOrder =
      input.displayOrder ?? (await heroRepository.nextDisplayOrder(client));

    const created = await heroRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_HERO_SLIDE_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: {
          eyebrow: created.eyebrow,
          heading: created.heading,
          subtext: created.subtext,
          imageUrl: created.imageUrl,
          imageFileId: created.imageFileId,
          shine: created.shine,
          displayOrder: created.displayOrder,
          status: created.status,
        },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(slide);
};

export const update = async (
  id: string,
  patch: UpdateHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedHeroSlide> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId, 'desktop', 'imageFileId');
  if (patch.mobileImageFileId) {
    await assertUsableImageFile(patch.mobileImageFileId, 'mobile', 'mobileImageFileId');
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Hero slide');

    const updated = await heroRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_HERO_SLIDE_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: {
          eyebrow: existing.eyebrow,
          heading: existing.heading,
          subtext: existing.subtext,
          imageUrl: existing.imageUrl,
          imageFileId: existing.imageFileId,
          imageAlt: existing.imageAlt,
          shine: existing.shine,
          displayOrder: existing.displayOrder,
          status: existing.status,
        },
        newValues: {
          eyebrow: updated.eyebrow,
          heading: updated.heading,
          subtext: updated.subtext,
          imageUrl: updated.imageUrl,
          imageFileId: updated.imageFileId,
          imageAlt: updated.imageAlt,
          shine: updated.shine,
          displayOrder: updated.displayOrder,
          status: updated.status,
        },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(slide);
};

/**
 * Publish / unpublish. Separate from update() so the admin UI's toggle is one
 * call that cannot accidentally carry stale copy from a half-filled edit form,
 * and so the audit trail distinguishes "went live" from "copy was edited".
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedHeroSlide> => {
  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Hero slide');

    // Already in the requested state: return it rather than writing a no-op
    // row plus a misleading audit entry.
    if (existing.status === status) return existing;

    const updated = await heroRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_HERO_SLIDE_STATUS_CHANGED,
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

  return toResolved(slide);
};

/**
 * Takes the complete id list in its new order and rewrites display_order to the
 * array index.
 *
 * Requiring every slide, rather than accepting a partial list, is what makes the
 * result a total order: a partial list would leave the omitted slides at
 * whatever positions they held, silently interleaving them with the new ones.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedHeroSlide[]> => {
  const slides = await withTransaction(async (client) => {
    const total = await heroRepository.countAll(client);
    const existingIds = await heroRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more hero slides do not exist', [
        {
          field: 'ids',
          message: `Unknown hero slide ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_HERO_SLIDE',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every hero slide', [
        {
          field: 'ids',
          message: `Expected all ${total} slide ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await heroRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_HERO_SLIDES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return heroRepository.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_HERO_SLIDES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(slides.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Hero slide');

    await heroRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_HERO_SLIDE_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        // The full row, so deleted copy is recoverable from the audit trail.
        oldValues: {
          eyebrow: existing.eyebrow,
          heading: existing.heading,
          subtext: existing.subtext,
          imageUrl: existing.imageUrl,
          imageFileId: existing.imageFileId,
          imageAlt: existing.imageAlt,
          shine: existing.shine,
          displayOrder: existing.displayOrder,
          status: existing.status,
        },
      },
      context,
      client,
    );
  });
};
