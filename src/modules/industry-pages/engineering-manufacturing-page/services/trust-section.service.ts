// src/modules/industry-pages/engineering-manufacturing-page/services/trust-section.service.ts

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
import * as repo from '../repositories/trust-section.repository';
import {
  CreateEngineeringTrustCardInput,
  CreateEngineeringTrustLogoInput,
  EngineeringTrustCard,
  EngineeringTrustCardFilters,
  EngineeringTrustLogo,
  EngineeringTrustLogoFilters,
  PublicEngineeringTrustSection,
  ResolvedEngineeringTrustLogo,
  UpdateEngineeringTrustCardInput,
  UpdateEngineeringTrustLogoInput,
} from '../types/trust-section.types';

const MODULE = 'engineering_manufacturing_page';
const LOGO_ENTITY = 'engineering_trust_logo';
const CARD_ENTITY = 'engineering_trust_card';

/** Only images belong in the marquee; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

/*
 * The marks are checked against the home page's trust-strip slot rather than a
 * slot of their own, as the FMS proof strip's are: the same brand logos, drawn
 * the same way - object-contain at a fixed height.
 */
const LOGO_SLOT = 'trustLogo' as const;

// ── the logo marquee ──────────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the marquee skips that mark rather than
  // failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedLogo = async (
  logo: EngineeringTrustLogo,
): Promise<ResolvedEngineeringTrustLogo> => ({
  ...logo,
  image: await resolveSource(logo.imageUrl, logo.imageFileId),
});

/** Rejects a file id that is not a live image of the right shape for the slot. */
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

  const problem = checkImageDimensions(LOGO_SLOT, dimensions);
  if (problem) {
    throw new ValidationError('Logo is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

export const listLogos = async (
  filters: EngineeringTrustLogoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedEngineeringTrustLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllLogos(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedLogo)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getLogoById = async (id: string): Promise<ResolvedEngineeringTrustLogo> => {
  const logo = await repo.findLogoById(id);
  if (!logo) throw new NotFoundError('Logo');
  return toResolvedLogo(logo);
};

export const createLogo = async (
  input: CreateEngineeringTrustLogoInput,
  context: RequestContext,
): Promise<ResolvedEngineeringTrustLogo> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countLogos(client);
    if (existing >= LIMITS.MAX_ENGINEERING_TRUST_LOGOS) {
      throw new ConflictError(
        `The marquee holds at most ${LIMITS.MAX_ENGINEERING_TRUST_LOGOS} logos`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextLogoOrder(client));
    const created = await repo.createLogo({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_TRUST_LOGO_CREATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: created.id,
        newValues: { alt: created.alt, status: created.status },
      },
      context,
      client,
    );

    return toResolvedLogo(created);
  });
};

export const updateLogo = async (
  id: string,
  patch: UpdateEngineeringTrustLogoInput,
  context: RequestContext,
): Promise<ResolvedEngineeringTrustLogo> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    const updated = await repo.updateLogo(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_TRUST_LOGO_UPDATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { alt: existing.alt, status: existing.status },
        newValues: { alt: updated.alt, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedLogo(updated);
  });
};

export const setLogoStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedEngineeringTrustLogo> => updateLogo(id, { status }, context);

export const reorderLogos = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedEngineeringTrustLogo[]> =>
  withTransaction(async (client) => {
    const total = await repo.countLogos(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every logo', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingLogoIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a logo that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyLogoOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_TRUST_LOGOS_REORDERED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllLogos(
      {},
      { page: 1, limit: LIMITS.MAX_ENGINEERING_TRUST_LOGOS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedLogo));
  });

export const removeLogo = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    await repo.removeLogo(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_TRUST_LOGO_DELETED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { alt: existing.alt },
      },
      context,
      client,
    );
  });
};

// ── the figure cards ──────────────────────────────────────────────────────

export const listCards = async (
  filters: EngineeringTrustCardFilters,
  pagination: PaginationParams,
): Promise<{ rows: EngineeringTrustCard[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllCards(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getCardById = async (id: string): Promise<EngineeringTrustCard> => {
  const card = await repo.findCardById(id);
  if (!card) throw new NotFoundError('Card');
  return card;
};

export const createCard = async (
  input: CreateEngineeringTrustCardInput,
  context: RequestContext,
): Promise<EngineeringTrustCard> =>
  withTransaction(async (client) => {
    const existing = await repo.countCards(client);
    if (existing >= LIMITS.MAX_ENGINEERING_TRUST_CARDS) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_ENGINEERING_TRUST_CARDS} cards - it is a three-column grid`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextCardOrder(client));
    const created = await repo.createCard({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_TRUST_CARD_CREATED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: created.id,
        newValues: { label: created.label, value: created.value },
      },
      context,
      client,
    );

    return created;
  });

export const updateCard = async (
  id: string,
  patch: UpdateEngineeringTrustCardInput,
  context: RequestContext,
): Promise<EngineeringTrustCard> =>
  withTransaction(async (client) => {
    const existing = await repo.findCardByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Card');

    const updated = await repo.updateCard(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_TRUST_CARD_UPDATED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, value: existing.value },
        newValues: { label: updated.label, value: updated.value },
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
): Promise<EngineeringTrustCard> => updateCard(id, { status }, context);

export const reorderCards = async (
  ids: string[],
  context: RequestContext,
): Promise<EngineeringTrustCard[]> =>
  withTransaction(async (client) => {
    const total = await repo.countCards(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every card', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingCardIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a card that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyCardOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_TRUST_CARDS_REORDERED,
        module: MODULE,
        entityType: CARD_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllCards(
      {},
      { page: 1, limit: LIMITS.MAX_ENGINEERING_TRUST_CARDS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeCard = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCardByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Card');

    await repo.removeCard(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ENGINEERING_TRUST_CARD_DELETED,
        module: MODULE,
        entityType: CARD_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, value: existing.value },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy, the cards and the logos.
 *
 * Null when the copy is missing, or when neither list has anything to show -
 * the page then keeps the section it ships. One empty list is allowed.
 *
 * A logo whose file has been deleted is dropped rather than published with a
 * null source, which would render a broken image in the marquee.
 */
export const getPublished = async (): Promise<PublicEngineeringTrustSection | null> => {
  const [copy, cards, logos] = await Promise.all([
    sectionCopyService.get('engineering-manufacturing', 'trust'),
    repo.findPublishedCards(),
    repo.findPublishedLogos(),
  ]);
  if (!copy) return null;

  const resolvedLogos = (await Promise.all(logos.map(toResolvedLogo)))
    .filter(
      (logo): logo is ResolvedEngineeringTrustLogo & { image: string } => logo.image !== null,
    )
    .map((logo) => ({ image: logo.image, alt: logo.alt }));

  if (resolvedLogos.length === 0 && cards.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    cards: cards.map((card) => ({
      icon: card.icon,
      accentColor: card.accentColor,
      tintColor: card.tintColor,
      figures: [{ value: card.value, label: card.label }, ...(card.alternate ? [card.alternate] : [])],
    })),
    logos: resolvedLogos,
  };
};
