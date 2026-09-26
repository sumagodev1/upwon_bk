// src/modules/knowledgebase/services/hero-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as heroRepository from '../repositories/hero-section.repository';
import {
  CreateKbHeroSlideInput,
  KbHeroSlide,
  KbHeroSlideFilters,
  PublicKbHeroSlide,
  ResolvedKbHeroSlide,
  UpdateKbHeroSlideInput,
} from '../types/hero-section.types';
import { KB_IMAGE_SPECS } from '../utils/kb-image-spec';

const MODULE = 'knowledgebase';
const ENTITY = 'kb_hero_slide';

/*
 * The same rules as the Blog hero service, applied to this page's table: the
 * image checks and URL resolution are the shared ones from
 * home-page/utils/image-asset, so an image behaves identically on every page.
 */

const toResolved = async (slide: KbHeroSlide): Promise<ResolvedKbHeroSlide> => {
  const [image, mobileImage] = await Promise.all([
    // The seeded slide's legacy site path comes back as stored, like the Blog
    // and Insider heroes' seeded paths.
    resolveImageSource(slide.imageUrl, slide.imageFileId),
    // Null here means "no mobile-specific art" - the site falls back to `image`.
    resolveImageSource(null, slide.mobileImageFileId),
  ]);
  return { ...slide, image, mobileImage };
};

const toResolvedMany = (slides: KbHeroSlide[]): Promise<ResolvedKbHeroSlide[]> =>
  Promise.all(slides.map(toResolved));

/** Drops the admin-only fields. */
const toPublic = (slide: ResolvedKbHeroSlide): PublicKbHeroSlide => ({
  eyebrow: slide.eyebrow,
  heading: slide.heading,
  subtext: slide.subtext,
  image: slide.image,
  mobileImage: slide.mobileImage,
});

/** The fields an audit entry records, so every write snapshots the same set. */
const auditSnapshot = (slide: KbHeroSlide): Record<string, unknown> => ({
  eyebrow: slide.eyebrow,
  heading: slide.heading,
  subtext: slide.subtext,
  imageUrl: slide.imageUrl,
  imageFileId: slide.imageFileId,
  mobileImageFileId: slide.mobileImageFileId,
  displayOrder: slide.displayOrder,
  status: slide.status,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: KbHeroSlideFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedKbHeroSlide[]; meta: PaginationMeta }> => {
  const { rows, total } = await heroRepository.findAll(filters, pagination);
  return {
    rows: await toResolvedMany(rows),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getById = async (id: string): Promise<ResolvedKbHeroSlide> => {
  const slide = await heroRepository.findById(id);
  if (!slide) throw new NotFoundError('Knowledgebase hero slide');
  return toResolved(slide);
};

/** The website-facing read. Returns only ACTIVE slides, already in order. */
export const getPublished = async (): Promise<PublicKbHeroSlide[]> => {
  const slides = await heroRepository.findPublished();
  const resolved = await toResolvedMany(slides);
  return resolved.map(toPublic);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateKbHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedKbHeroSlide> => {
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, KB_IMAGE_SPECS.heroDesktop, 'imageFileId');
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      KB_IMAGE_SPECS.heroMobile,
      'mobileImageFileId',
    );
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.countAll(client);
    if (existing >= LIMITS.MAX_KB_HERO_SLIDES) {
      throw new ConflictError(
        `The Knowledgebase hero holds at most ${LIMITS.MAX_KB_HERO_SLIDES} slides. Delete or deactivate one first.`,
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
        action: AUDIT_ACTIONS.KB_HERO_SLIDE_CREATED,
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
  patch: UpdateKbHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedKbHeroSlide> => {
  if (patch.imageFileId) {
    await assertUsableImageFile(patch.imageFileId, KB_IMAGE_SPECS.heroDesktop, 'imageFileId');
  }
  if (patch.mobileImageFileId) {
    await assertUsableImageFile(
      patch.mobileImageFileId,
      KB_IMAGE_SPECS.heroMobile,
      'mobileImageFileId',
    );
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Knowledgebase hero slide');

    const updated = await heroRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Knowledgebase hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_HERO_SLIDE_UPDATED,
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
): Promise<ResolvedKbHeroSlide> => {
  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Knowledgebase hero slide');

    // Already in the requested state: no no-op write, no misleading audit row.
    if (existing.status === status) return existing;

    const updated = await heroRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Knowledgebase hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_HERO_SLIDE_STATUS_CHANGED,
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
): Promise<ResolvedKbHeroSlide[]> => {
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
        action: AUDIT_ACTIONS.KB_HERO_SLIDES_REORDERED,
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
      { page: 1, limit: LIMITS.MAX_KB_HERO_SLIDES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(slides.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Knowledgebase hero slide');

    await heroRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_HERO_SLIDE_DELETED,
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
