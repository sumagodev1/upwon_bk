// src/modules/product-pages/hreasy-page/services/proof-section.service.ts

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
import * as repo from '../repositories/proof-section.repository';
import {
  CreateHreasyProofCellInput,
  CreateHreasyProofTileInput,
  HreasyProofCell,
  HreasyProofCellFilters,
  HreasyProofTile,
  HreasyProofTileFilters,
  PublicHreasyProofSection,
  PublicHreasyProofTile,
  ResolvedHreasyProofCell,
  ResolvedHreasyProofTile,
  TILES_PER_SHAPE,
  UpdateHreasyProofCellInput,
} from '../types/proof-section.types';

const MODULE = 'hreasy_page';
const TILE_ENTITY = 'hreasy_proof_tile';
const CELL_ENTITY = 'hreasy_proof_cell';

/*
 * The marks are checked against the home page's trust-strip slot: the same
 * brand logos, drawn the same way - object-contain at a fixed height - so the
 * rule that fits one fits the other.
 */
const LOGO_SLOT = 'trustLogo' as const;

// ── the tiles ─────────────────────────────────────────────────────────────

const toResolvedTile = async (tile: HreasyProofTile): Promise<ResolvedHreasyProofTile> => ({
  ...tile,
  image: await resolveImageSource(tile.imageUrl, tile.imageFileId),
});

export const listTiles = async (
  filters: HreasyProofTileFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedHreasyProofTile[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllTiles(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedTile)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getTileById = async (id: string): Promise<ResolvedHreasyProofTile> => {
  const tile = await repo.findTileById(id);
  if (!tile) throw new NotFoundError('Card');
  return toResolvedTile(tile);
};

export const createTile = async (
  input: CreateHreasyProofTileInput,
  context: RequestContext,
): Promise<ResolvedHreasyProofTile> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId, LOGO_SLOT, 'imageFileId');

  return withTransaction(async (client) => {
    const existing = await repo.countTiles(client);
    if (existing >= LIMITS.MAX_HREASY_PROOF_TILES) {
      throw new ConflictError(`The bento holds at most ${LIMITS.MAX_HREASY_PROOF_TILES} cards`);
    }

    const created = await repo.createTile(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PROOF_TILE_CREATED,
        module: MODULE,
        entityType: TILE_ENTITY,
        entityId: created.id,
        newValues: {
          kind: created.kind,
          name: created.name ?? created.client,
          status: created.status,
        },
      },
      context,
      client,
    );

    return toResolvedTile(created);
  });
};

export const updateTile = async (
  id: string,
  input: CreateHreasyProofTileInput,
  context: RequestContext,
): Promise<ResolvedHreasyProofTile> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId, LOGO_SLOT, 'imageFileId');

  return withTransaction(async (client) => {
    const existing = await repo.findTileById(id, client);
    if (!existing) throw new NotFoundError('Card');

    const updated = await repo.updateTile(id, input, context.adminId, client);
    if (!updated) throw new NotFoundError('Card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PROOF_TILE_UPDATED,
        module: MODULE,
        entityType: TILE_ENTITY,
        entityId: id,
        oldValues: {
          kind: existing.kind,
          name: existing.name ?? existing.client,
          status: existing.status,
        },
        newValues: {
          kind: updated.kind,
          name: updated.name ?? updated.client,
          status: updated.status,
        },
      },
      context,
      client,
    );

    return toResolvedTile(updated);
  });
};

/**
 * Switches a card on or off.
 *
 * A whole-row update, because that is the only write the tile repository has -
 * a card is small enough that replacing it is clearer than patching it. The
 * card is re-read first so the rest of its fields are carried through
 * unchanged.
 *
 * Every column placing an inactive card drops out of the published bento, and
 * comes back when the card is switched on again.
 */
