// src/modules/product-pages/hreasy-page/services/lifecycle-section.service.ts

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
import * as lifecycleRepository from '../repositories/lifecycle-section.repository';
import {
  CreateHreasyLifecycleCardInput,
  HreasyLifecycleCard,
  HreasyLifecycleCardFilters,
  PublicHreasyLifecycleSection,
  ResolvedHreasyLifecycleCard,
  UpdateHreasyLifecycleCardInput,
} from '../types/lifecycle-section.types';

const MODULE = 'hreasy_page';
const ENTITY = 'hreasy_lifecycle_card';

/** Only images belong on a card; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the card resolves without its photograph
  // rather than failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (card: HreasyLifecycleCard): Promise<ResolvedHreasyLifecycleCard> => ({
  ...card,
  image: await resolveSource(card.imageUrl, card.imageFileId),
});

const toResolvedMany = (
  cards: HreasyLifecycleCard[],
): Promise<ResolvedHreasyLifecycleCard[]> => Promise.all(cards.map(toResolved));

/**
 * Rejects a file id that is not a live image of the right shape.
 *
 * The ratio is checked here, unlike the module showcase's contained panel:
 * the card covers a 4:3 box, so a differently shaped upload is cropped on one
 * axis rather than shown whole.
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
    throw new ValidationError('Card photograph must be an image', [
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

  const problem = checkImageDimensions('hreasyLifecycleCard', dimensions);
  if (problem) {
    throw new ValidationError('Card photograph is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: HreasyLifecycleCardFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedHreasyLifecycleCard[]; meta: PaginationMeta }> => {
  const { rows, total } = await lifecycleRepository.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedHreasyLifecycleCard> => {
  const card = await lifecycleRepository.findById(id);
  if (!card) throw new NotFoundError('HREasy lifecycle card');
  return toResolved(card);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy that heads the section and at least one card.
 * With either missing the site keeps the grid it ships, which is a complete
 * working section - better than a heading over nothing.
 */
export const getPublished = async (): Promise<PublicHreasyLifecycleSection | null> => {
  const cards = await lifecycleRepository.findPublished();
  if (cards.length === 0) return null;

  const copy = await sectionCopyService.get('hreasy', 'lifecycle');
  if (!copy) return null;

  const resolved = await toResolvedMany(cards);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    cards: resolved.map((card) => ({
      title: card.title,
      description: card.description,
      image: card.image,
    })),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateHreasyLifecycleCardInput,
  context: RequestContext,
): Promise<ResolvedHreasyLifecycleCard> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  const card = await withTransaction(async (client) => {
    const existing = await lifecycleRepository.countAll(client);
    if (existing >= LIMITS.MAX_HREASY_LIFECYCLE_CARDS) {
      throw new ConflictError(
        `The grid holds at most ${LIMITS.MAX_HREASY_LIFECYCLE_CARDS} cards. Delete or deactivate one first.`,
      );
    }

    const displayOrder =
      input.displayOrder ?? (await lifecycleRepository.nextDisplayOrder(client));
    const created = await lifecycleRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_LIFECYCLE_CARD_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(card);
};

export const update = async (
  id: string,
  patch: UpdateHreasyLifecycleCardInput,
  context: RequestContext,
): Promise<ResolvedHreasyLifecycleCard> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  const card = await withTransaction(async (client) => {
    const existing = await lifecycleRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('HREasy lifecycle card');

    const updated = await lifecycleRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('HREasy lifecycle card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_LIFECYCLE_CARD_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { title: existing.title, status: existing.status },
        newValues: { title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(card);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedHreasyLifecycleCard> => {
  const card = await withTransaction(async (client) => {
    const existing = await lifecycleRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('HREasy lifecycle card');

    const updated = await lifecycleRepository.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('HREasy lifecycle card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_LIFECYCLE_CARD_UPDATED,
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

  return toResolved(card);
};

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedHreasyLifecycleCard[]> => {
  const cards = await withTransaction(async (client) => {
    const total = await lifecycleRepository.countAll(client);
    const existingIds = await lifecycleRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more cards do not exist', [
        {
          field: 'ids',
          message: `Unknown card ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_HREASY_LIFECYCLE_CARD',
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

    await lifecycleRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_LIFECYCLE_CARDS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return lifecycleRepository.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_HREASY_LIFECYCLE_CARDS, offset: 0 },
      client,
    );
  });

  return toResolvedMany(cards.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await lifecycleRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('HREasy lifecycle card');

    await lifecycleRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_LIFECYCLE_CARD_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { title: existing.title },
      },
      context,
      client,
    );
  });
};
