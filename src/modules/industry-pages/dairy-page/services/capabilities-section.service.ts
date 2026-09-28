// src/modules/industry-pages/dairy-page/services/capabilities-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { Executor } from '../../../../config/database';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/capabilities-section.repository';
import { assertUsableImageFile, resolveSource } from '../utils/media';
import {
  CreateDairyCapabilityCardInput,
  PublicDairyCapabilitiesSection,
  ResolvedDairyCapabilitiesPanel,
  DairyCapabilitiesPanel,
  UpsertDairyCapabilitiesPanelInput,
  DairyCapabilityCard,
  DairyCapabilityCardFilters,
  UpdateDairyCapabilityCardInput,
} from '../types/capabilities-section.types';

const MODULE = 'dairy_page';
const ENTITY = 'dairy_capability_card';

const toResolved = async (item: DairyCapabilityCard): Promise<DairyCapabilityCard> => item;

const toResolvedMany = (items: DairyCapabilityCard[]): Promise<DairyCapabilityCard[]> => Promise.all(items.map(toResolved));

/**
 * Refuses a second live capability with the same title.
 *
 * Two identical entries side by side read as a mistake rather than as more
 * content - most often an item added back instead of re-activating the old one.
 * Soft-deleted rows are ignored, so a deleted capability's title can be reused.
 *
 * @param excludeId the capability being edited, so re-saving its own value is fine
 */
const assertUnique = async (
  value: string,
  excludeId: string | null,
  client: Executor,
): Promise<void> => {
  const clash = await repo.findByTitle(value, client);
  if (clash && clash.id !== excludeId) {
    throw new ConflictError(
      `A capability "${clash.title}" already exists. Edit or re-activate that one instead.`,
    );
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: DairyCapabilityCardFilters,
  pagination: PaginationParams,
): Promise<{ rows: DairyCapabilityCard[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<DairyCapabilityCard> => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('Capability card');
  return toResolved(item);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy and at least one live capability. With either
 * missing the site hides the section.
 */
export const getPublished = async (): Promise<PublicDairyCapabilitiesSection | null> => {
  const [copy, items, panel] = await Promise.all([
    sectionCopyService.get('dairy', 'capabilities'),
    repo.findPublished(),
    repo.findPanel(),
  ]);
  if (!copy) return null;

  const resolved = (await toResolvedMany(items))
    .map((item) => ({ icon: item.icon, title: item.title, description: item.description }));
  if (resolved.length === 0) return null;
  const resolvedPanel = panel ? await toResolvedPanel(panel) : null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    panel: resolvedPanel?.image ? { image: resolvedPanel.image, alt: resolvedPanel.alt } : null,
    cards: resolved,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateDairyCapabilityCardInput,
  context: RequestContext,
): Promise<DairyCapabilityCard> => {

  const item = await withTransaction(async (client) => {
    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_DAIRY_CAPABILITY_CARDS) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_DAIRY_CAPABILITY_CARDS} capabilities. Delete one first.`,
      );
    }
    await assertUnique(input.title, null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_CAPABILITY_CARD_CREATED,
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

  return toResolved(item);
};

export const update = async (
  id: string,
  patch: UpdateDairyCapabilityCardInput,
  context: RequestContext,
): Promise<DairyCapabilityCard> => {

  const item = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability card');
    if (patch.title !== undefined) await assertUnique(patch.title, id, client);

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Capability card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_CAPABILITY_CARD_UPDATED,
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

  return toResolved(item);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<DairyCapabilityCard> => update(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<DairyCapabilityCard[]> => {
  const items = await withTransaction(async (client) => {
    const total = await repo.countAll(client);

    if (orderedIds.length !== total) {
      throw new ValidationError('The order must list every capability', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existingIds = await repo.findExistingIds(orderedIds, client);
    if (existingIds.length !== orderedIds.length) {
      throw new ValidationError('The order names a capability that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_CAPABILITY_CARDS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAll({}, { page: 1, limit: LIMITS.MAX_DAIRY_CAPABILITY_CARDS, offset: 0 }, client);
  });

  return toResolvedMany(items.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability card');

    await repo.remove(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_CAPABILITY_CARD_DELETED,
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

// ── the panel image ───────────────────────────────────────────────────────

const toResolvedPanel = async (panel: DairyCapabilitiesPanel): Promise<ResolvedDairyCapabilitiesPanel> => ({
  ...panel,
  image: await resolveSource(panel.imageUrl, panel.imageFileId),
});

/** Null when the panel has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<ResolvedDairyCapabilitiesPanel | null> => {
  const panel = await repo.findPanel();
  return panel ? toResolvedPanel(panel) : null;
};

export const upsertPanel = async (
  input: UpsertDairyCapabilitiesPanelInput,
  context: RequestContext,
): Promise<ResolvedDairyCapabilitiesPanel> => {
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, 'dairyCapabilitiesPanel', 'imageFileId', 'Collage image');
  }

  return withTransaction(async (client) => {
    const existing = await repo.findPanel(client);
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_CAPABILITIES_PANEL_UPDATED,
        module: MODULE,
        entityType: 'dairy_capabilities_panel',
        entityId: saved.id,
        oldValues: existing ? { alt: existing.alt } : undefined,
        newValues: { alt: saved.alt },
      },
      context,
      client,
    );

    return toResolvedPanel(saved);
  });
};