export const setTileStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedHreasyProofTile> => {
  const existing = await repo.findTileById(id);
  if (!existing) throw new NotFoundError('Card');

  return updateTile(
    id,
    {
      kind: existing.kind,
      name: existing.name,
      imageUrl: existing.imageUrl,
      imageFileId: existing.imageFileId,
      value: existing.value,
      label: existing.label,
      client: existing.client,
      headline: existing.headline,
      line: existing.line,
      status,
    },
    context,
  );
};

/**
 * Deletes a card, refusing while a column still draws it.
 *
 * The foreign keys are RESTRICT, so the database would refuse anyway - but a
 * raw constraint violation tells an editor nothing. Checking first lets the
 * error say how many columns are using it.
 */
export const removeTile = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findTileById(id, client);
    if (!existing) throw new NotFoundError('Card');

    const usedBy = await repo.findCellsUsingTile(id, client);
    if (usedBy.length > 0) {
      throw new ConflictError(
        `This card is still drawn by ${usedBy.length} column${usedBy.length === 1 ? '' : 's'}. Remove it from the arrangement first.`,
      );
    }

    await repo.removeTile(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PROOF_TILE_DELETED,
        module: MODULE,
        entityType: TILE_ENTITY,
        entityId: id,
        oldValues: { kind: existing.kind, name: existing.name ?? existing.client },
      },
      context,
      client,
    );
  });
};

// ── the cells ─────────────────────────────────────────────────────────────

/** Attaches a cell's tiles, in slot order, skipping any that went missing. */
const toResolvedCell = async (cell: HreasyProofCell): Promise<ResolvedHreasyProofCell> => {
  const ids = [cell.tileAId, cell.tileBId, cell.tileCId].filter(
    (id): id is string => id !== null,
  );
  const tiles = await repo.findTilesByIds(ids);
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));

  const ordered = ids
    .map((id) => byId.get(id))
    .filter((tile): tile is HreasyProofTile => tile !== undefined);

  return { ...cell, tiles: await Promise.all(ordered.map(toResolvedTile)) };
};

