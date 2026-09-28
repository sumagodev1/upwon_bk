// src/modules/clients-page/repositories/story-rows.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import {
  CreateStoryRowInput,
  StoryRow,
  StoryRowKind,
  UpdateStoryRowInput,
} from '../types/story-rows.types';

/*
 * One set of statements for all four story list tables. Every interpolated
 * identifier - the table and the field columns - comes from a StoryRowKind in
 * utils/story-row-kinds.ts, a closed set of constants, never from a request.
 */

type Row = Record<string, unknown> & {
  id: string;
  case_id: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
};

const columnsOf = (kind: StoryRowKind): string =>
  [
    'id',
    'case_id',
    ...kind.fields.map((f) => f.column),
    'display_order',
    'status',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at',
  ].join(', ');

const toRow = (kind: StoryRowKind, row: Row): StoryRow => ({
  id: row.id,
  caseId: row.case_id,
  values: Object.fromEntries(kind.fields.map((f) => [f.key, String(row[f.column] ?? '')])),
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Every row of one case, in order - the admin list, unpaginated (capped). */
export const findByCase = async (
  kind: StoryRowKind,
  caseId: string,
  opts: { status?: ContentStatus } = {},
  executor?: Executor,
): Promise<StoryRow[]> => {
  const values: unknown[] = [caseId];
  let statusClause = '';
  if (opts.status) {
    values.push(opts.status);
    statusClause = 'AND status = $2';
  }
  const result = await runQuery<Row>(
    executor,
    `
    SELECT ${columnsOf(kind)} FROM ${kind.table}
     WHERE case_id = $1 ${statusClause}
     ORDER BY display_order ASC, created_at ASC
    `,
    values,
  );
  return result.rows.map((row) => toRow(kind, row));
};

export const findById = async (
  kind: StoryRowKind,
  caseId: string,
  id: string,
  executor?: Executor,
): Promise<StoryRow | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${columnsOf(kind)} FROM ${kind.table} WHERE id = $1 AND case_id = $2`,
    [id, caseId],
  );
  return result.rows[0] ? toRow(kind, result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  kind: StoryRowKind,
  caseId: string,
  id: string,
  executor: Executor,
): Promise<StoryRow | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${columnsOf(kind)} FROM ${kind.table} WHERE id = $1 AND case_id = $2 FOR UPDATE`,
    [id, caseId],
  );
  return result.rows[0] ? toRow(kind, result.rows[0]) : null;
};

export const countByCase = async (
  kind: StoryRowKind,
  caseId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    `SELECT COUNT(*) AS count FROM ${kind.table} WHERE case_id = $1`,
    [caseId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (
  kind: StoryRowKind,
  caseId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM ${kind.table} WHERE case_id = $1`,
    [caseId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  kind: StoryRowKind,
  caseId: string,
  input: CreateStoryRowInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<StoryRow> => {
  const fieldColumns = kind.fields.map((f) => f.column);
  const values: unknown[] = [
    caseId,
    ...kind.fields.map((f) => input.values[f.key]),
    input.displayOrder,
    input.status,
    createdBy,
  ];
  const placeholders = values.map((_v, i) => `$${i + 1}`);
  const result = await runQuery<Row>(
    executor,
    `
    INSERT INTO ${kind.table}
      (case_id, ${fieldColumns.join(', ')}, display_order, status, created_by, updated_by)
    VALUES (${placeholders.join(', ')}, $${values.length})
    RETURNING ${columnsOf(kind)}
    `,
    values,
  );
  return toRow(kind, result.rows[0]);
};

export const update = async (
  kind: StoryRowKind,
  caseId: string,
  id: string,
  patch: UpdateStoryRowInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<StoryRow | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const field of kind.fields) {
    const value = patch.values[field.key];
    if (value !== undefined) assign(field.column, value);
  }
  if (patch.displayOrder !== undefined) assign('display_order', patch.displayOrder);
  if (patch.status !== undefined) assign('status', patch.status);

  if (assignments.length === 0) return findById(kind, caseId, id, executor);

  assign('updated_by', updatedBy);
  values.push(id, caseId);
  const result = await runQuery<Row>(
    executor,
    `
    UPDATE ${kind.table} SET ${assignments.join(', ')}
     WHERE id = $${values.length - 1} AND case_id = $${values.length}
    RETURNING ${columnsOf(kind)}
    `,
    values,
  );
  return result.rows[0] ? toRow(kind, result.rows[0]) : null;
};

/** Rewrites display_order for one case's rows in one statement. */
export const applyOrder = async (
  kind: StoryRowKind,
  caseId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `
    UPDATE ${kind.table} AS r
       SET display_order = ordered.position - 1, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE r.id = ordered.id AND r.case_id = $3
    `,
    [orderedIds, updatedBy, caseId],
  );
  return result.rowCount ?? 0;
};

export const remove = async (
  kind: StoryRowKind,
  caseId: string,
  id: string,
  executor?: Executor,
): Promise<boolean> => {
  const result = await runQuery(
    executor,
    `DELETE FROM ${kind.table} WHERE id = $1 AND case_id = $2`,
    [id, caseId],
  );
  return (result.rowCount ?? 0) > 0;
};
