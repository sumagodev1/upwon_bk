// src/modules/product-pages/fms-page/services/video-section.service.ts

import { Executor, withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { env } from '../../../../config/env';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../../files/repositories/file.repository';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/video-section.repository';
import {
  CreateFmsVideoEntryInput,
  FmsVideoEntry,
  FmsVideoEntryFilters,
  PublicFmsVideoSection,
  ResolvedFmsVideoEntry,
  UpdateFmsVideoEntryInput,
} from '../types/video-section.types';

const MODULE = 'fms_page';
const ENTITY = 'fms_video_entry';

/** Only video belongs in a <video>; an image there is a blank player. */
const VIDEO_MIME_PREFIX = 'video/';

const resolveVideo = async (entry: FmsVideoEntry): Promise<string | null> => {
  if (entry.videoUrl) return entry.videoUrl;
  if (!entry.videoFileId) return null;

  const file = await fileRepository.findById(entry.videoFileId);
  // Soft-deleted or purged asset: the entry resolves without a video and the
  // public read skips it, rather than failing the whole request.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (entry: FmsVideoEntry): Promise<ResolvedFmsVideoEntry> => ({
  ...entry,
  video: await resolveVideo(entry),
});

const toResolvedMany = (entries: FmsVideoEntry[]): Promise<ResolvedFmsVideoEntry[]> =>
  Promise.all(entries.map(toResolved));

/**
 * Rejects a file id that is not a live video.
 *
 * There is no dimension check here, unlike the image slots: a video's useful
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
};

/**
 * Refuses a second live entry.
 *
 * The section renders one player, so two active entries would mean one of them
 * is silently invisible. The partial unique index on the table is the actual
 * guarantee - it holds even when two administrators activate different entries
 * at the same moment. This check exists so the ordinary case gets a message
 * naming what to do about it, rather than a raw constraint violation.
 *
 * @param excludeId the entry being changed, so re-saving the live one is fine
 */
const assertNoOtherActive = async (
  excludeId: string | null,
  client?: Executor,
): Promise<void> => {
  const active = await repo.findActive(client);
  if (!active || active.id === excludeId) return;

  throw new ConflictError(
    'Another video is already live, and this section shows one at a time. Deactivate or delete it first.',
  );
};

// -- reads ------------------------------------------------------------------

export const list = async (
  filters: FmsVideoEntryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedFmsVideoEntry[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedFmsVideoEntry> => {
  const entry = await repo.findById(id);
  if (!entry) throw new NotFoundError('Video entry');
  return toResolved(entry);
};

// -- writes -----------------------------------------------------------------

export const create = async (
  input: CreateFmsVideoEntryInput,
  context: RequestContext,
): Promise<ResolvedFmsVideoEntry> => {
  if (input.videoFileId) await assertUsableVideoFile(input.videoFileId);

  const entry = await withTransaction(async (client) => {
    if (input.status === 'ACTIVE') await assertNoOtherActive(null, client);

    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_FMS_VIDEO_ENTRIES) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_FMS_VIDEO_ENTRIES} videos. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_VIDEO_ENTRY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { videoUrl: created.videoUrl, status: created.status },
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
  patch: UpdateFmsVideoEntryInput,
  context: RequestContext,
): Promise<ResolvedFmsVideoEntry> => {
  if (patch.videoFileId) await assertUsableVideoFile(patch.videoFileId);

  const entry = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Video entry');

    if (patch.status === 'ACTIVE') await assertNoOtherActive(id, client);

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Video entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_VIDEO_ENTRY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { videoUrl: existing.videoUrl, status: existing.status },
        newValues: { videoUrl: updated.videoUrl, status: updated.status },
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
): Promise<ResolvedFmsVideoEntry> => {
  const entry = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Video entry');

    if (status === 'ACTIVE') await assertNoOtherActive(id, client);

    const updated = await repo.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Video entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_VIDEO_ENTRY_UPDATED,
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
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedFmsVideoEntry[]> => {
  const entries = await withTransaction(async (client) => {
    const total = await repo.countAll(client);

    if (orderedIds.length !== total) {
      throw new ValidationError('The order must list every video', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existingIds = await repo.findExistingIds(orderedIds, client);
    if (existingIds.length !== orderedIds.length) {
      throw new ValidationError('The order names a video that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_VIDEO_ENTRIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAll({}, { page: 1, limit: LIMITS.MAX_FMS_VIDEO_ENTRIES, offset: 0 }, client);
  });

  return toResolvedMany(entries.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Video entry');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_VIDEO_ENTRY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { videoUrl: existing.videoUrl },
      },
      context,
      client,
    );
  });
};

// -- the website-facing read ------------------------------------------------

/**
 * The copy and the one live video.
 *
 * Null rather than a partial section, so "nothing published" stays
 * distinguishable from "a section with empty fields" - the site then keeps the
 * copy and video it ships. A live entry whose uploaded video has since been
 * deleted is skipped rather than returned with a null player source.
 */
export const getPublished = async (): Promise<PublicFmsVideoSection | null> => {
  const entries = await repo.findPublished();
  if (entries.length === 0) return null;

  const resolved = await toResolvedMany(entries);
  const first = resolved.find((entry) => entry.video !== null);
  if (!first || !first.video) return null;

  const copy = await sectionCopyService.get('fms', 'video');
  if (!copy) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    video: first.video,
  };
};
