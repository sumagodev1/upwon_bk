// src/modules/home-page/services/trust-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { env } from '../../../config/env';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import { getStorageProvider } from '../../../storage/storage.factory';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../files/repositories/file.repository';
import * as trustRepository from '../repositories/trust-section.repository';
import { parseHeading } from '../utils/heading-markup';
import { checkImageDimensions } from '../utils/image-spec';
import { readImageDimensions } from '../utils/image-dimensions';
import {
  CreateTrustEntryInput,
  PublicTrustSection,
  ResolvedTrustEntry,
  TrustEntry,
  TrustEntryFilters,
  UpdateTrustEntryInput,
} from '../types/trust-section.types';

const MODULE = 'home_page';
const ENTITY = 'home_trust_entry';

/** Only images belong in the marquee; a PDF in an <img> is a broken logo. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveImage = async (entry: TrustEntry): Promise<string | null> => {
  if (entry.imageUrl) return entry.imageUrl;
  if (!entry.imageFileId) return null;

  const file = await fileRepository.findById(entry.imageFileId);
  // Soft-deleted or purged asset: render the entry without a logo rather than
  // failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (entry: TrustEntry): Promise<ResolvedTrustEntry> => ({
  ...entry,
  headingLines: parseHeading(entry.heading),
  image: await resolveImage(entry),
});

const toResolvedMany = (entries: TrustEntry[]): Promise<ResolvedTrustEntry[]> =>
  Promise.all(entries.map(toResolved));

/**
 * Rejects a file id that is not a live image of a usable size.
 *
 * Logos render with object-contain at a fixed height, so unlike the hero there
 * is no aspect ratio to enforce - only a floor on the pixels, which is what
 * decides whether the mark looks sharp.
 */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const field = 'imageFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Logo must be an image', [
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

  const problem = checkImageDimensions('trustLogo', dimensions);
  if (problem) {
    throw new ValidationError('Logo is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: TrustEntryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedTrustEntry[]; meta: PaginationMeta }> => {
  const { rows, total } = await trustRepository.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedTrustEntry> => {
  const entry = await trustRepository.findById(id);
  if (!entry) throw new NotFoundError('Trust entry');
  return toResolved(entry);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Folds the entries back into the one card the site renders: the copy comes
 * from the first active entry, and the logos and counters are gathered from
 * every entry that has one. Null rather than an empty section, so "nothing
 * published" stays distinguishable from "a section with empty fields", which
 * would render as a blank card.
 */
export const getPublished = async (): Promise<PublicTrustSection | null> => {
  const entries = await trustRepository.findPublished();
  if (entries.length === 0) return null;

  const resolved = await toResolvedMany(entries);
  const first = resolved[0];

  return {
    eyebrow: first.eyebrow,
    heading: first.heading,
    headingLines: first.headingLines,
    subtext: first.subtext,
    // An entry whose asset went missing resolves to null and is dropped here,
    // rather than rendering as a broken image in the marquee.
    logos: resolved.flatMap((entry) =>
      entry.image ? [{ image: entry.image, alt: entry.imageAlt ?? '' }] : [],
    ),
    stats: resolved.flatMap((entry) =>
      entry.statValue && entry.statLabel
        ? [{ value: entry.statValue, label: entry.statLabel }]
        : [],
    ),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateTrustEntryInput,
  context: RequestContext,
): Promise<ResolvedTrustEntry> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  const entry = await withTransaction(async (client) => {
    const existing = await trustRepository.countAll(client);
    if (existing >= LIMITS.MAX_TRUST_ENTRIES) {
      throw new ConflictError(
        `The trust section holds at most ${LIMITS.MAX_TRUST_ENTRIES} entries. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await trustRepository.nextDisplayOrder(client));
    const created = await trustRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_TRUST_ENTRY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: {
          eyebrow: created.eyebrow,
          imageAlt: created.imageAlt,
          statValue: created.statValue,
          status: created.status,
        },
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
  patch: UpdateTrustEntryInput,
  context: RequestContext,
): Promise<ResolvedTrustEntry> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  const entry = await withTransaction(async (client) => {
    const existing = await trustRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Trust entry');

    const updated = await trustRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Trust entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_TRUST_ENTRY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: {
          eyebrow: existing.eyebrow,
          imageAlt: existing.imageAlt,
          statValue: existing.statValue,
          status: existing.status,
        },
        newValues: {
          eyebrow: updated.eyebrow,
          imageAlt: updated.imageAlt,
          statValue: updated.statValue,
          status: updated.status,
        },
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
): Promise<ResolvedTrustEntry> => {
  const entry = await withTransaction(async (client) => {
    const existing = await trustRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Trust entry');

    const updated = await trustRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Trust entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_TRUST_ENTRY_UPDATED,
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
): Promise<ResolvedTrustEntry[]> => {
  const entries = await withTransaction(async (client) => {
    const total = await trustRepository.countAll(client);
    const existingIds = await trustRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more trust entries do not exist', [
        {
          field: 'ids',
          message: `Unknown trust entry ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_TRUST_ENTRY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every trust entry', [
        {
          field: 'ids',
          message: `Expected all ${total} entry ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await trustRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_TRUST_ENTRIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return trustRepository.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_TRUST_ENTRIES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(entries.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await trustRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Trust entry');

    await trustRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_TRUST_ENTRY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { eyebrow: existing.eyebrow, imageAlt: existing.imageAlt },
      },
      context,
      client,
    );
  });
};
