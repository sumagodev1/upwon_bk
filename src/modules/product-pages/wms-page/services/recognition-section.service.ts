// src/modules/product-pages/wms-page/services/recognition-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import {
  assertUsableImageFile,
  resolveImageSource,
} from '../../../home-page/utils/image-asset';
import * as repo from '../repositories/recognition-section.repository';
import {
  CreateWmsRecognitionCardInput,
  PublicWmsRecognitionSection,
  ResolvedWmsRecognitionCard,
  UpdateWmsRecognitionCardInput,
  WmsRecognitionCard,
  WmsRecognitionCardFilters,
} from '../types/recognition-section.types';

const MODULE = 'wms_page';
const ENTITY = 'wms_recognition_card';

/** Each card's illustration is drawn contained in a fixed band. */
const CARD_SLOT = 'wmsRecognitionCard' as const;

const toResolved = async (card: WmsRecognitionCard): Promise<ResolvedWmsRecognitionCard> => ({
  ...card,
  image: await resolveImageSource(card.imageUrl, card.imageFileId),
});

const toResolvedMany = (cards: WmsRecognitionCard[]): Promise<ResolvedWmsRecognitionCard[]> =>
  Promise.all(cards.map(toResolved));

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: WmsRecognitionCardFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedWmsRecognitionCard[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return {
    rows: await toResolvedMany(rows),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getById = async (id: string): Promise<ResolvedWmsRecognitionCard> => {
  const card = await repo.findById(id);
  if (!card) throw new NotFoundError('Recognition card');
  return toResolved(card);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateWmsRecognitionCardInput,
  context: RequestContext,
): Promise<ResolvedWmsRecognitionCard> => {
  /*
   * Checked before the transaction opens: the dimension check reads the blob
   * back out of storage, and a round trip to storage does not belong inside
   * an open transaction.
   */
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, CARD_SLOT, 'imageFileId');
  }

  const card = await withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_WMS_RECOGNITION_CARDS) {
      throw new ConflictError(
        `The map holds at most ${LIMITS.MAX_WMS_RECOGNITION_CARDS} cards. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_RECOGNITION_CARD_CREATED,
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
  patch: UpdateWmsRecognitionCardInput,
  context: RequestContext,
): Promise<ResolvedWmsRecognitionCard> => {
  if (patch.imageFileId) {
    await assertUsableImageFile(patch.imageFileId, CARD_SLOT, 'imageFileId');
  }

  const card = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Recognition card');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Recognition card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_RECOGNITION_CARD_UPDATED,
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
): Promise<ResolvedWmsRecognitionCard> => update(id, { status }, context);

export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedWmsRecognitionCard[]> => {
  const cards = await withTransaction(async (client) => {
    const total = await repo.count(client);

    const existing = await repo.findExistingIds(ids, client);
    const unknown = ids.filter((id) => !existing.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('The order names a card that does not exist', [
        {
          field: 'ids',
          message: `Unknown card ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_WMS_RECOGNITION_CARD',
        },
      ]);
    }

    if (ids.length !== total) {
      throw new ValidationError('The order must list every card', [
        {
          field: 'ids',
          message: `Expected all ${total} card ids, received ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_RECOGNITION_CARDS_REORDERED,
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
      { page: 1, limit: LIMITS.MAX_WMS_RECOGNITION_CARDS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

  return toResolvedMany(cards);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Recognition card');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_RECOGNITION_CARD_DELETED,
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

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy above the grid and the cards in it.
 *
 * Null when the copy is missing or no card is drawable - the page then keeps
 * the map it ships, which is a complete working one. A heading over an empty
 * grid is not a section, it is a hole.
 *
 * A card whose file has been purged resolves to no image and is dropped
 * rather than drawn as an empty frame, for the same reason.
 */
export const getPublished = async (): Promise<PublicWmsRecognitionSection | null> => {
  const [copy, cards] = await Promise.all([
    sectionCopyService.get('wms', 'recognition'),
    repo.findPublished(),
  ]);
  if (!copy || cards.length === 0) return null;

  const drawable = (await toResolvedMany(cards)).filter(
    (card): card is ResolvedWmsRecognitionCard & { image: string } => Boolean(card.image),
  );
  if (drawable.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    cards: drawable.map((card) => ({
      image: card.image,
      title: card.title,
      description: card.description,
    })),
  };
};
