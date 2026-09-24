// src/modules/home-page/services/industries-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { env } from '../../../config/env';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../files/repositories/file.repository';
import * as industriesRepository from '../repositories/industries-section.repository';
import * as sectionCopyService from './section-copy.service';
import {
  CreateIndustriesEntryInput,
  IndustriesEntry,
  IndustriesEntryFilters,
  PublicIndustriesSection,
  ResolvedIndustriesEntry,
  UpdateIndustriesEntryInput,
} from '../types/industries-section.types';

const MODULE = 'home_page';
const ENTITY = 'home_industries_entry';

/** Only video belongs in a <video>; an image there is a blank player. */
const VIDEO_MIME_PREFIX = 'video/';

const resolveVideo = async (entry: IndustriesEntry): Promise<string | null> => {
  if (entry.videoUrl) return entry.videoUrl;
  if (!entry.videoFileId) return null;

  const file = await fileRepository.findById(entry.videoFileId);
  // Soft-deleted or purged asset: the entry resolves without a video and the
  // public read skips it, rather than failing the whole request.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (entry: IndustriesEntry): Promise<ResolvedIndustriesEntry> => ({
  ...entry,
  video: await resolveVideo(entry),
});

const toResolvedMany = (entries: IndustriesEntry[]): Promise<ResolvedIndustriesEntry[]> =>
  Promise.all(entries.map(toResolved));

/**
 * Rejects a file id that is not a live video.
 *
 * There is no dimension check here, unlike the image slots: a video's useful
 * properties - codec, duration, bitrate - are not readable from a header the
 * way width and height are, and guessing at them would mean either a decoder
 * dependency or a rule that rejects valid files. The MIME allowlist on upload
 * already limits this to the two formats browsers play.
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
 * The section renders one block, so two active entries would mean one of them
 * is silently invisible. A partial unique index is the actual guarantee - this
 * check exists so the caller gets a message naming what is already live and
 * what to do about it, rather than a raw constraint violation.
 *
 * @param excludeId the entry being changed, so re-saving the live one is fine
 */
const assertNoOtherActive = async (
  excludeId: string | null,
  client?: Parameters<typeof industriesRepository.findActive>[0],
): Promise<void> => {
  const active = await industriesRepository.findActive(client);
  if (!active || active.id === excludeId) return;

  throw new ConflictError(
    `Another entry is already live, and this section shows one at a time. Deactivate or delete it first.`,
  );
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: IndustriesEntryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedIndustriesEntry[]; meta: PaginationMeta }> => {
  const { rows, total } = await industriesRepository.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedIndustriesEntry> => {
  const entry = await industriesRepository.findById(id);
  if (!entry) throw new NotFoundError('Industries entry');
  return toResolved(entry);
};

/**
 * The website-facing read: the first active entry that still has a video.
 *
 * Null rather than a partial section, so "nothing published" stays
 * distinguishable from "a section with empty fields" - the site falls back to
 * the copy and video it ships. An active entry whose uploaded video has since
 * been deleted is skipped rather than returned with a null player source.
 */
export const getPublished = async (): Promise<PublicIndustriesSection | null> => {
  const entries = await industriesRepository.findPublished();
  if (entries.length === 0) return null;

  const resolved = await toResolvedMany(entries);
  const first = resolved.find((entry) => entry.video !== null);
  if (!first || !first.video) return null;

  const copy = await sectionCopyService.get('home', 'industries');
  if (!copy) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    video: first.video,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateIndustriesEntryInput,
  context: RequestContext,
): Promise<ResolvedIndustriesEntry> => {
  if (input.videoFileId) await assertUsableVideoFile(input.videoFileId);

  const entry = await withTransaction(async (client) => {
    if (input.status === 'ACTIVE') await assertNoOtherActive(null, client);

    const existing = await industriesRepository.countAll(client);
    if (existing >= LIMITS.MAX_INDUSTRIES_ENTRIES) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_INDUSTRIES_ENTRIES} entries. Delete or deactivate one first.`,
      );
    }

    const displayOrder =
      input.displayOrder ?? (await industriesRepository.nextDisplayOrder(client));
    const created = await industriesRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_INDUSTRIES_ENTRY_CREATED,
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
  patch: UpdateIndustriesEntryInput,
  context: RequestContext,
): Promise<ResolvedIndustriesEntry> => {
  if (patch.videoFileId) await assertUsableVideoFile(patch.videoFileId);

  const entry = await withTransaction(async (client) => {
    const existing = await industriesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Industries entry');

    if (patch.status === 'ACTIVE') await assertNoOtherActive(id, client);

    const updated = await industriesRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Industries entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_INDUSTRIES_ENTRY_UPDATED,
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
): Promise<ResolvedIndustriesEntry> => {
  const entry = await withTransaction(async (client) => {
    const existing = await industriesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Industries entry');

    if (status === 'ACTIVE') await assertNoOtherActive(id, client);

    const updated = await industriesRepository.updateStatus(
      id,
      status,
      context.adminId,
      client,
    );
    if (!updated) throw new NotFoundError('Industries entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_INDUSTRIES_ENTRY_UPDATED,
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
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates, which
 * a "move entry X to position N" endpoint can when two admins drag at once.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedIndustriesEntry[]> => {
  const entries = await withTransaction(async (client) => {
    const total = await industriesRepository.countAll(client);
    const existingIds = await industriesRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more entries do not exist', [
        {
          field: 'ids',
          message: `Unknown entry ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_INDUSTRIES_ENTRY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every entry', [
        {
          field: 'ids',
          message: `Expected all ${total} entry ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await industriesRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_INDUSTRIES_ENTRIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return industriesRepository.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_INDUSTRIES_ENTRIES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(entries.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await industriesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Industries entry');

    await industriesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_INDUSTRIES_ENTRY_DELETED,
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
