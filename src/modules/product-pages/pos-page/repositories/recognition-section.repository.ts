// src/modules/product-pages/pos-page/repositories/recognition-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { PosIconName } from '../utils/icons';
import {
  CreatePosRecognitionCategoryInput,
  PosRecognitionCategory,
  PosRecognitionCategoryFilters,
  UpdatePosRecognitionCategoryInput,
} from '../types/recognition-section.types';

/** One table behind the section: the cards in the grid. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'c.title',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

const UPDATABLE: Readonly<Record<string, string>> = {
  icon: 'icon',
  title: 'title',
  description: 'description',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  c.id, c.icon, c.title, c.description, c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const RETURNING = `
  id, icon, title, description, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface Row {
  id: string;
  icon: string;
  title: string;
  description: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCategory = (row: Row): PosRecognitionCategory => ({
  id: row.id,
  icon: row.icon as PosIconName,
  title: row.title,
  description: row.description,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<PosRecognitionCategory | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM pos_recognition_categories c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<PosRecognitionCategory | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM pos_recognition_categories c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

export const findAll = async (
  filters: PosRecognitionCategoryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<PosRecognitionCategory>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(c.title ILIKE ? OR c.description ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the grid,
  // which starts from its top-left card.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM pos_recognition_categories c
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<Row & { total_count: number }>(executor, sql, builder.getValues());

  return {
    rows: result.rows.map(toCategory),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (
  executor?: Executor,
): Promise<PosRecognitionCategory[]> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM pos_recognition_categories c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCategory);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM pos_recognition_categories',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM pos_recognition_categories',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreatePosRecognitionCategoryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<PosRecognitionCategory> => {
  const result = await runQuery<Row>(
    executor,
    `INSERT INTO pos_recognition_categories
       (icon, title, description, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${RETURNING}`,
    [input.icon, input.title, input.description, input.displayOrder, input.status, createdBy],
  );
  return toCategory(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdatePosRecognitionCategoryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<PosRecognitionCategory | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<Row>(
    executor,
    `UPDATE pos_recognition_categories SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE pos_recognition_categories AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM pos_recognition_categories WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM pos_recognition_categories WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
