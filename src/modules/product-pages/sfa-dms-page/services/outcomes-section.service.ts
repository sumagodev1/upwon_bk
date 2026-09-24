// src/modules/product-pages/sfa-dms-page/services/outcomes-section.service.ts

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
  CreateSfaOutcomeCardInput,
  PublicSfaOutcomesSection,
  ResolvedSfaOutcomeCard,
  SfaOutcomeCard,
  SfaOutcomeCardFilters,
  SfaOutcomeSection,
  UpdateSfaOutcomeCardInput,
  UpsertSfaOutcomeSectionInput,
} from '../types/outcomes-section.types';

const MODULE = 'sfa_dms_page';
const SECTION_ENTITY = 'sfa_outcome_section';
const CARD_ENTITY = 'sfa_outcome_card';

/** Only images belong in a portrait tile; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

// ── the two buttons ───────────────────────────────────────────────────────

/** Null when the buttons have never been authored - a normal first-run state. */
export const getSection = async (): Promise<SfaOutcomeSection | null> => repo.findSection();

export const upsertSection = async (
  input: UpsertSfaOutcomeSectionInput,
  context: RequestContext,
): Promise<SfaOutcomeSection> =>
  withTransaction(async (client) => {
    const existing = await repo.findSection(client);
    const saved = await repo.upsertSection(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_OUTCOME_SECTION_UPDATED,
        module: MODULE,
        entityType: SECTION_ENTITY,
        entityId: saved.id,
        oldValues: existing ? { primaryLabel: existing.primaryLabel } : undefined,
        newValues: { primaryLabel: saved.primaryLabel },
      },
      context,
      client,
    );

    return saved;
  });

// ── the story cards ───────────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the public read drops the card rather than
  // publishing a face-shaped hole, and the admin list still shows the row.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (card: SfaOutcomeCard): Promise<ResolvedSfaOutcomeCard> => ({
  ...card,
  photo: await resolveSource(card.photoUrl, card.photoFileId),
});

/** Rejects a file id that is not a live image of a usable size. */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const field = 'photoFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Portrait must be an image', [
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

  const problem = checkImageDimensions('sfaOutcomePortrait', dimensions);
  if (problem) {
    throw new ValidationError('Portrait is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

export const listCards = async (
  filters: SfaOutcomeCardFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedSfaOutcomeCard[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllCards(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolved)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getCardById = async (id: string): Promise<ResolvedSfaOutcomeCard> => {
  const card = await repo.findCardById(id);
  if (!card) throw new NotFoundError('Story');
  return toResolved(card);
};

export const createCard = async (
  input: CreateSfaOutcomeCardInput,
  context: RequestContext,
): Promise<ResolvedSfaOutcomeCard> => {
  if (input.photoFileId) await assertUsableImageFile(input.photoFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countCards(client);
    if (existing >= LIMITS.MAX_SFA_OUTCOME_CARDS) {
      throw new ConflictError(
        `The carousel holds at most ${LIMITS.MAX_SFA_OUTCOME_CARDS} stories`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextCardOrder(client));
    const created = await repo.createCard({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_OUTCOME_CARD_CREATED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: created.id,
        newValues: { personName: created.personName, company: created.company },
      },
      context,
      client,
    );

    return toResolved(created);
  });
};

export const updateCard = async (
  id: string,
  patch: UpdateSfaOutcomeCardInput,
  context: RequestContext,
): Promise<ResolvedSfaOutcomeCard> => {
  if (patch.photoFileId) await assertUsableImageFile(patch.photoFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findCardByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Story');

    const updated = await repo.updateCard(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Story');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_OUTCOME_CARD_UPDATED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: id,
        oldValues: { personName: existing.personName, status: existing.status },
        newValues: { personName: updated.personName, status: updated.status },
      },
      context,
      client,
    );

    return toResolved(updated);
  });
};

export const setCardStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedSfaOutcomeCard> => updateCard(id, { status }, context);

export const reorderCards = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedSfaOutcomeCard[]> =>
  withTransaction(async (client) => {
    const total = await repo.countCards(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every story', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingCardIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a story that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyCardOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_OUTCOME_CARDS_REORDERED,
        module: MODULE,
        entityType: CARD_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllCards(
      {},
      { page: 1, limit: LIMITS.MAX_SFA_OUTCOME_CARDS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolved));
  });

export const removeCard = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCardByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Story');

    await repo.removeCard(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_OUTCOME_CARD_DELETED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: id,
        oldValues: { personName: existing.personName, company: existing.company },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy, the two buttons, and the cards.
 *
 * Null when the copy is missing or no card survives - the page then keeps the
 * carousel it ships, which is a complete working one. The buttons may be null
 * on their own, and the site keeps its own pair when they are: a heading with
 * cards under it is still a section.
 *
 * A card whose photo has been deleted is dropped rather than published with a
 * null source, which would leave a coloured square where a face should be.
 */
export const getPublished = async (): Promise<PublicSfaOutcomesSection | null> => {
  const [copy, section, cards] = await Promise.all([
    sectionCopyService.get('sfa-dms', 'outcomes'),
    repo.findSection(),
    repo.findPublishedCards(),
  ]);
  if (!copy) return null;

  const resolved = (await Promise.all(cards.map(toResolved))).filter(
    (card): card is ResolvedSfaOutcomeCard & { photo: string } => card.photo !== null,
  );
  if (resolved.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    buttons: section
      ? {
          primary: { label: section.primaryLabel, href: section.primaryHref },
          secondary: { label: section.secondaryLabel, href: section.secondaryHref },
        }
      : null,
    cards: resolved.map((card) => ({
      title: card.title,
      body: card.body,
      name: card.personName,
      role: card.personRole,
      company: card.company,
      photo: card.photo,
      href: card.linkHref,
    })),
  };
};
