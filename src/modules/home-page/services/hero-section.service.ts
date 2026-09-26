// src/modules/home-page/services/hero-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as heroRepository from '../repositories/hero-section.repository';
import { parseHeading, plainHeading } from '../utils/heading-markup';
import { assertUsableImageFile, resolveImageSource } from '../utils/image-asset';
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

/**
 * Both image pairs resolve through utils/image-asset, which explains why the
 * URL is the public file route rather than the storage provider's own.
 */
const resolveImage = (slide: HeroSlide): Promise<string | null> =>
  resolveImageSource(slide.imageUrl, slide.imageFileId);

/** Null here means "no mobile-specific art" - the site falls back to `image`. */
const resolveMobileImage = (slide: HeroSlide): Promise<string | null> =>
  resolveImageSource(slide.mobileImageUrl, slide.mobileImageFileId);

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
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId, 'heroDesktop', 'imageFileId');
  if (input.mobileImageFileId) {
    await assertUsableImageFile(input.mobileImageFileId, 'heroMobile', 'mobileImageFileId');
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
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId, 'heroDesktop', 'imageFileId');
  if (patch.mobileImageFileId) {
    await assertUsableImageFile(patch.mobileImageFileId, 'heroMobile', 'mobileImageFileId');
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
