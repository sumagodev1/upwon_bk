// src/modules/product-pages/erp-page/services/outcomes-section.service.ts

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
import * as repo from '../repositories/outcomes-section.repository';
import {
  CreateErpOutcomeCardInput,
  ErpOutcomeCard,
  ErpOutcomeCardFilters,
  PublicErpOutcomesSection,
  ResolvedErpOutcomeCard,
  UpdateErpOutcomeCardInput,
} from '../types/outcomes-section.types';

const MODULE = 'erp_page';
const ENTITY = 'erp_outcome_card';

/** Only images belong in the card; a PDF in an <img> is a broken frame. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the card is dropped from the carousel rather
  // than rendering with half its layout empty.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

/** Rejects a file id that is not a live image of the right size for the slot. */
const assertUsableImageFile = async (fileId: string, field: string): Promise<void> => {
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('That file must be an image', [
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

  const problem = checkImageDimensions('erpOutcome', dimensions);
  if (problem) {
    throw new ValidationError('That image is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

const toResolved = async (card: ErpOutcomeCard): Promise<ResolvedErpOutcomeCard> => ({
  ...card,
  image: await resolveSource(card.imageUrl, card.imageFileId),
});

export const list = async (
  filters: ErpOutcomeCardFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedErpOutcomeCard[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  const resolved = await Promise.all(rows.map(toResolved));
  return { rows: resolved, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedErpOutcomeCard> => {
  const card = await repo.findById(id);
  if (!card) throw new NotFoundError('Outcome card');
  return toResolved(card);
};

export const create = async (
  input: CreateErpOutcomeCardInput,
  context: RequestContext,
): Promise<ResolvedErpOutcomeCard> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId, 'imageFileId');

  return withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_ERP_OUTCOME_CARDS) {
      throw new ConflictError(
        `The carousel holds at most ${LIMITS.MAX_ERP_OUTCOME_CARDS} cards`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_OUTCOME_CARD_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: {
          industry: created.industry,
          stat: created.stat,
          status: created.status,
        },
      },
      context,
      client,
    );

    return toResolved(created);
  });
};

export const update = async (
  id: string,
  patch: UpdateErpOutcomeCardInput,
  context: RequestContext,
): Promise<ResolvedErpOutcomeCard> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId, 'imageFileId');

  return withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Outcome card');

    /*
     * A card needs a photograph, and the CHECK enforces it. A patch clearing
     * the source currently in use without supplying the other would leave the
     * row with neither, so it is caught here - where the stored row is visible -
     * rather than as a raw constraint violation.
     */
    const urlAfter = patch.imageUrl !== undefined ? patch.imageUrl : existing.imageUrl;
    const fileAfter =
      patch.imageFileId !== undefined ? patch.imageFileId : existing.imageFileId;
    if (urlAfter === null && fileAfter === null) {
      throw new ValidationError('The card cannot lose its photograph', [
        {
          field: 'imageFileId',
          message:
            'A card needs a photograph: upload one or give an image URL - clearing both would leave half the card empty',
          code: 'REQUIRED',
        },
      ]);
    }

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Outcome card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_OUTCOME_CARD_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { industry: existing.industry, stat: existing.stat, status: existing.status },
        newValues: { industry: updated.industry, stat: updated.stat, status: updated.status },
      },
      context,
      client,
    );

    return toResolved(updated);
  });
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedErpOutcomeCard> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Outcome card');

    const updated = await repo.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Outcome card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_OUTCOME_CARD_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return toResolved(updated);
  });

/**
 * Reorder takes the complete id list, so it is idempotent and cannot leave
 * gaps. A list that omits or invents rows is rejected rather than half-applied.
 */
export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedErpOutcomeCard[]> =>
  withTransaction(async (client) => {
    const total = await repo.count(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every card', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a card that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_OUTCOME_CARDS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_ERP_OUTCOME_CARDS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolved));
  });

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Outcome card');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_OUTCOME_CARD_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { industry: existing.industry, stat: existing.stat },
      },
      context,
      client,
    );
  });
};

/**
 * The website-facing read: the copy and every active card in one response.
 *
 * The carousel scrolls in the browser, so the cards are all in hand before the
 * visitor touches an arrow. Null when the copy or the cards are missing - the
 * page then keeps the section it ships, which is a complete working one.
 *
 * This section's copy has no subtext: the header row is an eyebrow, a heading
 * and a button, with the cards doing the explaining.
 */
export const getPublished = async (): Promise<PublicErpOutcomesSection | null> => {
  const [copy, cards] = await Promise.all([
    sectionCopyService.get('erp', 'outcomes'),
    repo.findPublished(),
  ]);
  if (!copy || cards.length === 0) return null;

  const resolved = await Promise.all(cards.map(toResolved));

  const rendered = resolved
    // A card whose photograph went missing is dropped: half of its layout is
    // the image, so an empty frame is worse than one card fewer.
    .filter((card): card is ResolvedErpOutcomeCard & { image: string } => card.image !== null)
    .map((card) => ({
      industry: card.industry,
      stat: card.stat,
      statLabel: card.statLabel,
      quote: card.quote,
      authorRole: card.authorRole,
      authorCompany: card.authorCompany,
      image: card.image,
      imageAlt: card.imageAlt,
    }));

  if (rendered.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    cards: rendered,
  };
};
