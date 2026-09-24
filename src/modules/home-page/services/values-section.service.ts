// src/modules/home-page/services/values-section.service.ts

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
import * as valuesRepository from '../repositories/values-section.repository';
import * as sectionCopyService from './section-copy.service';
import { checkImageDimensions } from '../utils/image-spec';
import { readImageDimensions } from '../utils/image-dimensions';
import {
  CreateValuesEntryInput,
  PublicValuesSection,
  ResolvedValuesEntry,
  UpdateValuesEntryInput,
  ValuesEntry,
  ValuesEntryFilters,
} from '../types/values-section.types';

const MODULE = 'home_page';
const ENTITY = 'home_values_entry';

/** Only images belong in the card; a PDF in an <img> is a broken card. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveImage = async (entry: ValuesEntry): Promise<string | null> => {
  if (entry.imageUrl) return entry.imageUrl;
  if (!entry.imageFileId) return null;

  const file = await fileRepository.findById(entry.imageFileId);
  // Soft-deleted or purged asset: the card resolves without an image and the
  // public read drops it, rather than failing the whole request.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (entry: ValuesEntry): Promise<ResolvedValuesEntry> => ({
  ...entry,
  image: await resolveImage(entry),
});

const toResolvedMany = (entries: ValuesEntry[]): Promise<ResolvedValuesEntry[]> =>
  Promise.all(entries.map(toResolved));

/**
 * Rejects a file id that is not a live image of the right shape.
 *
 * The card renders with object-cover, so a wrong ratio is silently cropped -
 * which is why the ratio check applies here, unlike the trust logos.
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
    throw new ValidationError('Card image must be an image', [
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

  const problem = checkImageDimensions('valuesCard', dimensions);
  if (problem) {
    throw new ValidationError('Card image is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: ValuesEntryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedValuesEntry[]; meta: PaginationMeta }> => {
  const { rows, total } = await valuesRepository.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedValuesEntry> => {
  const entry = await valuesRepository.findById(id);
  if (!entry) throw new NotFoundError('Values entry');
  return toResolved(entry);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Folds the rows back into the one block the site renders: the copy comes from
 * the first active card, and the grid is every active card that still has an
 * image. Null rather than an empty section, so "nothing published" stays
 * distinguishable from "a section with empty fields", which would render as a
 * heading over nothing.
 */
export const getPublished = async (): Promise<PublicValuesSection | null> => {
  const entries = await valuesRepository.findPublished();
  if (entries.length === 0) return null;

  /*
   * The section's copy lives in home_section_copy, not on these rows, so a
   * section with entries but no copy authored yet has nothing to head them
   * with - which reads as "not published" rather than as a bare list.
   */
  const copy = await sectionCopyService.get('home', 'values');
  if (!copy) return null;

  const resolved = await toResolvedMany(entries);

  const cards = resolved.flatMap((entry) =>
    entry.image
      ? [{ image: entry.image, title: entry.cardTitle, body: entry.cardBody }]
      : [],
  );

  // A heading with no cards under it is a worse page than the built-in grid.
  if (cards.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    cards,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateValuesEntryInput,
  context: RequestContext,
): Promise<ResolvedValuesEntry> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  const entry = await withTransaction(async (client) => {
    const existing = await valuesRepository.countAll(client);
    if (existing >= LIMITS.MAX_VALUES_ENTRIES) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_VALUES_ENTRIES} cards. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await valuesRepository.nextDisplayOrder(client));
    const created = await valuesRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_VALUES_ENTRY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { cardTitle: created.cardTitle, status: created.status },
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
  patch: UpdateValuesEntryInput,
  context: RequestContext,
): Promise<ResolvedValuesEntry> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  const entry = await withTransaction(async (client) => {
    const existing = await valuesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Values entry');

    const updated = await valuesRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Values entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_VALUES_ENTRY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { cardTitle: existing.cardTitle, status: existing.status },
        newValues: { cardTitle: updated.cardTitle, status: updated.status },
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
): Promise<ResolvedValuesEntry> => {
  const entry = await withTransaction(async (client) => {
    const existing = await valuesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Values entry');

    const updated = await valuesRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Values entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_VALUES_ENTRY_UPDATED,
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
 * a "move card X to position N" endpoint can when two admins drag at once.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedValuesEntry[]> => {
  const entries = await withTransaction(async (client) => {
    const total = await valuesRepository.countAll(client);
    const existingIds = await valuesRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more cards do not exist', [
        {
          field: 'ids',
          message: `Unknown card ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_VALUES_ENTRY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every card', [
        {
          field: 'ids',
          message: `Expected all ${total} card ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await valuesRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_VALUES_ENTRIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return valuesRepository.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_VALUES_ENTRIES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(entries.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await valuesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Values entry');

    await valuesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_VALUES_ENTRY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { cardTitle: existing.cardTitle },
      },
      context,
      client,
    );
  });
};
