// src/modules/insider-page/services/hero-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { plainHeading } from '../../home-page/utils/heading-markup';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as heroRepository from '../repositories/hero-section.repository';
import {
  CreateInsiderHeroSlideInput,
  InsiderHeroSlide,
  InsiderHeroSlideFilters,
  PublicInsiderHeroSlide,
  ResolvedInsiderHeroSlide,
  UpdateInsiderHeroSlideInput,
} from '../types/hero-section.types';
import { INSIDER_IMAGE_SPECS } from '../utils/insider-image-spec';

const MODULE = 'insider_page';
const ENTITY = 'insider_hero_slide';

/*
 * The same rules as the home hero service, applied to the Insider hero's table:
 * the image checks and URL resolution are literally the shared ones from
 * home-page/utils/image-asset, so an image behaves identically on both pages.
 */

const toResolved = async (slide: InsiderHeroSlide): Promise<ResolvedInsiderHeroSlide> => {
  const [image, mobileImage] = await Promise.all([
    resolveImageSource(slide.imageUrl, slide.imageFileId),
    // Null here means "no mobile-specific art" - the site falls back to `image`.
    resolveImageSource(slide.mobileImageUrl, slide.mobileImageFileId),
  ]);
  return { ...slide, image, mobileImage };
};

const toResolvedMany = (slides: InsiderHeroSlide[]): Promise<ResolvedInsiderHeroSlide[]> =>
  Promise.all(slides.map(toResolved));

/** Drops the admin-only fields. */
const toPublic = (slide: ResolvedInsiderHeroSlide): PublicInsiderHeroSlide => ({
  heading: slide.heading,
  subtext: slide.subtext,
  image: slide.image,
  mobileImage: slide.mobileImage,
  // Same fallback as the home hero: an image is never announced unlabelled.
  imageAlt: slide.image ? (slide.imageAlt ?? plainHeading(slide.heading)) : null,
});

/** The fields an audit entry records, so every write snapshots the same set. */
const auditSnapshot = (slide: InsiderHeroSlide): Record<string, unknown> => ({
  heading: slide.heading,
  subtext: slide.subtext,
  imageUrl: slide.imageUrl,
  imageFileId: slide.imageFileId,
  imageAlt: slide.imageAlt,
  mobileImageUrl: slide.mobileImageUrl,
  mobileImageFileId: slide.mobileImageFileId,
  displayOrder: slide.displayOrder,
  status: slide.status,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: InsiderHeroSlideFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedInsiderHeroSlide[]; meta: PaginationMeta }> => {
  const { rows, total } = await heroRepository.findAll(filters, pagination);
  return {
    rows: await toResolvedMany(rows),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getById = async (id: string): Promise<ResolvedInsiderHeroSlide> => {
  const slide = await heroRepository.findById(id);
  if (!slide) throw new NotFoundError('Insider hero slide');
  return toResolved(slide);
};

/** The website-facing read. Returns only ACTIVE slides, already in order. */
export const getPublished = async (): Promise<PublicInsiderHeroSlide[]> => {
  const slides = await heroRepository.findPublished();
  const resolved = await toResolvedMany(slides);
  return resolved.map(toPublic);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateInsiderHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedInsiderHeroSlide> => {
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, INSIDER_IMAGE_SPECS.heroDesktop, 'imageFileId');
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      INSIDER_IMAGE_SPECS.heroMobile,
      'mobileImageFileId',
    );
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.countAll(client);
    if (existing >= LIMITS.MAX_INSIDER_HERO_SLIDES) {
      throw new ConflictError(
        `The Insider hero holds at most ${LIMITS.MAX_INSIDER_HERO_SLIDES} slides. Delete or deactivate one first.`,
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
        action: AUDIT_ACTIONS.INSIDER_HERO_SLIDE_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: auditSnapshot(created),
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
  patch: UpdateInsiderHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedInsiderHeroSlide> => {
  if (patch.imageFileId) {
    await assertUsableImageFile(patch.imageFileId, INSIDER_IMAGE_SPECS.heroDesktop, 'imageFileId');
  }
  if (patch.mobileImageFileId) {
    await assertUsableImageFile(
      patch.mobileImageFileId,
      INSIDER_IMAGE_SPECS.heroMobile,
      'mobileImageFileId',
    );
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Insider hero slide');

    const updated = await heroRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Insider hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_HERO_SLIDE_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
        newValues: auditSnapshot(updated),
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(slide);
};

/**
 * Publish / unpublish, separate from update() so the list's toggle cannot carry
 * stale copy and the audit trail tells "went live" from "was edited".
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedInsiderHeroSlide> => {
  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Insider hero slide');

    // Already in the requested state: no no-op write, no misleading audit row.
    if (existing.status === status) return existing;

    const updated = await heroRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Insider hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_HERO_SLIDE_STATUS_CHANGED,
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
 * array index. Every slide is required, so the result is a total order.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedInsiderHeroSlide[]> => {
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
        action: AUDIT_ACTIONS.INSIDER_HERO_SLIDES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Read on `client` so the list reflects the order just written.
    return heroRepository.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_INSIDER_HERO_SLIDES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(slides.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Insider hero slide');

    await heroRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_HERO_SLIDE_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        // The full row, so deleted copy is recoverable from the audit trail.
        oldValues: auditSnapshot(existing),
      },
      context,
      client,
    );
  });
};
