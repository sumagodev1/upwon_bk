// src/modules/industry-pages/dairy-page/repositories/coverage-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateDairyCoverageItemInput,
  DairyCoverageItem,
  DairyCoverageItemFilters,
  UpdateDairyCoverageItemInput,
} from '../types/coverage-section.types';
import { assignImagePair } from '../utils/image-pair';

/** One table, one row per category. Soft-deleted rows are invisible to every read. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 'ci.label',
  displayOrder: 'ci.display_order',
  status: 'ci.status',
  createdAt: 'ci.created_at',
  updatedAt: 'ci.updated_at',
} as const;

const QUALIFIED_COLUMNS = `
  ci.id, ci.label, ci.image_url, ci.image_file_id,
  ci.display_order, ci.status,
  ci.created_by, ci.updated_by, ci.created_at, ci.updated_at
`;

const RETURNING_COLUMNS = `
  id, label, image_url, image_file_id,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface ItemRow {
  id: string;
  label: string;
  image_url: string | null;
  image_file_id: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toItem = (row: ItemRow): DairyCoverageItem => ({
  id: row.id,
  label: row.label,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
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
): Promise<DairyCoverageItem | null> => {
  const result = await runQuery<ItemRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM dairy_coverage_items ci WHERE ci.id = $1 AND ci.deleted_at IS NULL`,
    [id],
  );
  return result.rows[0] ? toItem(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<DairyCoverageItem | null> => {
  const result = await runQuery<ItemRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM dairy_coverage_items ci WHERE ci.id = $1 AND ci.deleted_at IS NULL FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toItem(result.rows[0]) : null;
};

export const findAll = async (
  filters: DairyCoverageItemFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<DairyCoverageItem>> => {
  const builder = new SqlBuilder();
  // Soft-deleted rows are gone from every admin list and search.
  builder.raw('ci.deleted_at IS NULL');
  builder.whereIf(filters.status, { column: 'ci.status', operator: '=', value: filters.status });
  if (pagination.search) {
    builder.raw(
      '(ci.label ILIKE ?)',
      ...Array.from({ length: 1 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<ItemRow & { total_count: number }>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM dairy_coverage_items ci
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, ci.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toItem),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every live ACTIVE category, in order. */
export const findPublished = async (executor?: Executor): Promise<DairyCoverageItem[]> => {
  const result = await runQuery<ItemRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM dairy_coverage_items ci
      WHERE ci.status = 'ACTIVE' AND ci.deleted_at IS NULL
     ORDER BY ci.display_order ASC, ci.created_at ASC`,
    [],
  );
  return result.rows.map(toItem);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM dairy_coverage_items WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM dairy_coverage_items WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

/** Feeds the duplicate check: two live categories with the same name read as a mistake. */
export const findByLabel = async (
  value: string,
  executor?: Executor,
): Promise<DairyCoverageItem | null> => {
  const result = await runQuery<ItemRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM dairy_coverage_items ci
      WHERE lower(ci.label) = lower($1) AND ci.deleted_at IS NULL
      LIMIT 1`,
    [value],
  );
  return result.rows[0] ? toItem(result.rows[0]) : null;
};

export const create = async (
  input: CreateDairyCoverageItemInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<DairyCoverageItem> => {
  const result = await runQuery<ItemRow>(
    executor,
    `INSERT INTO dairy_coverage_items
       (label, image_url, image_file_id, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${RETURNING_COLUMNS}`,
    [
      input.label,
      input.imageUrl,
      input.imageFileId,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toItem(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateDairyCoverageItemInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<DairyCoverageItem | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (patch.label !== undefined) assign('label', patch.label);
  if (patch.displayOrder !== undefined) assign('display_order', patch.displayOrder);
  if (patch.status !== undefined) assign('status', patch.status);
  assignImagePair(assign, 'image_url', 'image_file_id', patch.imageUrl, patch.imageFileId);

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<ItemRow>(
    executor,
    `UPDATE dairy_coverage_items SET ${assignments.join(', ')}
      WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toItem(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE dairy_coverage_items AS ci
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE ci.id = ordered.id AND ci.deleted_at IS NULL`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM dairy_coverage_items WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL',
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
    `UPDATE dairy_coverage_items SET deleted_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL`,
    [id, deletedBy],
  );
  return (result.rowCount ?? 0) > 0;
};
