// src/modules/product-pages/sfa-dms-page/services/packages-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/packages-section.repository';
import {
  CreateSfaPackageCardInput,
  CreateSfaPackageFeatureInput,
  PublicSfaPackagesSection,
  SfaPackageCard,
  SfaPackageCardFilters,
  SfaPackageFeature,
  SfaPackageFeatureFilters,
  UpdateSfaPackageCardInput,
  UpdateSfaPackageFeatureInput,
} from '../types/packages-section.types';

const MODULE = 'sfa_dms_page';
const CARD_ENTITY = 'sfa_package_card';
const FEATURE_ENTITY = 'sfa_package_feature';

// ── the cards ─────────────────────────────────────────────────────────────

export const listCards = async (
  filters: SfaPackageCardFilters,
  pagination: PaginationParams,
): Promise<{ rows: SfaPackageCard[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllCards(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getCardById = async (id: string): Promise<SfaPackageCard> => {
  const card = await repo.findCardById(id);
  if (!card) throw new NotFoundError('Package');
  return card;
};

export const createCard = async (
  input: CreateSfaPackageCardInput,
  context: RequestContext,
): Promise<SfaPackageCard> =>
  withTransaction(async (client) => {
    const existing = await repo.countCards(client);
    if (existing >= LIMITS.MAX_SFA_PACKAGE_CARDS) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_SFA_PACKAGE_CARDS} packages - the grid is three across`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextCardOrder(client));
    const created = await repo.createCard({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PACKAGE_CARD_CREATED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: created.id,
        newValues: { title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateCard = async (
  id: string,
  patch: UpdateSfaPackageCardInput,
  context: RequestContext,
): Promise<SfaPackageCard> =>
  withTransaction(async (client) => {
    const existing = await repo.findCardByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Package');

    const updated = await repo.updateCard(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Package');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PACKAGE_CARD_UPDATED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: id,
        oldValues: { title: existing.title, status: existing.status },
        newValues: { title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setCardStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<SfaPackageCard> => updateCard(id, { status }, context);

export const reorderCards = async (
  ids: string[],
  context: RequestContext,
): Promise<SfaPackageCard[]> =>
  withTransaction(async (client) => {
    const total = await repo.countCards(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every package', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingCardIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a package that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyCardOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PACKAGE_CARDS_REORDERED,
        module: MODULE,
        entityType: CARD_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllCards(
      {},
      { page: 1, limit: LIMITS.MAX_SFA_PACKAGE_CARDS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

/** Deleting a package takes its ticks with it - the table cascades. */
export const removeCard = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCardByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Package');

    await repo.removeCard(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PACKAGE_CARD_DELETED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: id,
        oldValues: { title: existing.title },
      },
      context,
      client,
    );
  });
};

// ── the ticks ─────────────────────────────────────────────────────────────

/**
 * Every feature call names its card as well as itself.
 *
 * The card is checked to exist before the feature is looked up, so a request
 * against a card that was deleted reads as "no such package" rather than "no
 * such feature" - and a feature belonging to one card can never be reached
 * through another card's URL.
 */
const assertCard = async (
  cardId: string,
  executor?: Parameters<typeof repo.findCardById>[1],
): Promise<void> => {
  const card = await repo.findCardById(cardId, executor);
  if (!card) throw new NotFoundError('Package');
};

export const listFeatures = async (
  cardId: string,
  filters: SfaPackageFeatureFilters,
  pagination: PaginationParams,
): Promise<{ rows: SfaPackageFeature[]; meta: PaginationMeta }> => {
  await assertCard(cardId);
  const { rows, total } = await repo.findAllFeatures(cardId, filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getFeatureById = async (
  cardId: string,
  id: string,
): Promise<SfaPackageFeature> => {
  await assertCard(cardId);
  const feature = await repo.findFeatureById(cardId, id);
  if (!feature) throw new NotFoundError('Feature');
  return feature;
};

export const createFeature = async (
  cardId: string,
  input: CreateSfaPackageFeatureInput,
  context: RequestContext,
): Promise<SfaPackageFeature> =>
  withTransaction(async (client) => {
    await assertCard(cardId, client);

    const existing = await repo.countFeatures(cardId, client);
    if (existing >= LIMITS.MAX_SFA_PACKAGE_FEATURES) {
      throw new ConflictError(
        `A package lists at most ${LIMITS.MAX_SFA_PACKAGE_FEATURES} features`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextFeatureOrder(cardId, client));
    const created = await repo.createFeature(
      cardId,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PACKAGE_FEATURE_CREATED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: created.id,
        newValues: { cardId, label: created.label },
      },
      context,
      client,
    );

    return created;
  });

export const updateFeature = async (
  cardId: string,
  id: string,
  patch: UpdateSfaPackageFeatureInput,
  context: RequestContext,
): Promise<SfaPackageFeature> =>
  withTransaction(async (client) => {
    await assertCard(cardId, client);

    const existing = await repo.findFeatureByIdForUpdate(cardId, id, client);
    if (!existing) throw new NotFoundError('Feature');

    const updated = await repo.updateFeature(cardId, id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Feature');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PACKAGE_FEATURE_UPDATED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setFeatureStatus = async (
  cardId: string,
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<SfaPackageFeature> => updateFeature(cardId, id, { status }, context);

export const reorderFeatures = async (
  cardId: string,
  ids: string[],
  context: RequestContext,
): Promise<SfaPackageFeature[]> =>
  withTransaction(async (client) => {
    await assertCard(cardId, client);

    const total = await repo.countFeatures(cardId, client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every feature of this package', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingFeatureIds(cardId, ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a feature this package does not have', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyFeatureOrder(cardId, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PACKAGE_FEATURES_REORDERED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        newValues: { cardId, order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllFeatures(
      cardId,
      {},
      { page: 1, limit: LIMITS.MAX_SFA_PACKAGE_FEATURES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeFeature = async (
  cardId: string,
  id: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    await assertCard(cardId, client);

    const existing = await repo.findFeatureByIdForUpdate(cardId, id, client);
    if (!existing) throw new NotFoundError('Feature');

    await repo.removeFeature(cardId, id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_PACKAGE_FEATURE_DELETED,
        module: MODULE,
        entityType: FEATURE_ENTITY,
        entityId: id,
        oldValues: { cardId, label: existing.label },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy, and the cards with their ticks.
 *
 * Two queries rather than one per card: the ticks come back in a single read
 * and are grouped here, so adding a seventh package would not add a seventh
 * round trip.
 *
 * Null when the copy is missing or no card is live - the page then keeps the
 * section it ships, which is a complete working one. A live card with no live
 * ticks is still published: the pitch and the button stand on their own, and
 * an empty list under them is a smaller loss than dropping the stage.
 */
export const getPublished = async (): Promise<PublicSfaPackagesSection | null> => {
  const [copy, cards, features] = await Promise.all([
    sectionCopyService.get('sfa-dms', 'packages'),
    repo.findPublishedCards(),
    repo.findPublishedFeatures(),
  ]);
  if (!copy) return null;
  if (cards.length === 0) return null;

  const byCard = new Map<string, string[]>();
  for (const feature of features) {
    const list = byCard.get(feature.cardId);
    if (list) list.push(feature.label);
    else byCard.set(feature.cardId, [feature.label]);
  }

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    cards: cards.map((card) => ({
      icon: card.icon,
      stageLabel: card.stageLabel,
      title: card.title,
      subtitle: card.subtitle,
      description: card.description,
      accentColor: card.accentColor,
      buttonLabel: card.buttonLabel,
      buttonHref: card.buttonHref,
      featuresLabel: card.featuresLabel,
      features: byCard.get(card.id) ?? [],
    })),
  };
};
