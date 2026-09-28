// src/modules/product-pages/wms-page/services/proof-section.service.ts

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
import * as repo from '../repositories/proof-section.repository';
import {
  CreateWmsProofCardInput,
  CreateWmsProofSlideInput,
  PublicWmsProofSection,
  ResolvedWmsProofCard,
  ResolvedWmsProofSlide,
  UpdateWmsProofCardInput,
  UpdateWmsProofSlideInput,
  WmsProofCard,
  WmsProofCardFilters,
  WmsProofSlide,
} from '../types/proof-section.types';

const MODULE = 'wms_page';
const CARD_ENTITY = 'wms_proof_card';
const SLIDE_ENTITY = 'wms_proof_slide';

/** Each slide is a stat card drawn object-cover into an 11:8 frame. */
const SLIDE_SLOT = 'wmsProofSlide' as const;

const toResolvedSlide = async (slide: WmsProofSlide): Promise<ResolvedWmsProofSlide> => ({
  ...slide,
  image: await resolveImageSource(slide.imageUrl, slide.imageFileId),
});

const toResolvedSlides = (slides: WmsProofSlide[]): Promise<ResolvedWmsProofSlide[]> =>
  Promise.all(slides.map(toResolvedSlide));

const toResolvedCard = (
  card: WmsProofCard,
  slides: ResolvedWmsProofSlide[],
): ResolvedWmsProofCard => ({ ...card, slides });

/** Groups a flat bulk read back under the card each slide belongs to. */
const groupByCard = (rows: ResolvedWmsProofSlide[]): Map<string, ResolvedWmsProofSlide[]> => {
  const byCard = new Map<string, ResolvedWmsProofSlide[]>();
  for (const row of rows) {
    const list = byCard.get(row.cardId);
    if (list) list.push(row);
    else byCard.set(row.cardId, [row]);
  }
  return byCard;
};

// ── reads ─────────────────────────────────────────────────────────────────

export const listCards = async (
  filters: WmsProofCardFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedWmsProofCard[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllCards(filters, pagination);

  // One bulk read for every slide in the row rather than a query per card.
  const slides = await toResolvedSlides(
    await repo.findActiveSlidesForCards(rows.map((card) => card.id)),
  );
  const byCard = groupByCard(slides);

  return {
    rows: rows.map((card) => toResolvedCard(card, byCard.get(card.id) ?? [])),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getCardById = async (id: string): Promise<ResolvedWmsProofCard> => {
  const card = await repo.findCardById(id);
  if (!card) throw new NotFoundError('Proof card');
  // Every status here, not just active: this is the editing view of the card.
  return toResolvedCard(card, await toResolvedSlides(await repo.findSlidesByCard(id)));
};

export const listSlides = async (cardId: string): Promise<ResolvedWmsProofSlide[]> => {
  const card = await repo.findCardById(cardId);
  if (!card) throw new NotFoundError('Proof card');
  return toResolvedSlides(await repo.findSlidesByCard(cardId));
};

export const getSlideById = async (
  cardId: string,
  slideId: string,
): Promise<ResolvedWmsProofSlide> => {
  const slide = await repo.findSlideById(slideId);
  // The card is checked too, so a slide cannot be read through another card.
  if (!slide || slide.cardId !== cardId) throw new NotFoundError('Slide');
  return toResolvedSlide(slide);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy that heads the row and at least one card with
 * something to show. With either missing the site keeps the row it ships,
 * which is a complete working section.
 *
 * A card whose slides have all been switched off is dropped rather than drawn
 * as an empty frame - the card is its pictures, so one with none is a hole in
 * a row of three.
 */
export const getPublished = async (): Promise<PublicWmsProofSection | null> => {
  const cards = await repo.findPublishedCards();
  if (cards.length === 0) return null;

  const copy = await sectionCopyService.get('wms', 'proof');
  if (!copy) return null;

  const slides = await toResolvedSlides(
    await repo.findActiveSlidesForCards(cards.map((card) => card.id)),
  );
  const byCard = groupByCard(slides);

  const drawable = cards
    .map((card) => ({
      label: card.label,
      // A slide whose file has been purged resolves to null; it is dropped
      // rather than flipped to as a blank frame.
      slides: (byCard.get(card.id) ?? [])
        .filter((slide): slide is ResolvedWmsProofSlide & { image: string } =>
          Boolean(slide.image),
        )
        .map((slide) => ({ image: slide.image, alt: slide.alt })),
    }))
    .filter((card) => card.slides.length > 0);

  if (drawable.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    cards: drawable,
  };
};

// ── the cards ─────────────────────────────────────────────────────────────

export const createCard = async (
  input: CreateWmsProofCardInput,
  context: RequestContext,
): Promise<ResolvedWmsProofCard> => {
  const card = await withTransaction(async (client) => {
    const existing = await repo.countCards(client);
    if (existing >= LIMITS.MAX_WMS_PROOF_CARDS) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_WMS_PROOF_CARDS} cards. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextCardOrder(client));
    const created = await repo.createCard({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_PROOF_CARD_CREATED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: created.id,
        newValues: { label: created.label, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  // A new card has no slides yet, so there is nothing to read back for it.
  return toResolvedCard(card, []);
};

export const updateCard = async (
  id: string,
  patch: UpdateWmsProofCardInput,
  context: RequestContext,
): Promise<ResolvedWmsProofCard> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCardByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Proof card');

    const updated = await repo.updateCard(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Proof card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_PROOF_CARD_UPDATED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );
  });

  return getCardById(id);
};

export const setCardStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedWmsProofCard> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCardByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Proof card');

    const updated = await repo.updateCardStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Proof card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_PROOF_CARD_UPDATED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );
  });

  return getCardById(id);
};

