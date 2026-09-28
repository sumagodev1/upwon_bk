// src/modules/clients-page/services/roster-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../home-page/services/section-copy.service';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as repo from '../repositories/roster-section.repository';
import {
  ClientsRosterLogo,
  ClientsRosterLogoFilters,
  CreateClientsRosterLogoInput,
  PublicClientsRosterSection,
  ResolvedClientsRosterLogo,
  UpdateClientsRosterLogoInput,
} from '../types/roster-section.types';
import { CLIENTS_IMAGE_SPECS } from '../utils/clients-image-spec';

const MODULE = 'clients_page';
const ENTITY = 'clients_roster_logo';

const toResolved = async (logo: ClientsRosterLogo): Promise<ResolvedClientsRosterLogo> => ({
  ...logo,
  image: await resolveImageSource(logo.imageUrl, logo.imageFileId),
});

const toResolvedMany = (logos: ClientsRosterLogo[]): Promise<ResolvedClientsRosterLogo[]> =>
  Promise.all(logos.map(toResolved));

const auditSnapshot = (logo: ClientsRosterLogo): Record<string, unknown> => ({
  name: logo.name,
  imageUrl: logo.imageUrl,
  imageFileId: logo.imageFileId,
  displayOrder: logo.displayOrder,
  status: logo.status,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: ClientsRosterLogoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedClientsRosterLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedClientsRosterLogo> => {
  const logo = await repo.findById(id);
  if (!logo) throw new NotFoundError('Roster logo');
  return toResolved(logo);
};

/**
 * The website-facing read: the copy and every active logo in one response.
 * Null when the copy or the logos are missing - the page keeps its own.
 */
export const getPublished = async (): Promise<PublicClientsRosterSection | null> => {
  const [copy, logos] = await Promise.all([
    sectionCopyService.get('clients', 'trust'),
    repo.findPublished(),
  ]);
  if (!copy || logos.length === 0) return null;

  const resolved = await toResolvedMany(logos);
  const rendered = resolved
    // A logo whose upload was purged is dropped: an empty tile is worse than
    // one logo fewer.
    .filter((logo): logo is ResolvedClientsRosterLogo & { image: string } => logo.image !== null)
    .map((logo) => ({ name: logo.name, image: logo.image }));

  if (rendered.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext,
    logos: rendered,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateClientsRosterLogoInput,
  context: RequestContext,
): Promise<ResolvedClientsRosterLogo> => {
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, CLIENTS_IMAGE_SPECS.rosterLogo, 'imageFileId');
  }

  const logo = await withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_CLIENTS_ROSTER_LOGOS) {
      throw new ConflictError(
        `The roster holds at most ${LIMITS.MAX_CLIENTS_ROSTER_LOGOS} logos. Delete or deactivate one first.`,
        'ROSTER_LOGO_LIMIT_REACHED',
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_ROSTER_LOGO_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: auditSnapshot(created),
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(logo);
};

export const update = async (
  id: string,
  patch: UpdateClientsRosterLogoInput,
  context: RequestContext,
): Promise<ResolvedClientsRosterLogo> => {
  if (patch.imageFileId) {
    await assertUsableImageFile(patch.imageFileId, CLIENTS_IMAGE_SPECS.rosterLogo, 'imageFileId');
  }

  const logo = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Roster logo');

    // Clearing the source in use without supplying the other would leave an
    // empty tile - caught here, where the stored row is visible.
    const urlAfter = patch.imageUrl !== undefined ? patch.imageUrl : existing.imageUrl;
    const fileAfter = patch.imageFileId !== undefined ? patch.imageFileId : existing.imageFileId;
    if (urlAfter === null && fileAfter === null) {
      throw new ValidationError('The logo cannot lose its image', [
        {
          field: 'imageFileId',
          message: 'A logo needs an image: upload one or give an image URL',
          code: 'REQUIRED',
        },
      ]);
    }

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Roster logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_ROSTER_LOGO_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
        newValues: auditSnapshot(updated),
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(logo);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedClientsRosterLogo> => {
  const logo = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Roster logo');

    // Already in the requested state: no no-op write, no misleading audit row.
    if (existing.status === status) return existing;

    const updated = await repo.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Roster logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_ROSTER_LOGO_STATUS_CHANGED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(logo);
};

/** Takes the complete id list in its new order; partial lists are rejected. */
export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedClientsRosterLogo[]> => {
  const logos = await withTransaction(async (client) => {
    const total = await repo.count(client);
    if (ids.length !== total) {
      throw new ValidationError('The order must list every logo', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a logo that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_ROSTER_LOGOS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_CLIENTS_ROSTER_LOGOS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

  return toResolvedMany(logos);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Roster logo');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_ROSTER_LOGO_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
      },
      context,
      client,
    );
  });
};