export const listCells = async (
  filters: HreasyProofCellFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedHreasyProofCell[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllCells(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedCell)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getCellById = async (id: string): Promise<ResolvedHreasyProofCell> => {
  const cell = await repo.findCellById(id);
  if (!cell) throw new NotFoundError('Column');
  return toResolvedCell(cell);
};

/**
 * Refuses slots naming a card that does not exist.
 *
 * The foreign keys would catch it, but the message would name a constraint
 * rather than the slot the editor filled in.
 */
const assertTilesExist = async (
  ids: Array<string | null>,
  client: Parameters<typeof repo.findTilesByIds>[1],
): Promise<void> => {
  const wanted = ids.filter((id): id is string => id !== null);
  const found = await repo.findTilesByIds(wanted, client);
  if (found.length === new Set(wanted).size) return;

  const known = new Set(found.map((tile) => tile.id));
  const missing = wanted.filter((id) => !known.has(id));
  throw new ValidationError('The column names a card that does not exist', [
    {
      field: 'tileAId',
      message: `No such card: ${missing.join(', ')}`,
      code: 'UNKNOWN_TILE',
    },
  ]);
};

export const createCell = async (
  input: CreateHreasyProofCellInput,
  context: RequestContext,
): Promise<ResolvedHreasyProofCell> =>
  withTransaction(async (client) => {
    const existing = await repo.countCells(client);
    if (existing >= LIMITS.MAX_HREASY_PROOF_CELLS) {
      throw new ConflictError(
        `The bento holds at most ${LIMITS.MAX_HREASY_PROOF_CELLS} columns before the loop stops reading as one`,
      );
    }

    await assertTilesExist([input.tileAId, input.tileBId, input.tileCId], client);

    const displayOrder = input.displayOrder ?? (await repo.nextCellOrder(client));
    const created = await repo.createCell({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PROOF_CELL_CREATED,
        module: MODULE,
        entityType: CELL_ENTITY,
        entityId: created.id,
        newValues: { width: created.width, shape: created.shape, status: created.status },
      },
      context,
      client,
    );

    return toResolvedCell(created);
  });

export const updateCell = async (
  id: string,
  patch: UpdateHreasyProofCellInput,
  context: RequestContext,
): Promise<ResolvedHreasyProofCell> =>
  withTransaction(async (client) => {
    const existing = await repo.findCellByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Column');

    if (patch.tileAId !== undefined) {
      // The slots move with the shape, so an update touching one restates
      // all three - an absent slot here means empty, not unchanged.
      await assertTilesExist(
        [patch.tileAId, patch.tileBId ?? null, patch.tileCId ?? null],
        client,
      );
    }

    const updated = await repo.updateCell(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Column');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PROOF_CELL_UPDATED,
        module: MODULE,
        entityType: CELL_ENTITY,
        entityId: id,
        oldValues: { width: existing.width, shape: existing.shape, status: existing.status },
        newValues: { width: updated.width, shape: updated.shape, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedCell(updated);
  });

export const setCellStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedHreasyProofCell> => updateCell(id, { status }, context);

export const reorderCells = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedHreasyProofCell[]> =>
  withTransaction(async (client) => {
    const total = await repo.countCells(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every column', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingCellIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a column that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyCellOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PROOF_CELLS_REORDERED,
        module: MODULE,
        entityType: CELL_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllCells(
      {},
      { page: 1, limit: LIMITS.MAX_HREASY_PROOF_CELLS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedCell));
  });

export const removeCell = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCellByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Column');

    await repo.removeCell(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_PROOF_CELL_DELETED,
        module: MODULE,
        entityType: CELL_ENTITY,
        entityId: id,
        oldValues: { width: existing.width, shape: existing.shape },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/** Flattens a tile to exactly what its kind draws, or null if it cannot be. */
const toPublicTile = (tile: ResolvedHreasyProofTile): PublicHreasyProofTile | null => {
  // A card switched off is one the bento cannot draw, which takes its whole
  // column with it - the same path as a mark whose file went missing.
  if (tile.status !== 'ACTIVE') return null;

  if (tile.kind === 'LOGO') {
    // A mark whose file was deleted would render a broken image.
    return tile.image && tile.name ? { kind: 'LOGO', name: tile.name, image: tile.image } : null;
  }
  if (tile.kind === 'STAT') {
    return tile.value && tile.label && tile.client
      ? { kind: 'STAT', value: tile.value, label: tile.label, client: tile.client }
      : null;
  }
  return tile.client && tile.headline && tile.line
    ? { kind: 'PROOF', client: tile.client, headline: tile.headline, line: tile.line }
    : null;
};

/**
 * The whole bento in one call.
 *
 * Null when the copy is missing or no column survives - the page then keeps
 * the strip it ships, which is a complete working one.
 *
 * A column whose cards cannot all be drawn is dropped rather than published
 * with a hole: the shapes are fixed, so a STACK missing its second card would
 * render a half-empty column rather than a shorter one.
 */
export const getPublished = async (): Promise<PublicHreasyProofSection | null> => {
  const [copy, cells] = await Promise.all([
    sectionCopyService.get('hreasy', 'proof'),
    repo.findPublishedCells(),
  ]);
  if (!copy || cells.length === 0) return null;

  const resolved = await Promise.all(cells.map(toResolvedCell));

  const drawable = resolved
    .map((cell) => {
      const tiles = cell.tiles.map(toPublicTile);
      if (tiles.length !== TILES_PER_SHAPE[cell.shape]) return null;
      if (tiles.some((tile) => tile === null)) return null;
      return {
        width: cell.width,
        shape: cell.shape,
        tiles: tiles as PublicHreasyProofTile[],
      };
    })
    .filter((cell): cell is NonNullable<typeof cell> => cell !== null);

  if (drawable.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    cells: drawable,
  };
};
