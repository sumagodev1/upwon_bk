// src/modules/industry-pages/engineering-manufacturing-page/repositories/capabilities-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { EngineeringIconName } from '../utils/icons';
import {
  CreateEngineeringCapabilityInput,
  EngineeringCapability,
  EngineeringCapabilityFilters,
  UpdateEngineeringCapabilityInput,
} from '../types/capabilities-section.types';

/** One table, one row per capability - the same shape as every other list section. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'c.title',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/** Columns an update may touch. updated_by comes from the request context. */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  title: 'title',
  description: 'description',
  icon: 'icon',
  accentColor: 'accent_color',
  tintColor: 'tint_color',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  c.id, c.title, c.description, c.icon, c.accent_color, c.tint_color,
  c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const RETURNING_COLUMNS = `
  id, title, description, icon, accent_color, tint_color,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CapabilityRow {
  id: string;
  title: string;
  description: string;
  icon: string;
  accent_color: string;
  tint_color: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCapability = (row: CapabilityRow): EngineeringCapability => ({
  id: row.id,
  title: row.title,
  description: row.description,
  icon: row.icon as EngineeringIconName,
  accentColor: row.accent_color,
  tintColor: row.tint_color,
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
): Promise<EngineeringCapability | null> => {
  const result = await runQuery<CapabilityRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM engineering_capabilities c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCapability(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<EngineeringCapability | null> => {
  const result = await runQuery<CapabilityRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM engineering_capabilities c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCapability(result.rows[0]) : null;
};

export const findAll = async (
  filters: EngineeringCapabilityFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<EngineeringCapability>> => {
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

  // Display order is the default: the admin list should read like the artwork.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM engineering_capabilities c
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<CapabilityRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toCapability),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every ACTIVE capability, in order. */
export const findPublished = async (executor?: Executor): Promise<EngineeringCapability[]> => {
  const result = await runQuery<CapabilityRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM engineering_capabilities c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCapability);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM engineering_capabilities',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM engineering_capabilities',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateEngineeringCapabilityInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<EngineeringCapability> => {
  const result = await runQuery<CapabilityRow>(
    executor,
    `INSERT INTO engineering_capabilities
       (title, description, icon, accent_color, tint_color,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING ${RETURNING_COLUMNS}`,
    [
      input.title,
      input.description,
      input.icon,
      input.accentColor,
      input.tintColor,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toCapability(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateEngineeringCapabilityInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<EngineeringCapability | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<CapabilityRow>(
    executor,
    `UPDATE engineering_capabilities SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toCapability(result.rows[0]) : null;
};

/**
 * Rewrites display_order for the given ids in one statement, each row's
 * position taken from its index in the array.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE engineering_capabilities AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

/** Returns the ids that actually exist, so a reorder can reject unknown ones. */
export const findExistingIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM engineering_capabilities WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM engineering_capabilities WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
