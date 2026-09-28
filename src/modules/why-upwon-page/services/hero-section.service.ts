// src/modules/why-upwon-page/services/hero-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading } from '../../home-page/utils/heading-markup';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as repo from '../repositories/hero-section.repository';
import {
  CreateWhyUpwonHeroSlideInput,
  PublicWhyUpwonHeroSlide,
  ResolvedWhyUpwonHeroSlide,
  UpdateWhyUpwonHeroSlideInput,
  WhyUpwonHeroSlide,
  WhyUpwonHeroSlideFilters,
} from '../types/hero-section.types';

const MODULE = 'why_upwon_page';
const ENTITY = 'why_upwon_hero_slide';

/** The two crops of one artwork, each with its own shape. */
const DESKTOP_SLOT = 'whyUpwonHeroDesktop' as const;
const MOBILE_SLOT = 'whyUpwonHeroMobile' as const;

const toResolved = async (slide: WhyUpwonHeroSlide): Promise<ResolvedWhyUpwonHeroSlide> => ({
  ...slide,
  desktopImage: await resolveImageSource(slide.desktopImageUrl, slide.desktopImageFileId),
  mobileImage: await resolveImageSource(slide.mobileImageUrl, slide.mobileImageFileId),
});

const toResolvedMany = (slides: WhyUpwonHeroSlide[]): Promise<ResolvedWhyUpwonHeroSlide[]> =>
  Promise.all(slides.map(toResolved));

/**
 * Both artwork checks, run before any transaction opens.
 *
 * Each reads the stored bytes back out of storage to measure them, and a
 * round trip to storage does not belong inside an open transaction.
 */
const assertUsableArtwork = async (input: {
  desktopImageFileId?: string | null;
  mobileImageFileId?: string | null;
}): Promise<void> => {
  if (input.desktopImageFileId) {
    await assertUsableImageFile(input.desktopImageFileId, DESKTOP_SLOT, 'desktopImageFileId');
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(input.mobileImageFileId, MOBILE_SLOT, 'mobileImageFileId');
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: WhyUpwonHeroSlideFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedWhyUpwonHeroSlide[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedWhyUpwonHeroSlide> => {
  const slide = await repo.findById(id);
  if (!slide) throw new NotFoundError('Hero slide');
  return toResolved(slide);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateWhyUpwonHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedWhyUpwonHeroSlide> => {
  await assertUsableArtwork(input);

  const slide = await withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_WHY_UPWON_HERO_SLIDES) {
      throw new ConflictError(
        `The hero holds at most ${LIMITS.MAX_WHY_UPWON_HERO_SLIDES} slides. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_HERO_SLIDE_CREATED,
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
  patch: UpdateWhyUpwonHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedWhyUpwonHeroSlide> => {
  await assertUsableArtwork(patch);

  const slide = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Hero slide');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_HERO_SLIDE_UPDATED,
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
): Promise<ResolvedWhyUpwonHeroSlide> => update(id, { status }, context);

export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedWhyUpwonHeroSlide[]> => {
  const slides = await withTransaction(async (client) => {
    const total = await repo.count(client);

    const existing = await repo.findExistingIds(ids, client);
    const unknown = ids.filter((id) => !existing.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('The order names a slide that does not exist', [
        {
          field: 'ids',
          message: `Unknown slide ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_WHY_UPWON_HERO_SLIDE',
        },
      ]);
    }

    if (ids.length !== total) {
      throw new ValidationError('The order must list every slide', [
        {
          field: 'ids',
          message: `Expected all ${total} slide ids, received ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_HERO_SLIDES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    // Read on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_WHY_UPWON_HERO_SLIDES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

  return toResolvedMany(slides);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Hero slide');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_HERO_SLIDE_DELETED,
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

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The published slides, or an empty array to mean "keep the hero you ship".
 *
 * No section-copy lookup, unlike this page's other sections: since 082 a
 * slide carries its own eyebrow, headline and subhead, which is what let the
 * hero become a list in the first place.
 */
export const getPublished = async (): Promise<PublicWhyUpwonHeroSlide[]> => {
  const slides = await repo.findPublished();
  if (slides.length === 0) return [];

  const resolved = await toResolvedMany(slides);

  return resolved.map((slide) => ({
    eyebrow: slide.eyebrow,
    heading: slide.headline,
    headingLines: parseHeading(slide.headline),
    subtext: slide.subhead,
    desktopImage: slide.desktopImage,
    mobileImage: slide.mobileImage,
    imageAlt: slide.imageAlt,
    primary: { label: slide.primaryLabel, href: slide.primaryHref },
    secondary:
      slide.secondaryLabel && slide.secondaryHref
        ? { label: slide.secondaryLabel, href: slide.secondaryHref }
        : null,
  }));
};
