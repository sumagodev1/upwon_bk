// src/modules/product-pages/wms-page/services/capabilities-section.service.ts

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
import * as repo from '../repositories/capabilities-section.repository';
import {
  CreateWmsCapabilityModuleInput,
  PublicWmsCapabilitiesSection,
  ResolvedWmsCapabilityModule,
  UpdateWmsCapabilityModuleInput,
  WmsCapabilityModule,
  WmsCapabilityModuleFilters,
} from '../types/capabilities-section.types';

const MODULE = 'wms_page';
const ENTITY = 'wms_capability_module';

/** Each band's artwork is a composite drawn contained beside the text. */
const PANEL_SLOT = 'wmsCapabilityPanel' as const;

const toResolved = async (module: WmsCapabilityModule): Promise<ResolvedWmsCapabilityModule> => ({
  ...module,
  image: await resolveImageSource(module.imageUrl, module.imageFileId),
});

const toResolvedMany = (
  modules: WmsCapabilityModule[],
): Promise<ResolvedWmsCapabilityModule[]> => Promise.all(modules.map(toResolved));

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: WmsCapabilityModuleFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedWmsCapabilityModule[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return {
    rows: await toResolvedMany(rows),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getById = async (id: string): Promise<ResolvedWmsCapabilityModule> => {
  const module = await repo.findById(id);
  if (!module) throw new NotFoundError('Capability');
  return toResolved(module);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateWmsCapabilityModuleInput,
  context: RequestContext,
): Promise<ResolvedWmsCapabilityModule> => {
  /*
   * Checked before the transaction opens: the dimension check reads the blob
   * back out of storage, and a round trip to storage does not belong inside
   * an open transaction.
   */
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, PANEL_SLOT, 'imageFileId');
  }

  const module = await withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_WMS_CAPABILITY_MODULES) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_WMS_CAPABILITY_MODULES} capabilities. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_CAPABILITY_MODULE_CREATED,
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

  return toResolved(module);
};

export const update = async (
  id: string,
  patch: UpdateWmsCapabilityModuleInput,
  context: RequestContext,
): Promise<ResolvedWmsCapabilityModule> => {
  if (patch.imageFileId) {
    await assertUsableImageFile(patch.imageFileId, PANEL_SLOT, 'imageFileId');
  }

  const module = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Capability');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_CAPABILITY_MODULE_UPDATED,
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

  return toResolved(module);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedWmsCapabilityModule> => update(id, { status }, context);

export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedWmsCapabilityModule[]> => {
  const modules = await withTransaction(async (client) => {
    const total = await repo.count(client);

    const existing = await repo.findExistingIds(ids, client);
    const unknown = ids.filter((id) => !existing.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('The order names a capability that does not exist', [
        {
          field: 'ids',
          message: `Unknown capability ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_WMS_CAPABILITY_MODULE',
        },
      ]);
    }

    if (ids.length !== total) {
      throw new ValidationError('The order must list every capability', [
        {
          field: 'ids',
          message: `Expected all ${total} capability ids, received ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_CAPABILITY_MODULES_REORDERED,
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
      { page: 1, limit: LIMITS.MAX_WMS_CAPABILITY_MODULES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

  return toResolvedMany(modules);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WMS_CAPABILITY_MODULE_DELETED,
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
 * The whole section in one call: the copy above the stack and the bands in it.
 *
 * Null when the copy is missing or no band is drawable - the page then keeps
 * the stack it ships, which is a complete working one.
 *
 * A band whose file has been purged resolves to no image and is dropped
 * rather than drawn as a paragraph beside an empty frame.
 */
export const getPublished = async (): Promise<PublicWmsCapabilitiesSection | null> => {
  const [copy, modules] = await Promise.all([
    sectionCopyService.get('wms', 'capabilities'),
    repo.findPublished(),
  ]);
  if (!copy || modules.length === 0) return null;

  const drawable = (await toResolvedMany(modules)).filter(
    (module): module is ResolvedWmsCapabilityModule & { image: string } => Boolean(module.image),
  );
  if (drawable.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    modules: drawable.map((module) => ({
      title: module.title,
      description: module.description,
      image: module.image,
      imageAlt: module.imageAlt,
    })),
  };
};
