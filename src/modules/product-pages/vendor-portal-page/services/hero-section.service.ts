// src/modules/product-pages/vendor-portal-page/services/hero-section.service.ts

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
import { parseHeading } from '../../../home-page/utils/heading-markup';
import { checkImageDimensions } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as heroRepository from '../repositories/hero-section.repository';
import {
  CreateVmsHeroSlideInput,
  VmsHeroSlide,
  VmsHeroSlideFilters,
  PublicVmsHeroSlide,
  ResolvedVmsHeroSlide,
  UpdateVmsHeroSlideInput,
} from '../types/hero-section.types';

const MODULE = 'vendor_portal_page';
const ENTITY = 'vms_hero_slide';

/** Only images belong behind a slide; a PDF in a background renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the slide resolves without that background
  // rather than failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (slide: VmsHeroSlide): Promise<ResolvedVmsHeroSlide> => ({
  ...slide,
  headlineLines: parseHeading(slide.headline),
  image: await resolveSource(slide.imageUrl, slide.imageFileId),
  mobileImage: await resolveSource(slide.mobileImageUrl, slide.mobileImageFileId),
});

const toResolvedMany = (slides: VmsHeroSlide[]): Promise<ResolvedVmsHeroSlide[]> =>
  Promise.all(slides.map(toResolved));

/**
 * Rejects a file id that is not a live image of the right shape.
 *
 * The slider covers its box with the background, so a wrong ratio is silently
 * cropped - which is why the ratio check applies here.
 */
const assertUsableImageFile = async (
  fileId: string,
  slot: 'vmsHero' | 'vmsHeroMobile' = 'vmsHero',
  field: 'imageFileId' | 'mobileImageFileId' = 'imageFileId',
): Promise<void> => {
  // Names the slot in the message, so an editor who filled in the mobile box
  // is not told their desktop background is wrong.
  const what = slot === 'vmsHeroMobile' ? 'Mobile image' : 'Slide background';
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

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: VmsHeroSlideFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedVmsHeroSlide[]; meta: PaginationMeta }> => {
  const { rows, total } = await heroRepository.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedVmsHeroSlide> => {
  const slide = await heroRepository.findById(id);
  if (!slide) throw new NotFoundError('Vendor Portal hero slide');
  return toResolved(slide);
};

/**
 * The website-facing read: every active slide, in order.
 *
 * An empty array rather than null when nothing is published - the site treats
 * an empty list as "keep the built-in slides", the same as an unreachable API.
 */
export const getPublished = async (): Promise<PublicVmsHeroSlide[]> => {
  const slides = await heroRepository.findPublished();
  const resolved = await toResolvedMany(slides);

  return resolved.map((slide) => ({
    eyebrow: slide.eyebrow,
    headline: slide.headline,
    headlineLines: slide.headlineLines,
    subhead: slide.subhead,
    microTrust: slide.microTrust,
    cta: slide.cta,
    secondaryCta: slide.secondaryCta,
    image: slide.image,
    // Null means the phone shows the desktop image, as every slide does today.
    mobileImage: slide.mobileImage,
  }));
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateVmsHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedVmsHeroSlide> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);
  if (input.mobileImageFileId) {
    await assertUsableImageFile(input.mobileImageFileId, 'vmsHeroMobile', 'mobileImageFileId');
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.countAll(client);
    if (existing >= LIMITS.MAX_VMS_HERO_SLIDES) {
      throw new ConflictError(
        `The slider holds at most ${LIMITS.MAX_VMS_HERO_SLIDES} slides. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await heroRepository.nextDisplayOrder(client));
    const created = await heroRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_HERO_SLIDE_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { eyebrow: created.eyebrow, status: created.status },
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
  patch: UpdateVmsHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedVmsHeroSlide> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);
  if (patch.mobileImageFileId) {
    await assertUsableImageFile(patch.mobileImageFileId, 'vmsHeroMobile', 'mobileImageFileId');
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Vendor Portal hero slide');

    const updated = await heroRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Vendor Portal hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_HERO_SLIDE_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { eyebrow: existing.eyebrow, status: existing.status },
        newValues: { eyebrow: updated.eyebrow, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(slide);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedVmsHeroSlide> => {
  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Vendor Portal hero slide');

    const updated = await heroRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Vendor Portal hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_HERO_SLIDE_UPDATED,
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
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedVmsHeroSlide[]> => {
  const slides = await withTransaction(async (client) => {
    const total = await heroRepository.countAll(client);
    const existingIds = await heroRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more slides do not exist', [
        {
          field: 'ids',
          message: `Unknown slide ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_VMS_HERO_SLIDE',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every slide', [
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
        action: AUDIT_ACTIONS.VMS_HERO_SLIDES_REORDERED,
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
      { page: 1, limit: LIMITS.MAX_VMS_HERO_SLIDES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(slides.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Vendor Portal hero slide');

    await heroRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_HERO_SLIDE_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { eyebrow: existing.eyebrow },
      },
      context,
      client,
    );
  });
};
