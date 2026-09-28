// src/modules/product-pages/vendor-portal-page/services/outcomes-section.service.ts

import { withTransaction } from '../../../../config/database';
import {
  AUDIT_ACTIONS,
  ContentStatus,
  LIMITS,
  isPubliclyServableEntityType,
} from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../../files/repositories/file.repository';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import {
  assertUsableImageFile,
  resolveImageSource,
} from '../../../home-page/utils/image-asset';
import * as repo from '../repositories/outcomes-section.repository';
import {
  CreateVmsOutcomeVideoInput,
  PublicVmsOutcomesSection,
  ResolvedVmsOutcomeVideo,
  UpdateVmsOutcomeVideoInput,
  VmsOutcomeVideo,
  VmsOutcomeVideoFilters,
} from '../types/outcomes-section.types';

const MODULE = 'vendor_portal_page';
const ENTITY = 'vms_outcome_video';

/** The still fills the player, so it wants the player's 16:9 shape. */
const POSTER_SLOT = 'vmsOutcomePoster' as const;

/** Only a video belongs in a player; an image there renders nothing. */
const VIDEO_MIME_PREFIX = 'video/';

/**
 * Rejects a file id that is not a live, publicly servable video.
 *
 * There is no dimension check here, unlike the poster: a video's useful
 * properties - codec, duration, bitrate - are not readable from a header the
 * way width and height are, and guessing at them would mean either a decoder
 * dependency or a rule that rejects valid files. The MIME allowlist on upload
 * already limits this to the formats browsers play.
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
  /*
   * The same gate the public file route applies on the way out: an upload
   * whose entity type is not on PUBLIC_FILE_ENTITY_TYPES is served a 404 to
   * an anonymous browser. Accepting one here would save a tab whose player is
   * empty on the live site with nothing to explain it.
   */
  if (!isPubliclyServableEntityType(file.entityType)) {
    throw new ValidationError('Video file is not publicly servable', [
      {
        field,
        message:
          'This upload is not tagged for public use, so the site could not play it. Upload the video through this form.',
        code: 'FILE_NOT_PUBLIC',
      },
    ]);
  }
};

const toResolved = async (video: VmsOutcomeVideo): Promise<ResolvedVmsOutcomeVideo> => ({
  ...video,
  // resolveImageSource is media-agnostic - it turns a url/fileId pair into a
  // URL an anonymous browser can fetch - so the film uses it too.
  video: await resolveImageSource(video.videoUrl, video.videoFileId),
  poster: await resolveImageSource(video.posterUrl, video.posterFileId),
});

const toResolvedMany = (videos: VmsOutcomeVideo[]): Promise<ResolvedVmsOutcomeVideo[]> =>
  Promise.all(videos.map(toResolved));

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: VmsOutcomeVideoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedVmsOutcomeVideo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedVmsOutcomeVideo> => {
  const video = await repo.findById(id);
  if (!video) throw new NotFoundError('Outcome video');
  return toResolved(video);
};

// ── writes ────────────────────────────────────────────────────────────────

/** Both media checks, run before any transaction opens. */
const assertUsableMedia = async (input: {
  videoFileId?: string | null;
  posterFileId?: string | null;
}): Promise<void> => {
  if (input.videoFileId) await assertUsableVideoFile(input.videoFileId);
  if (input.posterFileId) {
    await assertUsableImageFile(input.posterFileId, POSTER_SLOT, 'posterFileId');
  }
};

export const create = async (
  input: CreateVmsOutcomeVideoInput,
  context: RequestContext,
): Promise<ResolvedVmsOutcomeVideo> => {
  await assertUsableMedia(input);

  const video = await withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_VMS_OUTCOME_VIDEOS) {
      throw new ConflictError(
        `The showcase holds at most ${LIMITS.MAX_VMS_OUTCOME_VIDEOS} tabs. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_OUTCOME_VIDEO_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { label: created.label, title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(video);
};

export const update = async (
  id: string,
  patch: UpdateVmsOutcomeVideoInput,
  context: RequestContext,
): Promise<ResolvedVmsOutcomeVideo> => {
  await assertUsableMedia(patch);

  const video = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Outcome video');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Outcome video');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_OUTCOME_VIDEO_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(video);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedVmsOutcomeVideo> => update(id, { status }, context);

export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedVmsOutcomeVideo[]> => {
  const videos = await withTransaction(async (client) => {
    const total = await repo.count(client);

    const existing = await repo.findExistingIds(ids, client);
    const unknown = ids.filter((id) => !existing.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('The order names a tab that does not exist', [
        {
          field: 'ids',
          message: `Unknown tab ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_VMS_OUTCOME_VIDEO',
        },
      ]);
    }

    if (ids.length !== total) {
      throw new ValidationError('The order must list every tab', [
        {
          field: 'ids',
          message: `Expected all ${total} tab ids, received ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_OUTCOME_VIDEOS_REORDERED,
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
      { page: 1, limit: LIMITS.MAX_VMS_OUTCOME_VIDEOS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

  return toResolvedMany(videos);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Outcome video');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_OUTCOME_VIDEO_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { label: existing.label, title: existing.title },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy above the player and the tabs
 * beside it.
 *
 * Null when the copy is missing or no tab is published - the page then keeps
 * the showcase it ships.
 *
 * A tab whose film is absent is kept rather than dropped, unlike a card
 * missing its picture elsewhere on this page: the three shipped tabs share
 * one placeholder clip that belongs to the site, so a tab without its own
 * film is the normal state rather than a broken one, and the site plays its
 * own.
 */
export const getPublished = async (): Promise<PublicVmsOutcomesSection | null> => {
  const [copy, videos] = await Promise.all([
    sectionCopyService.get('vms', 'outcomes'),
    repo.findPublished(),
  ]);
  if (!copy || videos.length === 0) return null;

  const resolved = await toResolvedMany(videos);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    videos: resolved.map((video) => ({
      label: video.label,
      badge: video.badge,
      duration: video.duration,
      title: video.title,
      description: video.description,
      button:
        video.buttonLabel && video.buttonHref
          ? { label: video.buttonLabel, href: video.buttonHref }
          : null,
      video: video.video,
      poster: video.poster,
    })),
  };
};
