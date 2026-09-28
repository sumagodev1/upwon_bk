// src/modules/industry-pages/bakery-page/services/helps-section.service.ts

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
import * as repo from '../repositories/helps-section.repository';
import { assertUsableImageFile, resolveSource } from '../utils/media';
import {
  BakeryHelpVisual,
  BakeryHelpVisualFilters,
  CreateBakeryHelpVisualInput,
  PublicBakeryHelpsSection,
  ResolvedBakeryHelpVisual,
  UpdateBakeryHelpVisualInput,
} from '../types/helps-section.types';

const MODULE = 'bakery_page';
const ENTITY = 'bakery_help_visual';

const toResolved = async (visual: BakeryHelpVisual): Promise<ResolvedBakeryHelpVisual> => ({
  ...visual,
  image: await resolveSource(visual.imageUrl, visual.imageFileId),
});

const toResolvedMany = (visuals: BakeryHelpVisual[]): Promise<ResolvedBakeryHelpVisual[]> =>
  Promise.all(visuals.map(toResolved));

const assertDiagramImage = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, 'bakeryHelpVisual', 'imageFileId', 'Diagram');

/**
 * Refuses a second live diagram.
 *
 * The section renders one image, so two active rows would mean one of them is
 * silently invisible. The partial unique index is the actual guarantee - it
 * holds even when two administrators activate different rows at once. This
 * check exists so the ordinary case gets a message naming what to do, rather
 * than a raw constraint violation.
 *
 * @param excludeId the row being changed, so re-saving the live one is fine
 */
const assertNoOtherActive = async (excludeId: string | null, client: Executor): Promise<void> => {
  const active = await repo.findActive(client);
  if (!active || active.id === excludeId) return;

  throw new ConflictError(
    'Another diagram is already live, and this section shows one at a time. Deactivate it first.',
  );
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: BakeryHelpVisualFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedBakeryHelpVisual[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedBakeryHelpVisual> => {
  const visual = await repo.findById(id);
  if (!visual) throw new NotFoundError('Diagram');
  return toResolved(visual);
};

/**
 * The copy and the one live diagram.
 *
 * Null rather than a partial section, so "nothing published" stays
 * distinguishable from "a section with empty fields" - the site then keeps the
 * copy and diagram it ships. A live row whose uploaded file has since been
 * deleted counts as nothing published, rather than a broken image.
 */
export const getPublished = async (): Promise<PublicBakeryHelpsSection | null> => {
  const [copy, active] = await Promise.all([
    sectionCopyService.get('bakery', 'helps'),
    repo.findActive(),
  ]);
  if (!copy || !active) return null;

  const resolved = await toResolved(active);
  if (!resolved.image) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    image: resolved.image,
    alt: resolved.alt,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateBakeryHelpVisualInput,
  context: RequestContext,
): Promise<ResolvedBakeryHelpVisual> => {
  if (input.imageFileId) await assertDiagramImage(input.imageFileId);

  const visual = await withTransaction(async (client) => {
    if (input.status === 'ACTIVE') await assertNoOtherActive(null, client);

    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_BAKERY_HELP_VISUALS) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_BAKERY_HELP_VISUALS} diagrams. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_HELP_VISUAL_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { alt: created.alt, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(visual);
};

export const update = async (
  id: string,
  patch: UpdateBakeryHelpVisualInput,
  context: RequestContext,
): Promise<ResolvedBakeryHelpVisual> => {
  if (patch.imageFileId) await assertDiagramImage(patch.imageFileId);

  const visual = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Diagram');

    if (patch.status === 'ACTIVE') await assertNoOtherActive(id, client);

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Diagram');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_HELP_VISUAL_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { alt: existing.alt, status: existing.status },
        newValues: { alt: updated.alt, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(visual);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedBakeryHelpVisual> => update(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * Order does not choose the live diagram - status does - but it keeps the
 * admin list in the sequence an editor arranged it.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedBakeryHelpVisual[]> => {
  const visuals = await withTransaction(async (client) => {
    const total = await repo.countAll(client);

    if (orderedIds.length !== total) {
      throw new ValidationError('The order must list every diagram', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existingIds = await repo.findExistingIds(orderedIds, client);
    if (existingIds.length !== orderedIds.length) {
      throw new ValidationError('The order names a diagram that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_HELP_VISUALS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    return repo.findAll({}, { page: 1, limit: LIMITS.MAX_BAKERY_HELP_VISUALS, offset: 0 }, client);
  });

  return toResolvedMany(visuals.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Diagram');

    await repo.remove(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BAKERY_HELP_VISUAL_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { alt: existing.alt },
      },
      context,
      client,
    );
  });
};
