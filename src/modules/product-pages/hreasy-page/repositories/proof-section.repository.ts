// src/modules/product-pages/hreasy-page/repositories/proof-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateHreasyProofCellInput,
  CreateHreasyProofTileInput,
  HreasyProofCell,
  HreasyProofCellFilters,
  HreasyProofCellShape,
  HreasyProofCellWidth,
  HreasyProofTile,
  HreasyProofTileFilters,
  HreasyProofTileKind,
  UpdateHreasyProofCellInput,
} from '../types/proof-section.types';

/**
 * Two tables behind one bento: the tiles hold the content, the cells hold the
 * arrangement, and a cell points at the tiles it draws.
 */

// ── the tiles ─────────────────────────────────────────────────────────────

const TILE_COLUMNS = `
  t.id, t.kind, t.name, t.image_url, t.image_file_id,
  t.value, t.label, t.client, t.headline, t.line, t.status,
  t.created_by, t.updated_by, t.created_at, t.updated_at
`;

const TILE_RETURNING = `
  id, kind, name, image_url, image_file_id,
  value, label, client, headline, line, status,
  created_by, updated_by, created_at, updated_at
`;

interface TileRow {
  id: string;
  kind: string;
  name: string | null;
  image_url: string | null;
  image_file_id: string | null;
  value: string | null;
  label: string | null;
  client: string | null;
  headline: string | null;
  line: string | null;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toTile = (row: TileRow): HreasyProofTile => ({
  id: row.id,
  kind: row.kind as HreasyProofTileKind,
  name: row.name,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  value: row.value,
  label: row.label,
  client: row.client,
  headline: row.headline,
  line: row.line,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findTileById = async (
  id: string,
  executor?: Executor,
): Promise<HreasyProofTile | null> => {
  const result = await runQuery<TileRow>(
    executor,
    `SELECT ${TILE_COLUMNS} FROM hreasy_proof_tiles t WHERE t.id = $1`,
    [id],
  );
  return result.rows[0] ? toTile(result.rows[0]) : null;
};

export const findTilesByIds = async (
  ids: string[],
  executor?: Executor,
): Promise<HreasyProofTile[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<TileRow>(
    executor,
    `SELECT ${TILE_COLUMNS} FROM hreasy_proof_tiles t WHERE t.id = ANY($1::uuid[])`,
    [ids],
  );
  return result.rows.map(toTile);
};

export const findAllTiles = async (
  filters: HreasyProofTileFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<HreasyProofTile>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.kind, { column: 't.kind', operator: '=', value: filters.kind });
  builder.whereIf(filters.status, {
    column: 't.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(t.name ILIKE ? OR t.client ILIKE ? OR t.label ILIKE ? OR t.headline ILIKE ?)',
      ...Array.from({ length: 4 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(
    pagination.sortBy,
    pagination.sortOrder,
    {
      kind: 't.kind',
      status: 't.status',
      createdAt: 't.created_at',
      updatedAt: 't.updated_at',
    },
    { field: 'createdAt', order: 'asc' },
  );

  const result = await runQuery<TileRow & { total_count: number }>(
    executor,
    `SELECT ${TILE_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM hreasy_proof_tiles t
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, t.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toTile),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const countTiles = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM hreasy_proof_tiles',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const createTile = async (
  input: CreateHreasyProofTileInput,
  createdBy: string | null,
  executor?: Executor,
): Promise<HreasyProofTile> => {
  const result = await runQuery<TileRow>(
    executor,
    `INSERT INTO hreasy_proof_tiles
       (kind, name, image_url, image_file_id, value, label, client, headline, line,
        status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
     RETURNING ${TILE_RETURNING}`,
    [
      input.kind,
      input.name,
      input.imageUrl,
      input.imageFileId,
      input.value,
      input.label,
      input.client,
      input.headline,
      input.line,
      input.status,
      createdBy,
    ],
  );
  return toTile(result.rows[0]);
};

/**
 * Replaces the whole tile rather than patching it.
 *
 * A tile is small, and switching a LOGO to a STAT has to clear the picture
 * anyway - so every column is written every time, and the per-kind CHECKs see
 * a complete row rather than a half-changed one.
 */
export const updateTile = async (
  id: string,
  input: CreateHreasyProofTileInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HreasyProofTile | null> => {
  const result = await runQuery<TileRow>(
    executor,
    `UPDATE hreasy_proof_tiles SET
       kind = $1, name = $2, image_url = $3, image_file_id = $4,
       value = $5, label = $6, client = $7, headline = $8, line = $9,
       status = $10, updated_by = $11
     WHERE id = $12
     RETURNING ${TILE_RETURNING}`,
    [
      input.kind,
      input.name,
      input.imageUrl,
      input.imageFileId,
      input.value,
      input.label,
      input.client,
      input.headline,
      input.line,
      input.status,
      updatedBy,
      id,
    ],
  );
  return result.rows[0] ? toTile(result.rows[0]) : null;
};

/** Which cells still draw this tile - what a delete has to answer first. */
export const findCellsUsingTile = async (
  tileId: string,
  executor?: Executor,
): Promise<string[]> => {
  const result = await runQuery<{ id: string }>(
    executor,
    `SELECT id FROM hreasy_proof_cells
      WHERE tile_a_id = $1 OR tile_b_id = $1 OR tile_c_id = $1`,
    [tileId],
  );
  return result.rows.map((row) => row.id);
};

export const removeTile = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM hreasy_proof_tiles WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── the cells ─────────────────────────────────────────────────────────────

const CELL_SORT_COLUMNS: Readonly<Record<string, string>> = {
  width: 'c.width',
  shape: 'c.shape',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

const CELL_COLUMNS = `
  c.id, c.width, c.shape, c.tile_a_id, c.tile_b_id, c.tile_c_id,
  c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const CELL_RETURNING = `
  id, width, shape, tile_a_id, tile_b_id, tile_c_id, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CellRow {
  id: string;
  width: string;
  shape: string;
  tile_a_id: string;
  tile_b_id: string | null;
  tile_c_id: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCell = (row: CellRow): HreasyProofCell => ({
  id: row.id,
  width: row.width as HreasyProofCellWidth,
  shape: row.shape as HreasyProofCellShape,
  tileAId: row.tile_a_id,
  tileBId: row.tile_b_id,
  tileCId: row.tile_c_id,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCellById = async (
  id: string,
  executor?: Executor,
): Promise<HreasyProofCell | null> => {
  const result = await runQuery<CellRow>(
    executor,
    `SELECT ${CELL_COLUMNS} FROM hreasy_proof_cells c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCell(result.rows[0]) : null;
};

export const findCellByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<HreasyProofCell | null> => {
  const result = await runQuery<CellRow>(
    executor,
    `SELECT ${CELL_COLUMNS} FROM hreasy_proof_cells c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCell(result.rows[0]) : null;
};

export const findAllCells = async (
  filters: HreasyProofCellFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<HreasyProofCell>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, { column: 'c.status', operator: '=', value: filters.status });

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, CELL_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<CellRow & { total_count: number }>(
    executor,
    `SELECT ${CELL_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM hreasy_proof_cells c
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toCell),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedCells = async (executor?: Executor): Promise<HreasyProofCell[]> => {
  const result = await runQuery<CellRow>(
    executor,
    `SELECT ${CELL_COLUMNS} FROM hreasy_proof_cells c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCell);
};

export const countCells = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM hreasy_proof_cells',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextCellOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM hreasy_proof_cells',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createCell = async (
  input: CreateHreasyProofCellInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<HreasyProofCell> => {
  const result = await runQuery<CellRow>(
    executor,
    `INSERT INTO hreasy_proof_cells
       (width, shape, tile_a_id, tile_b_id, tile_c_id, display_order, status,
        created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING ${CELL_RETURNING}`,
    [
      input.width,
      input.shape,
      input.tileAId,
      input.tileBId,
      input.tileCId,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toCell(result.rows[0]);
};

const CELL_UPDATABLE: Readonly<Record<string, string>> = {
  width: 'width',
  shape: 'shape',
  tileAId: 'tile_a_id',
  tileBId: 'tile_b_id',
  tileCId: 'tile_c_id',
  displayOrder: 'display_order',
  status: 'status',
} as const;

export const updateCell = async (
  id: string,
  patch: UpdateHreasyProofCellInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HreasyProofCell | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  /*
   * The slots move with the shape, so when the shape is being changed every
   * slot is written - including the ones being cleared, which a plain
   * "skip undefined" loop would leave behind and trip the shape check on.
   */
  const effective: Record<string, unknown> = { ...patch };
  if (patch.shape !== undefined) {
    effective.tileBId = patch.tileBId ?? null;
    effective.tileCId = patch.tileCId ?? null;
  }

  for (const [key, column] of Object.entries(CELL_UPDATABLE)) {
    const value = effective[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findCellById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<CellRow>(
    executor,
    `UPDATE hreasy_proof_cells SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${CELL_RETURNING}`,
    values,
  );
  return result.rows[0] ? toCell(result.rows[0]) : null;
};

export const applyCellOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE hreasy_proof_cells AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingCellIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM hreasy_proof_cells WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeCell = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM hreasy_proof_cells WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
