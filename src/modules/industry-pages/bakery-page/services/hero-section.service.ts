// src/modules/industry-pages/bakery-page/services/hero-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import { parseHeading } from '../../../home-page/utils/heading-markup';
import * as heroRepository from '../repositories/hero-section.repository';
import { assertUsableImageFile, resolveSource } from '../utils/media';
import {
  CreateBakeryHeroSlideInput,
  BakeryHeroSlide,
  BakeryHeroSlideFilters,
  PublicBakeryHeroSlide,
  ResolvedBakeryHeroSlide,
  UpdateBakeryHeroSlideInput,
} from '../types/hero-section.types';

const MODULE = 'bakery_page';
const ENTITY = 'bakery_hero_slide';

const toResolved = async (slide: BakeryHeroSlide): Promise<ResolvedBakeryHeroSlide> => ({
  ...slide,
  headlineLines: parseHeading(slide.headline),
  image: await resolveSource(slide.imageUrl, slide.imageFileId),
  mobileImage: await resolveSource(slide.mobileImageUrl, slide.mobileImageFileId),
});

const toResolvedMany = (slides: BakeryHeroSlide[]): Promise<ResolvedBakeryHeroSlide[]> =>
  Promise.all(slides.map(toResolved));

/*
 * The slider covers its box with the background, so a wrong ratio is silently
 * cropped - which is why the slot carries a ratio rule. The message names the
 * slot, so an editor who filled in the mobile box is not told their desktop
 * background is wrong.
 */
const assertSlideImage = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, 'bakeryHero', 'imageFileId', 'Slide background');

const assertSlideMobileImage = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, 'bakeryHeroMobile', 'mobileImageFileId', 'Mobile image');

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: BakeryHeroSlideFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedBakeryHeroSlide[]; meta: PaginationMeta }> => {
  const { rows, total } = await heroRepository.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedBakeryHeroSlide> => {
  const slide = await heroRepository.findById(id);
  if (!slide) throw new NotFoundError('Bakery hero slide');
  return toResolved(slide);
};

/**
 * The website-facing read: every active slide, in order.
 *
 * An empty array rather than null when nothing is published - the site treats
 * an empty list as "keep the built-in slides", the same as an unreachable API.
 */
export const getPublished = async (): Promise<PublicBakeryHeroSlide[]> => {
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
  input: CreateBakeryHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedBakeryHeroSlide> => {
  if (input.imageFileId) await assertSlideImage(input.imageFileId);
  if (input.mobileImageFileId) {
    await assertSlideMobileImage(input.mobileImageFileId);
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.countAll(client);
    if (existing >= LIMITS.MAX_BAKERY_HERO_SLIDES) {
      throw new ConflictError(
        `The slider holds at most ${LIMITS.MAX_BAKERY_HERO_SLIDES} slides. Delete or deactivate one first.`,
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
        action: AUDIT_ACTIONS.BAKERY_HERO_SLIDE_CREATED,
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
  patch: UpdateBakeryHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedBakeryHeroSlide> => {
  if (patch.imageFileId) await assertSlideImage(patch.imageFileId);
  if (patch.mobileImageFileId) {
    await assertSlideMobileImage(patch.mobileImageFileId);
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Bakery hero slide');

    const updated = await heroRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Bakery hero slide');

    // Both images are required. Checked on the row as saved, so clearing one
    // source of a pair is caught whichever field the patch named; throwing
    // here rolls the update back.
    const touchesImages = [
      patch.imageUrl,
      patch.imageFileId,
      patch.mobileImageUrl,
      patch.mobileImageFileId,
    ].some((value) => value !== undefined);
    if (touchesImages) {
      const details = [];
      if (!updated.imageUrl && !updated.imageFileId) {
        details.push({ field: 'imageUrl', message: 'A desktop image is required', code: 'REQUIRED' });
      }
      if (!updated.mobileImageUrl && !updated.mobileImageFileId) {
        details.push({
          field: 'mobileImageUrl',
          message: 'A mobile image is required',
          code: 'REQUIRED',
        });
      }
      if (details.length > 0) {
        throw new ValidationError('A slide needs both a desktop and a mobile image', details);
      }
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_HERO_SLIDE_UPDATED,
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
): Promise<ResolvedBakeryHeroSlide> => {
  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Bakery hero slide');

    const updated = await heroRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Bakery hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_HERO_SLIDE_UPDATED,
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
): Promise<ResolvedBakeryHeroSlide[]> => {
  const slides = await withTransaction(async (client) => {
    const total = await heroRepository.countAll(client);
    const existingIds = await heroRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more slides do not exist', [
        {
          field: 'ids',
          message: `Unknown slide ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_BAKERY_HERO_SLIDE',
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
        action: AUDIT_ACTIONS.BAKERY_HERO_SLIDES_REORDERED,
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
      { page: 1, limit: LIMITS.MAX_BAKERY_HERO_SLIDES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(slides.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Bakery hero slide');

    await heroRepository.remove(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_HERO_SLIDE_DELETED,
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
