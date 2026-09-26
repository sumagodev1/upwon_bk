// src/modules/industry-pages/bakery-page/repositories/helps-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  BakeryHelpVisual,
  BakeryHelpVisualFilters,
  CreateBakeryHelpVisualInput,
  UpdateBakeryHelpVisualInput,
} from '../types/helps-section.types';
import { assignImagePair } from '../utils/image-pair';

/** One table, one row per diagram - at most one of them ACTIVE. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  alt: 'hv.alt',
  displayOrder: 'hv.display_order',
  status: 'hv.status',
  createdAt: 'hv.created_at',
  updatedAt: 'hv.updated_at',
} as const;

const QUALIFIED_COLUMNS = `
  hv.id, hv.image_url, hv.image_file_id, hv.alt, hv.display_order, hv.status,
  hv.created_by, hv.updated_by, hv.created_at, hv.updated_at
`;

const RETURNING_COLUMNS = `
  id, image_url, image_file_id, alt, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface VisualRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  alt: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toVisual = (row: VisualRow): BakeryHelpVisual => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  alt: row.alt,
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
): Promise<BakeryHelpVisual | null> => {
  const result = await runQuery<VisualRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM bakery_help_visuals hv WHERE hv.id = $1 AND hv.deleted_at IS NULL`,
    [id],
  );
  return result.rows[0] ? toVisual(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BakeryHelpVisual | null> => {
  const result = await runQuery<VisualRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM bakery_help_visuals hv WHERE hv.id = $1 AND hv.deleted_at IS NULL FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toVisual(result.rows[0]) : null;
};

export const findAll = async (
  filters: BakeryHelpVisualFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BakeryHelpVisual>> => {
  const builder = new SqlBuilder();
  // Soft-deleted rows are gone from every admin list and search.
  builder.raw('hv.deleted_at IS NULL');
  builder.whereIf(filters.status, { column: 'hv.status', operator: '=', value: filters.status });
  if (pagination.search) builder.raw('hv.alt ILIKE ?', `%${pagination.search}%`);

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<VisualRow & { total_count: number }>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM bakery_help_visuals hv
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, hv.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toVisual),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/**
 * The live diagram, or null. The partial unique index guarantees there is at
 * most one, so no ordering is needed to pick it.
 */
export const findActive = async (executor?: Executor): Promise<BakeryHelpVisual | null> => {
  const result = await runQuery<VisualRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM bakery_help_visuals hv WHERE hv.status = 'ACTIVE' AND hv.deleted_at IS NULL LIMIT 1`,
    [],
  );
  return result.rows[0] ? toVisual(result.rows[0]) : null;
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM bakery_help_visuals WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM bakery_help_visuals WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateBakeryHelpVisualInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BakeryHelpVisual> => {
  const result = await runQuery<VisualRow>(
    executor,
    `INSERT INTO bakery_help_visuals
       (image_url, image_file_id, alt, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${RETURNING_COLUMNS}`,
    [input.imageUrl, input.imageFileId, input.alt, input.displayOrder, input.status, createdBy],
  );
  return toVisual(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateBakeryHelpVisualInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BakeryHelpVisual | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (patch.alt !== undefined) assign('alt', patch.alt);
  if (patch.displayOrder !== undefined) assign('display_order', patch.displayOrder);
  if (patch.status !== undefined) assign('status', patch.status);
  assignImagePair(assign, 'image_url', 'image_file_id', patch.imageUrl, patch.imageFileId);

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<VisualRow>(
    executor,
    `UPDATE bakery_help_visuals SET ${assignments.join(', ')}
      WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toVisual(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE bakery_help_visuals AS hv
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE hv.id = ordered.id AND hv.deleted_at IS NULL`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM bakery_help_visuals WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL',
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
    `UPDATE bakery_help_visuals SET deleted_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL`,
    [id, deletedBy],
  );
  return (result.rowCount ?? 0) > 0;
};
