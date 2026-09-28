// src/modules/product-pages/wms-page/repositories/outcomes-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { WmsIconName } from '../utils/icons';
import {
  CreateWmsOutcomeCardInput,
  UpdateWmsOutcomeCardInput,
  WmsOutcomeAccent,
  WmsOutcomeCard,
  WmsOutcomeCardFilters,
} from '../types/outcomes-section.types';

/** One table behind the section: the cards in the row. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'c.title',
  stat: 'c.stat',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/** Columns an update may touch directly; updated_by comes from the context. */
const UPDATABLE: Readonly<Record<string, string>> = {
  icon: 'icon',
  stat: 'stat',
  title: 'title',
  description: 'description',
  accent: 'accent',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  c.id, c.icon, c.stat, c.title, c.description, c.accent,
  c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const RETURNING = `
  id, icon, stat, title, description, accent,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface Row {
  id: string;
  icon: string;
  stat: string;
  title: string;
  description: string;
  accent: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCard = (row: Row): WmsOutcomeCard => ({
  id: row.id,
  icon: row.icon as WmsIconName,
  stat: row.stat,
  title: row.title,
  description: row.description,
  accent: row.accent as WmsOutcomeAccent,
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
): Promise<WmsOutcomeCard | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM wms_outcome_cards c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<WmsOutcomeCard | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM wms_outcome_cards c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findAll = async (
  filters: WmsOutcomeCardFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<WmsOutcomeCard>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(c.title ILIKE ? OR c.description ILIKE ? OR c.stat ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the row,
  // which starts from its left-hand card.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM wms_outcome_cards c
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<Row & { total_count: number }>(executor, sql, builder.getValues());

  return {
    rows: result.rows.map(toCard),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (executor?: Executor): Promise<WmsOutcomeCard[]> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM wms_outcome_cards c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCard);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM wms_outcome_cards',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM wms_outcome_cards',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateWmsOutcomeCardInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<WmsOutcomeCard> => {
  const result = await runQuery<Row>(
    executor,
    `INSERT INTO wms_outcome_cards
       (icon, stat, title, description, accent, display_order, status,
        created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING ${RETURNING}`,
    [
      input.icon,
      input.stat,
      input.title,
      input.description,
      input.accent,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toCard(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateWmsOutcomeCardInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WmsOutcomeCard | null> => {
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
    `UPDATE wms_outcome_cards SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE wms_outcome_cards AS c
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
    'SELECT id FROM wms_outcome_cards WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM wms_outcome_cards WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
