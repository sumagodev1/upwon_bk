// src/modules/product-pages/wms-page/services/outcomes-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/outcomes-section.repository';
import {
  CreateWmsOutcomeCardInput,
  PublicWmsOutcomesSection,
  UpdateWmsOutcomeCardInput,
  WmsOutcomeCard,
  WmsOutcomeCardFilters,
} from '../types/outcomes-section.types';

const MODULE = 'wms_page';
const ENTITY = 'wms_outcome_card';

export const list = async (
  filters: WmsOutcomeCardFilters,
  pagination: PaginationParams,
): Promise<{ rows: WmsOutcomeCard[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<WmsOutcomeCard> => {
  const card = await repo.findById(id);
  if (!card) throw new NotFoundError('Outcome card');
  return card;
};

export const create = async (
  input: CreateWmsOutcomeCardInput,
  context: RequestContext,
): Promise<WmsOutcomeCard> =>
  withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_WMS_OUTCOME_CARDS) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_WMS_OUTCOME_CARDS} cards. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_OUTCOME_CARD_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { stat: created.stat, title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const update = async (
  id: string,
  patch: UpdateWmsOutcomeCardInput,
  context: RequestContext,
): Promise<WmsOutcomeCard> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Outcome card');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Outcome card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_OUTCOME_CARD_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { stat: existing.stat, title: existing.title, status: existing.status },
        newValues: { stat: updated.stat, title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<WmsOutcomeCard> => update(id, { status }, context);

export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<WmsOutcomeCard[]> =>
  withTransaction(async (client) => {
    const total = await repo.count(client);

    const existing = await repo.findExistingIds(ids, client);
    const unknown = ids.filter((id) => !existing.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('The order names a card that does not exist', [
        {
          field: 'ids',
          message: `Unknown card ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_WMS_OUTCOME_CARD',
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
        action: AUDIT_ACTIONS.WMS_OUTCOME_CARDS_REORDERED,
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
      { page: 1, limit: LIMITS.MAX_WMS_OUTCOME_CARDS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Outcome card');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_OUTCOME_CARD_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { stat: existing.stat, title: existing.title },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy above the row and the cards in it.
 *
 * Null when the copy is missing or no card is published - the page then keeps
 * the row it ships, which is a complete working one. A heading over an empty
 * row is not a section, it is a hole.
 *
 * No image resolution here, unlike this page's other sections: a card is an
 * icon name and four strings, and the artwork in the section's corner belongs
 * to the site.
 */
export const getPublished = async (): Promise<PublicWmsOutcomesSection | null> => {
  const [copy, cards] = await Promise.all([
    sectionCopyService.get('wms', 'outcomes'),
    repo.findPublished(),
  ]);
  if (!copy || cards.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    cards: cards.map((card) => ({
      icon: card.icon,
      stat: card.stat,
      title: card.title,
      description: card.description,
      accent: card.accent,
    })),
  };
};