export const reorderCards = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedWmsProofCard[]> => {
  await withTransaction(async (client) => {
    const total = await repo.countCards(client);
    const existingIds = await repo.findExistingCardIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more cards do not exist', [
        {
          field: 'ids',
          message: `Unknown card ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_WMS_PROOF_CARD',
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

    await repo.applyCardOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_PROOF_CARDS_REORDERED,
        module: MODULE,
        entityType: CARD_ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );
  });

  const { rows } = await listCards({}, { page: 1, limit: LIMITS.MAX_WMS_PROOF_CARDS, offset: 0 });
  return rows;
};

export const removeCard = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCardByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Proof card');

    // The slides go with it - the foreign key cascades.
    await repo.removeCard(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_PROOF_CARD_DELETED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: id,
        oldValues: { label: existing.label },
      },
      context,
      client,
    );
  });
};

// ── the slides ────────────────────────────────────────────────────────────

export const createSlide = async (
  cardId: string,
  input: CreateWmsProofSlideInput,
  context: RequestContext,
): Promise<ResolvedWmsProofSlide> => {
  // Checked before the transaction opens: a storage round trip does not
  // belong inside one.
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, SLIDE_SLOT, 'imageFileId');
  }

  const slide = await withTransaction(async (client) => {
    const card = await repo.findCardByIdForUpdate(cardId, client);
    if (!card) throw new NotFoundError('Proof card');

    const existing = await repo.countSlides(cardId, client);
    if (existing >= LIMITS.MAX_WMS_PROOF_SLIDES) {
      throw new ConflictError(
        `A card holds at most ${LIMITS.MAX_WMS_PROOF_SLIDES} slides. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextSlideOrder(cardId, client));
    const created = await repo.createSlide(
      cardId,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_PROOF_SLIDE_CREATED,
        module: MODULE,
        entityType: SLIDE_ENTITY,
        entityId: created.id,
        newValues: { cardId, alt: created.alt, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolvedSlide(slide);
};

export const updateSlide = async (
  cardId: string,
  slideId: string,
  patch: UpdateWmsProofSlideInput,
  context: RequestContext,
): Promise<ResolvedWmsProofSlide> => {
  if (patch.imageFileId) {
    await assertUsableImageFile(patch.imageFileId, SLIDE_SLOT, 'imageFileId');
  }

  const slide = await withTransaction(async (client) => {
    const existing = await repo.findSlideByIdForUpdate(slideId, client);
    // The card is checked too, so a slide cannot be edited through another one.
    if (!existing || existing.cardId !== cardId) throw new NotFoundError('Slide');

    const updated = await repo.updateSlide(slideId, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_PROOF_SLIDE_UPDATED,
        module: MODULE,
        entityType: SLIDE_ENTITY,
        entityId: slideId,
        oldValues: { alt: existing.alt, status: existing.status },
        newValues: { alt: updated.alt, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolvedSlide(slide);
};

export const setSlideStatus = async (
  cardId: string,
  slideId: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedWmsProofSlide> => {
  const slide = await withTransaction(async (client) => {
    const existing = await repo.findSlideByIdForUpdate(slideId, client);
    if (!existing || existing.cardId !== cardId) throw new NotFoundError('Slide');

    const updated = await repo.updateSlideStatus(slideId, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Slide');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_PROOF_SLIDE_UPDATED,
        module: MODULE,
        entityType: SLIDE_ENTITY,
        entityId: slideId,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolvedSlide(slide);
};

export const reorderSlides = async (
  cardId: string,
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedWmsProofSlide[]> => {
  const slides = await withTransaction(async (client) => {
    const card = await repo.findCardByIdForUpdate(cardId, client);
    if (!card) throw new NotFoundError('Proof card');

    const total = await repo.countSlides(cardId, client);
    const existingIds = await repo.findExistingSlideIds(cardId, orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more slides do not belong to this card', [
        {
          field: 'ids',
          message: `Unknown slide ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_WMS_PROOF_SLIDE',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every slide on this card', [
        {
          field: 'ids',
          message: `Expected all ${total} slide ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applySlideOrder(cardId, orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_PROOF_SLIDES_REORDERED,
        module: MODULE,
        entityType: SLIDE_ENTITY,
        entityId: cardId,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findSlidesByCard(cardId, client);
  });

  return toResolvedSlides(slides);
};

export const removeSlide = async (
  cardId: string,
  slideId: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findSlideByIdForUpdate(slideId, client);
    if (!existing || existing.cardId !== cardId) throw new NotFoundError('Slide');

    await repo.removeSlide(slideId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_PROOF_SLIDE_DELETED,
        module: MODULE,
        entityType: SLIDE_ENTITY,
        entityId: slideId,
        oldValues: { cardId, alt: existing.alt },
      },
      context,
      client,
    );
  });
};
