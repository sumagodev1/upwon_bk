// src/modules/industry-pages/bakery-page/repositories/platform-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  BakeryPlatformTile,
  BakeryPlatformTileFilters,
  CreateBakeryPlatformTileInput,
  UpdateBakeryPlatformTileInput,
} from '../types/platform-section.types';
import { assignImagePair } from '../utils/image-pair';

/** One table, one row per product tile. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 'pt.label',
  displayOrder: 'pt.display_order',
  status: 'pt.status',
  createdAt: 'pt.created_at',
  updatedAt: 'pt.updated_at',
} as const;

const QUALIFIED_COLUMNS = `
  pt.id, pt.label, pt.href, pt.icon_url, pt.icon_file_id,
  pt.display_order, pt.status,
  pt.created_by, pt.updated_by, pt.created_at, pt.updated_at
`;

const RETURNING_COLUMNS = `
  id, label, href, icon_url, icon_file_id,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface TileRow {
  id: string;
  label: string;
  href: string;
  icon_url: string | null;
  icon_file_id: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toTile = (row: TileRow): BakeryPlatformTile => ({
  id: row.id,
  label: row.label,
  href: row.href,
  iconUrl: row.icon_url,
  iconFileId: row.icon_file_id,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<BakeryPlatformTile | null> => {
  const result = await runQuery<TileRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM bakery_platform_tiles pt WHERE pt.id = $1 AND pt.deleted_at IS NULL`,
    [id],
  );
  return result.rows[0] ? toTile(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BakeryPlatformTile | null> => {
  const result = await runQuery<TileRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM bakery_platform_tiles pt WHERE pt.id = $1 AND pt.deleted_at IS NULL FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toTile(result.rows[0]) : null;
};

export const findAll = async (
  filters: BakeryPlatformTileFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BakeryPlatformTile>> => {
  const builder = new SqlBuilder();
  // Soft-deleted rows are gone from every admin list and search.
  builder.raw('pt.deleted_at IS NULL');
  builder.whereIf(filters.status, { column: 'pt.status', operator: '=', value: filters.status });
  if (pagination.search) {
    builder.raw(
      '(pt.label ILIKE ? OR pt.href ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the grid.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<TileRow & { total_count: number }>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM bakery_platform_tiles pt
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, pt.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toTile),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every ACTIVE tile, in order. */
export const findPublished = async (executor?: Executor): Promise<BakeryPlatformTile[]> => {
  const result = await runQuery<TileRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM bakery_platform_tiles pt
      WHERE pt.status = 'ACTIVE' AND pt.deleted_at IS NULL
     ORDER BY pt.display_order ASC, pt.created_at ASC`,
    [],
  );
  return result.rows.map(toTile);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM bakery_platform_tiles WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM bakery_platform_tiles WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

/** Feeds the duplicate check: two tiles for the same product read as a mistake. */
export const findByLabel = async (
  label: string,
  executor?: Executor,
): Promise<BakeryPlatformTile | null> => {
  const result = await runQuery<TileRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM bakery_platform_tiles pt
      WHERE lower(pt.label) = lower($1) AND pt.deleted_at IS NULL
      LIMIT 1`,
    [label],
  );
  return result.rows[0] ? toTile(result.rows[0]) : null;
};

export const create = async (
  input: CreateBakeryPlatformTileInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BakeryPlatformTile> => {
  const result = await runQuery<TileRow>(
    executor,
    `INSERT INTO bakery_platform_tiles
       (label, href, icon_url, icon_file_id, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING ${RETURNING_COLUMNS}`,
    [
      input.label,
      input.href,
      input.iconUrl,
      input.iconFileId,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toTile(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateBakeryPlatformTileInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BakeryPlatformTile | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (patch.label !== undefined) assign('label', patch.label);
  if (patch.href !== undefined) assign('href', patch.href);
  if (patch.displayOrder !== undefined) assign('display_order', patch.displayOrder);
  if (patch.status !== undefined) assign('status', patch.status);
  assignImagePair(assign, 'icon_url', 'icon_file_id', patch.iconUrl, patch.iconFileId);

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<TileRow>(
    executor,
    `UPDATE bakery_platform_tiles SET ${assignments.join(', ')}
      WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toTile(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE bakery_platform_tiles AS pt
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE pt.id = ordered.id AND pt.deleted_at IS NULL`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM bakery_platform_tiles WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/**
 * Soft delete: stamps deleted_at rather than removing the row, so the record
 * stays in the table for audit and recovery. Every read above ignores it.
 */
export const remove = async (
  id: string,
  deletedBy: string | null,
  executor?: Executor,
): Promise<boolean> => {
  const result = await runQuery(
    executor,
    `UPDATE bakery_platform_tiles SET deleted_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL`,
    [id, deletedBy],
  );
  return (result.rowCount ?? 0) > 0;
};
