// src/modules/product-pages/erp-page/services/trust-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { env } from '../../../../config/env';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import { getStorageProvider } from '../../../../storage/storage.factory';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../../files/repositories/file.repository';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import { checkImageDimensions } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as trustRepository from '../repositories/trust-section.repository';
import {
  CreateErpTrustEntryInput,
  ErpTrustEntry,
  ErpTrustEntryFilters,
  PublicErpTrustSection,
  ResolvedErpTrustEntry,
  UpdateErpTrustEntryInput,
} from '../types/trust-section.types';

const MODULE = 'erp_page';
const ENTITY = 'erp_trust_entry';

/** Only images belong in the marquee; a PDF in an <img> is a broken logo. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveImage = async (entry: ErpTrustEntry): Promise<string | null> => {
  if (entry.imageUrl) return entry.imageUrl;
  if (!entry.imageFileId) return null;

  const file = await fileRepository.findById(entry.imageFileId);
  // Soft-deleted or purged asset: render the entry without a logo rather than
  // failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (entry: ErpTrustEntry): Promise<ResolvedErpTrustEntry> => ({
  ...entry,
  image: await resolveImage(entry),
});

const toResolvedMany = (entries: ErpTrustEntry[]): Promise<ResolvedErpTrustEntry[]> =>
  Promise.all(entries.map(toResolved));

/**
 * Rejects a file id that is not a live image of a usable size.
 *
 * Logos render with object-contain at a fixed height, so unlike the hero there
 * is no aspect ratio to enforce - only a floor on the pixels, which is what
 * decides whether the mark looks sharp. Shares the home page's trustLogo spec,
 * because these are the same brand marks at the same rendered size.
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
  filters: ErpTrustEntryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedErpTrustEntry[]; meta: PaginationMeta }> => {
  const { rows, total } = await trustRepository.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedErpTrustEntry> => {
  const entry = await trustRepository.findById(id);
  if (!entry) throw new NotFoundError('ERP trust entry');
  return toResolved(entry);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Folds the entries back into the one card the site renders: the copy comes
 * from page_section_copy, and the logos and counters are gathered from every
 * entry that has one. Null rather than an empty section, so "nothing
 * published" stays distinguishable from "a section with empty fields".
 */
export const getPublished = async (): Promise<PublicErpTrustSection | null> => {
  const entries = await trustRepository.findPublished();
  if (entries.length === 0) return null;

  const copy = await sectionCopyService.get('erp', 'trust');
  if (!copy) return null;

  const resolved = await toResolvedMany(entries);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
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

/**
 * Refuses a fifth counter.
 *
 * The counter row is a four-up grid on the live page, so a fifth would wrap
 * onto its own line under three. A ConflictError rather than a validation
 * error: the entry itself is well-formed, it is the section that is full.
 *
 * @param excludeId the entry being changed, so re-saving its own counter is
 *   not counted against the limit
 */
const assertStatRoom = async (
  excludeId: string | null,
  client?: Parameters<typeof trustRepository.countWithStat>[1],
): Promise<void> => {
  const used = await trustRepository.countWithStat(excludeId, client);
  if (used >= LIMITS.MAX_ERP_TRUST_STATS) {
    throw new ConflictError(
      `The counter row holds ${LIMITS.MAX_ERP_TRUST_STATS} numbers. Clear one from another entry first.`,
    );
  }
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateErpTrustEntryInput,
  context: RequestContext,
): Promise<ResolvedErpTrustEntry> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  const entry = await withTransaction(async (client) => {
    const existing = await trustRepository.countAll(client);
    if (existing >= LIMITS.MAX_ERP_TRUST_ENTRIES) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_ERP_TRUST_ENTRIES} entries. Delete or deactivate one first.`,
      );
    }

    if (input.statValue) await assertStatRoom(null, client);

    const displayOrder = input.displayOrder ?? (await trustRepository.nextDisplayOrder(client));
    const created = await trustRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_TRUST_ENTRY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: {
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
  patch: UpdateErpTrustEntryInput,
  context: RequestContext,
): Promise<ResolvedErpTrustEntry> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  const entry = await withTransaction(async (client) => {
    const existing = await trustRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('ERP trust entry');

    // Only a patch that adds a counter where there was none can overflow the
    // row; editing or clearing an existing one never can.
    if (patch.statValue && !existing.statValue) await assertStatRoom(id, client);

    const updated = await trustRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('ERP trust entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_TRUST_ENTRY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { imageAlt: existing.imageAlt, statValue: existing.statValue },
        newValues: { imageAlt: updated.imageAlt, statValue: updated.statValue },
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
): Promise<ResolvedErpTrustEntry> => {
  const entry = await withTransaction(async (client) => {
    const existing = await trustRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('ERP trust entry');

    const updated = await trustRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('ERP trust entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_TRUST_ENTRY_UPDATED,
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
): Promise<ResolvedErpTrustEntry[]> => {
  const entries = await withTransaction(async (client) => {
    const total = await trustRepository.countAll(client);
    const existingIds = await trustRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more entries do not exist', [
        {
          field: 'ids',
          message: `Unknown entry ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_ERP_TRUST_ENTRY',
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

    await trustRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_TRUST_ENTRIES_REORDERED,
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
      { page: 1, limit: LIMITS.MAX_ERP_TRUST_ENTRIES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(entries.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await trustRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('ERP trust entry');

    await trustRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_TRUST_ENTRY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { imageAlt: existing.imageAlt, statValue: existing.statValue },
      },
      context,
      client,
    );
  });
};
