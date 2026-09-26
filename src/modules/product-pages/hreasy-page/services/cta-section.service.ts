// src/modules/product-pages/hreasy-page/services/cta-section.service.ts

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
import * as repo from '../repositories/cta-section.repository';
import {
  CreateHreasyCtaTrustItemInput,
  HreasyCtaSection,
  HreasyCtaTrustItem,
  HreasyCtaTrustItemFilters,
  PublicHreasyCtaSection,
  ResolvedHreasyCtaSection,
  UpdateHreasyCtaTrustItemInput,
  UpsertHreasyCtaSectionInput,
} from '../types/cta-section.types';

const MODULE = 'hreasy_page';
const SECTION_ENTITY = 'hreasy_cta_section';
const TRUST_ENTITY = 'hreasy_cta_trust_item';

/** The banner is a wide cover crop, the same shape the other bands use. */
const BANNER_SLOT = 'hreasyCtaBanner' as const;

// ── the band ──────────────────────────────────────────────────────────────

const toResolved = async (
  section: HreasyCtaSection,
): Promise<ResolvedHreasyCtaSection> => ({
  ...section,
  image: await resolveImageSource(section.imageUrl, section.imageFileId),
});

/** Null before the band has ever been authored - a normal first-run state. */
export const getSection = async (): Promise<ResolvedHreasyCtaSection | null> => {
  const section = await repo.findSection();
  return section ? toResolved(section) : null;
};

export const saveSection = async (
  input: UpsertHreasyCtaSectionInput,
  context: RequestContext,
): Promise<ResolvedHreasyCtaSection> => {
  // Checked before the transaction opens: a storage round trip does not
  // belong inside one.
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, BANNER_SLOT, 'imageFileId');
  }

  return withTransaction(async (client) => {
    const existing = await repo.findSection(client);
    const saved = await repo.upsertSection(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_CTA_SECTION_UPDATED,
        module: MODULE,
        entityType: SECTION_ENTITY,
        entityId: saved.id,
        oldValues: existing ? { primaryLabel: existing.primaryLabel } : undefined,
        newValues: { primaryLabel: saved.primaryLabel },
      },
      context,
      client,
    );

    return toResolved(saved);
  });
};

// ── the trust strip ───────────────────────────────────────────────────────

export const listTrustItems = async (
  filters: HreasyCtaTrustItemFilters,
  pagination: PaginationParams,
): Promise<{ rows: HreasyCtaTrustItem[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllTrustItems(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getTrustItemById = async (id: string): Promise<HreasyCtaTrustItem> => {
  const item = await repo.findTrustItemById(id);
  if (!item) throw new NotFoundError('Trust item');
  return item;
};

export const createTrustItem = async (
  input: CreateHreasyCtaTrustItemInput,
  context: RequestContext,
): Promise<HreasyCtaTrustItem> =>
  withTransaction(async (client) => {
    const existing = await repo.countTrustItems(client);
    if (existing >= LIMITS.MAX_HREASY_CTA_TRUST_ITEMS) {
      throw new ConflictError(
        `The strip holds at most ${LIMITS.MAX_HREASY_CTA_TRUST_ITEMS} items - it is one row of four`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextTrustItemOrder(client));
    const created = await repo.createTrustItem(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_CTA_TRUST_ITEM_CREATED,
        module: MODULE,
        entityType: TRUST_ENTITY,
        entityId: created.id,
        newValues: { lineOne: created.lineOne, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateTrustItem = async (
  id: string,
  patch: UpdateHreasyCtaTrustItemInput,
  context: RequestContext,
): Promise<HreasyCtaTrustItem> =>
  withTransaction(async (client) => {
    const existing = await repo.findTrustItemByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Trust item');

    const updated = await repo.updateTrustItem(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Trust item');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_CTA_TRUST_ITEM_UPDATED,
        module: MODULE,
        entityType: TRUST_ENTITY,
        entityId: id,
        oldValues: { lineOne: existing.lineOne, status: existing.status },
        newValues: { lineOne: updated.lineOne, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setTrustItemStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<HreasyCtaTrustItem> => updateTrustItem(id, { status }, context);

export const reorderTrustItems = async (
  ids: string[],
  context: RequestContext,
): Promise<HreasyCtaTrustItem[]> =>
  withTransaction(async (client) => {
    const total = await repo.countTrustItems(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every item', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingTrustItemIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names an item that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyTrustItemOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_CTA_TRUST_ITEMS_REORDERED,
        module: MODULE,
        entityType: TRUST_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllTrustItems(
      {},
      { page: 1, limit: LIMITS.MAX_HREASY_CTA_TRUST_ITEMS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const removeTrustItem = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findTrustItemByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Trust item');

    await repo.removeTrustItem(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_CTA_TRUST_ITEM_DELETED,
        module: MODULE,
        entityType: TRUST_ENTITY,
        entityId: id,
        oldValues: { lineOne: existing.lineOne },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole band in one call.
 *
 * Null when either the copy or the band itself is missing - the page then
 * keeps the band it ships, which is a complete working one. An empty trust
 * strip is not a reason to fall back: the band reads perfectly well as a
 * banner with two buttons.
 */
export const getPublished = async (): Promise<PublicHreasyCtaSection | null> => {
  const [copy, section, trust] = await Promise.all([
    sectionCopyService.get('hreasy', 'cta'),
    repo.findSection(),
    repo.findPublishedTrustItems(),
  ]);
  if (!copy || !section) return null;

  const resolved = await toResolved(section);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    image: resolved.image,
    primary: {
      label: resolved.primaryLabel,
      href: resolved.primaryHref,
      icon: resolved.primaryIcon,
    },
    /*
     * All three parts or none - the table enforces it, so a secondary label
     * arriving without its icon is not a case the site has to handle.
     */
    secondary:
      resolved.secondaryLabel && resolved.secondaryHref && resolved.secondaryIcon
        ? {
            label: resolved.secondaryLabel,
            href: resolved.secondaryHref,
            icon: resolved.secondaryIcon,
          }
        : null,
    trust: trust.map((item) => ({
      icon: item.icon,
      lineOne: item.lineOne,
      lineTwo: item.lineTwo,
    })),
  };
};
