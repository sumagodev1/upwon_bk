// src/modules/industry-pages/fmcg-page/services/platform-section.service.ts

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
import * as repo from '../repositories/platform-section.repository';
import { assertUsableImageFile, resolveSource } from '../utils/media';
import {
  FmcgPlatformTile,
  FmcgPlatformTileFilters,
  CreateFmcgPlatformTileInput,
  PublicFmcgPlatformSection,
  ResolvedFmcgPlatformTile,
  UpdateFmcgPlatformTileInput,
} from '../types/platform-section.types';

const MODULE = 'fmcg_page';
const ENTITY = 'fmcg_platform_tile';

const toResolved = async (tile: FmcgPlatformTile): Promise<ResolvedFmcgPlatformTile> => ({
  ...tile,
  icon: await resolveSource(tile.iconUrl, tile.iconFileId),
});

const toResolvedMany = (tiles: FmcgPlatformTile[]): Promise<ResolvedFmcgPlatformTile[]> =>
  Promise.all(tiles.map(toResolved));

const assertTileIcon = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, 'fmcgPlatformIcon', 'iconFileId', 'Tile icon');

/**
 * Refuses a second tile with the same name.
 *
 * Two "Cloud ERP" tiles side by side read as a mistake rather than as more
 * choice, and it is the one duplicate an editor is likely to create by
 * accident - adding a tile back instead of re-activating the old one.
 *
 * @param excludeId the tile being renamed, so re-saving its own name is fine
 */
const assertUniqueLabel = async (
  label: string,
  excludeId: string | null,
  client: Executor,
): Promise<void> => {
  const clash = await repo.findByLabel(label, client);
  if (clash && clash.id !== excludeId) {
    throw new ConflictError(
      `A tile named "${clash.label}" already exists. Edit or re-activate that one instead.`,
    );
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: FmcgPlatformTileFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedFmcgPlatformTile[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedFmcgPlatformTile> => {
  const tile = await repo.findById(id);
  if (!tile) throw new NotFoundError('Platform tile');
  return toResolved(tile);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy and at least one tile with a usable mark. With
 * either missing the site keeps the section it ships.
 */
export const getPublished = async (): Promise<PublicFmcgPlatformSection | null> => {
  const [copy, tiles] = await Promise.all([
    sectionCopyService.get('fmcg', 'platform'),
    repo.findPublished(),
  ]);
  if (!copy) return null;

  const resolved = (await toResolvedMany(tiles))
    .filter((tile): tile is ResolvedFmcgPlatformTile & { icon: string } => tile.icon !== null)
    .map((tile) => ({ label: tile.label, href: tile.href, icon: tile.icon }));
  if (resolved.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    tiles: resolved,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateFmcgPlatformTileInput,
  context: RequestContext,
): Promise<ResolvedFmcgPlatformTile> => {
  if (input.iconFileId) await assertTileIcon(input.iconFileId);

  const tile = await withTransaction(async (client) => {
    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_FMCG_PLATFORM_TILES) {
      throw new ConflictError(
        `The grid holds at most ${LIMITS.MAX_FMCG_PLATFORM_TILES} tiles. Delete one first.`,
      );
    }
    await assertUniqueLabel(input.label, null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMCG_PLATFORM_TILE_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { label: created.label, href: created.href, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(tile);
};

export const update = async (
  id: string,
  patch: UpdateFmcgPlatformTileInput,
  context: RequestContext,
): Promise<ResolvedFmcgPlatformTile> => {
  if (patch.iconFileId) await assertTileIcon(patch.iconFileId);

  const tile = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Platform tile');
    if (patch.label !== undefined) await assertUniqueLabel(patch.label, id, client);

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Platform tile');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMCG_PLATFORM_TILE_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { label: existing.label, href: existing.href, status: existing.status },
        newValues: { label: updated.label, href: updated.href, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(tile);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedFmcgPlatformTile> => update(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedFmcgPlatformTile[]> => {
  const tiles = await withTransaction(async (client) => {
    const total = await repo.countAll(client);

    if (orderedIds.length !== total) {
      throw new ValidationError('The order must list every tile', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existingIds = await repo.findExistingIds(orderedIds, client);
    if (existingIds.length !== orderedIds.length) {
      throw new ValidationError('The order names a tile that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMCG_PLATFORM_TILES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_FMCG_PLATFORM_TILES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(tiles.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Platform tile');

    await repo.remove(id, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMCG_PLATFORM_TILE_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { label: existing.label, href: existing.href },
      },
      context,
      client,
    );
  });
};
