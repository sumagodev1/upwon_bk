// src/modules/product-pages/erp-page/repositories/establishers-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { ErpIconName } from '../utils/icons';
import {
  CreateErpEstablisherBadgeInput,
  ErpEstablisherBadge,
  ErpEstablisherBadgeFilters,
  UpdateErpEstablisherBadgeInput,
} from '../types/establishers-section.types';

/**
 * One table: the compliance badges.
 *
 * The sphere beside them has no table here - it draws the home page's
 * integration logos, read through that module.
 */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'b.title',
  displayOrder: 'b.display_order',
  status: 'b.status',
  createdAt: 'b.created_at',
  updatedAt: 'b.updated_at',
} as const;

const UPDATABLE: Readonly<Record<string, string>> = {
  icon: 'icon',
  title: 'title',
  subtext: 'subtext',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  b.id, b.icon, b.title, b.subtext, b.display_order, b.status,
  b.created_by, b.updated_by, b.created_at, b.updated_at
`;

const RETURNING = `
  id, icon, title, subtext, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface BadgeRow {
  id: string;
  icon: string;
  title: string;
  subtext: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toBadge = (row: BadgeRow): ErpEstablisherBadge => ({
  id: row.id,
  icon: row.icon as ErpIconName,
  title: row.title,
  subtext: row.subtext,
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
): Promise<ErpEstablisherBadge | null> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `SELECT ${COLUMNS} FROM erp_establisher_badges b WHERE b.id = $1`,
    [id],
  );
  return result.rows[0] ? toBadge(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ErpEstablisherBadge | null> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `SELECT ${COLUMNS} FROM erp_establisher_badges b WHERE b.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toBadge(result.rows[0]) : null;
};

export const findAll = async (
  filters: ErpEstablisherBadgeFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ErpEstablisherBadge>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'b.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(b.title ILIKE ? OR b.subtext ILIKE ? OR b.icon ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the panel.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM erp_establisher_badges b
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, b.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<BadgeRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toBadge),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (executor?: Executor): Promise<ErpEstablisherBadge[]> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `SELECT ${COLUMNS} FROM erp_establisher_badges b
      WHERE b.status = 'ACTIVE'
      ORDER BY b.display_order ASC, b.created_at ASC`,
    [],
  );
  return result.rows.map(toBadge);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM erp_establisher_badges',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM erp_establisher_badges',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateErpEstablisherBadgeInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ErpEstablisherBadge> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `INSERT INTO erp_establisher_badges
       (icon, title, subtext, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${RETURNING}`,
    [input.icon, input.title, input.subtext, input.displayOrder, input.status, createdBy],
  );
  return toBadge(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateErpEstablisherBadgeInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpEstablisherBadge | null> => {
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

  const result = await runQuery<BadgeRow>(
    executor,
    `UPDATE erp_establisher_badges SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
  );
  return result.rows[0] ? toBadge(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpEstablisherBadge | null> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `UPDATE erp_establisher_badges SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${RETURNING}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toBadge(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE erp_establisher_badges AS b
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE b.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM erp_establisher_badges WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM erp_establisher_badges WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
