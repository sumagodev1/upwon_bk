// src/modules/about-page/repositories/number-stats.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  AboutNumberStat,
  AboutNumberStatFilters,
  CreateAboutNumberStatInput,
  UpdateAboutNumberStatInput,
} from '../types/numbers.types';

/**
 * Columns an update may touch. created_by / updated_by come from the request
 * context, never from the body, and display_order is absent because position is
 * changed only by applyOrder(), which rewrites the whole set.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  value: 'value',
  label: 'label',
  description: 'description',
  status: 'status',
} as const;

const COLUMNS = `
  id, value, label, description,
  status, display_order, created_by, updated_by, created_at, updated_at
`;

/** created_at breaks display_order ties, so the list order is stable. */
const STAT_ORDER = 'ORDER BY display_order ASC, created_at ASC';

interface AboutNumberStatRow {
  id: string;
  value: string;
  label: string;
  description: string;
  status: string;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toStat = (row: AboutNumberStatRow): AboutNumberStat => ({
  id: row.id,
  value: row.value,
  label: row.label,
  description: row.description,
  status: row.status as ContentStatus,
  displayOrder: row.display_order,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── reads ─────────────────────────────────────────────────────────────────

/** Every card, unpaginated - see the team members repository for why. */
export const findAll = async (
  filters: AboutNumberStatFilters,
  executor?: Executor,
): Promise<AboutNumberStat[]> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'status',
    operator: '=',
    value: filters.status,
  });
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    builder.raw(
      '(value ILIKE ? OR label ILIKE ? OR description ILIKE ?)',
      pattern,
      pattern,
      pattern,
    );
  }

  const sql = `
    SELECT ${COLUMNS}
      FROM about_number_stats
    ${builder.buildWhere()}
    ${STAT_ORDER}
  `;
  const result = await runQuery<AboutNumberStatRow>(executor, sql, builder.getValues());
  return result.rows.map(toStat);
};

/** The public list: ACTIVE only, in display order. */
export const findPublished = async (executor?: Executor): Promise<AboutNumberStat[]> => {
  const sql = `
    SELECT ${COLUMNS}
      FROM about_number_stats
     WHERE status = 'ACTIVE'
    ${STAT_ORDER}
  `;
  const result = await runQuery<AboutNumberStatRow>(executor, sql, []);
  return result.rows.map(toStat);
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<AboutNumberStat | null> => {
  const result = await runQuery<AboutNumberStatRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_number_stats WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

/** Locks the row, so two administrators editing the same card serialise. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<AboutNumberStat | null> => {
  const result = await runQuery<AboutNumberStatRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_number_stats WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM about_number_stats',
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end of the row" default on create. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM about_number_stats',
  );
  return Number(result.rows[0]?.next ?? 0);
};

/** Returns the ids that exist, so a reorder can reject the rest. */
export const findExistingIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM about_number_stats WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateAboutNumberStatInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<AboutNumberStat> => {
  const sql = `
    INSERT INTO about_number_stats
      (value, label, description, status, display_order, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $6)
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<AboutNumberStatRow>(executor, sql, [
    input.value,
    input.label,
    input.description,
    input.status,
    input.displayOrder,
    createdBy,
  ]);
  return toStat(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateAboutNumberStatInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<AboutNumberStat | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);

  values.push(id);
  const sql = `
    UPDATE about_number_stats SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<AboutNumberStatRow>(executor, sql, values);
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<AboutNumberStat | null> => {
  const sql = `
    UPDATE about_number_stats SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<AboutNumberStatRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

/**
 * Rewrites display_order for every listed card in one statement, each row's
 * position taken from its index in the array.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const sql = `
    UPDATE about_number_stats AS s
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE s.id = ordered.id
  `;
  const result = await runQuery(executor, sql, [orderedIds, updatedBy]);
  return result.rowCount ?? 0;
};

/** A hard delete; INACTIVE covers "not on the page right now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM about_number_stats WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
