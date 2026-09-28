// src/modules/free-audit/services/hero-section.service.ts

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
  CreateFreeAuditHeroSlideInput,
  FreeAuditHeroSlide,
  FreeAuditHeroSlideFilters,
  PublicFreeAuditHeroSlide,
  ResolvedFreeAuditHeroSlide,
  UpdateFreeAuditHeroSlideInput,
} from '../types/hero-section.types';
import { FREE_AUDIT_IMAGE_SPECS } from '../utils/free-audit-image-spec';

const MODULE = 'free_audit';
const ENTITY = 'free_audit_hero_slide';

/*
 * The same rules as the Blog hero service, applied to this page's table: the
 * image checks and URL resolution are the shared ones from
 * home-page/utils/image-asset, so an image behaves identically on every page.
 */

const toResolved = async (slide: FreeAuditHeroSlide): Promise<ResolvedFreeAuditHeroSlide> => {
  const [image, mobileImage] = await Promise.all([
    // The seeded slide's legacy site path comes back as stored, like the Blog
    // and Insider heroes' seeded paths.
    resolveImageSource(slide.imageUrl, slide.imageFileId),
    // Null here means "no mobile-specific art" - the site falls back to `image`.
    resolveImageSource(null, slide.mobileImageFileId),
  ]);
  return { ...slide, image, mobileImage };
};

const toResolvedMany = (slides: FreeAuditHeroSlide[]): Promise<ResolvedFreeAuditHeroSlide[]> =>
  Promise.all(slides.map(toResolved));

/** Drops the admin-only fields. */
const toPublic = (slide: ResolvedFreeAuditHeroSlide): PublicFreeAuditHeroSlide => ({
  eyebrow: slide.eyebrow,
  heading: slide.heading,
  subtext: slide.subtext,
  image: slide.image,
  mobileImage: slide.mobileImage,
});

/** The fields an audit entry records, so every write snapshots the same set. */
const auditSnapshot = (slide: FreeAuditHeroSlide): Record<string, unknown> => ({
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
  filters: FreeAuditHeroSlideFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedFreeAuditHeroSlide[]; meta: PaginationMeta }> => {
  const { rows, total } = await heroRepository.findAll(filters, pagination);
  return {
    rows: await toResolvedMany(rows),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getById = async (id: string): Promise<ResolvedFreeAuditHeroSlide> => {
  const slide = await heroRepository.findById(id);
  if (!slide) throw new NotFoundError('Free Audit hero slide');
  return toResolved(slide);
};

/** The website-facing read. Returns only ACTIVE slides, already in order. */
export const getPublished = async (): Promise<PublicFreeAuditHeroSlide[]> => {
  const slides = await heroRepository.findPublished();
  const resolved = await toResolvedMany(slides);
  return resolved.map(toPublic);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateFreeAuditHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedFreeAuditHeroSlide> => {
  if (input.imageFileId) {
    await assertUsableImageFile(
      input.imageFileId,
      FREE_AUDIT_IMAGE_SPECS.heroDesktop,
      'imageFileId',
    );
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      FREE_AUDIT_IMAGE_SPECS.heroMobile,
      'mobileImageFileId',
    );
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.countAll(client);
    if (existing >= LIMITS.MAX_FREE_AUDIT_HERO_SLIDES) {
      throw new ConflictError(
        `The Free Operational Audit hero holds at most ${LIMITS.MAX_FREE_AUDIT_HERO_SLIDES} slides. Delete or deactivate one first.`,
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
        action: AUDIT_ACTIONS.FREE_AUDIT_HERO_SLIDE_CREATED,
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
  patch: UpdateFreeAuditHeroSlideInput,
  context: RequestContext,
): Promise<ResolvedFreeAuditHeroSlide> => {
  if (patch.imageFileId) {
    await assertUsableImageFile(
      patch.imageFileId,
      FREE_AUDIT_IMAGE_SPECS.heroDesktop,
      'imageFileId',
    );
  }
  if (patch.mobileImageFileId) {
    await assertUsableImageFile(
      patch.mobileImageFileId,
      FREE_AUDIT_IMAGE_SPECS.heroMobile,
      'mobileImageFileId',
    );
  }

  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Free Audit hero slide');

    const updated = await heroRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Free Audit hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FREE_AUDIT_HERO_SLIDE_UPDATED,
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
): Promise<ResolvedFreeAuditHeroSlide> => {
  const slide = await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Free Audit hero slide');

    // Already in the requested state: no no-op write, no misleading audit row.
    if (existing.status === status) return existing;

    const updated = await heroRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Free Audit hero slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FREE_AUDIT_HERO_SLIDE_STATUS_CHANGED,
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
): Promise<ResolvedFreeAuditHeroSlide[]> => {
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
        action: AUDIT_ACTIONS.FREE_AUDIT_HERO_SLIDES_REORDERED,
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
      { page: 1, limit: LIMITS.MAX_FREE_AUDIT_HERO_SLIDES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(slides.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await heroRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Free Audit hero slide');

    await heroRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FREE_AUDIT_HERO_SLIDE_DELETED,
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
