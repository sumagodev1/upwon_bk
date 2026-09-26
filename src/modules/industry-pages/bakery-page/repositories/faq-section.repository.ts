// src/modules/industry-pages/bakery-page/repositories/faq-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateBakeryFaqEntryInput,
  BakeryFaqEntry,
  BakeryFaqEntryFilters,
  UpdateBakeryFaqEntryInput,
} from '../types/faq-section.types';

/** One table, one row per question - no media, so nothing to resolve. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  question: 'fe.question',
  displayOrder: 'fe.display_order',
  status: 'fe.status',
  createdAt: 'fe.created_at',
  updatedAt: 'fe.updated_at',
} as const;

const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  question: 'question',
  answer: 'answer',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  fe.id, fe.question, fe.answer, fe.display_order, fe.status,
  fe.created_by, fe.updated_by, fe.created_at, fe.updated_at
`;

const RETURNING_COLUMNS = `
  id, question, answer, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface EntryRow {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toEntry = (row: EntryRow): BakeryFaqEntry => ({
  id: row.id,
  question: row.question,
  answer: row.answer,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const PUBLISHED_ORDER = 'ORDER BY fe.display_order ASC, fe.created_at ASC';

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<BakeryFaqEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM bakery_faq_entries fe WHERE fe.id = $1 AND fe.deleted_at IS NULL`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BakeryFaqEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM bakery_faq_entries fe WHERE fe.id = $1 AND fe.deleted_at IS NULL FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const findAll = async (
  filters: BakeryFaqEntryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BakeryFaqEntry>> => {
  const builder = new SqlBuilder();
  // Soft-deleted rows are gone from every admin list and search.
  builder.raw('fe.deleted_at IS NULL');
  builder.whereIf(filters.status, {
    column: 'fe.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(fe.question ILIKE ? OR fe.answer ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM bakery_faq_entries fe
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, fe.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<EntryRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toEntry),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (executor?: Executor): Promise<BakeryFaqEntry[]> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM bakery_faq_entries fe
      WHERE fe.status = 'ACTIVE' AND fe.deleted_at IS NULL
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toEntry);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM bakery_faq_entries WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM bakery_faq_entries WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateBakeryFaqEntryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BakeryFaqEntry> => {
  const result = await runQuery<EntryRow>(
    executor,
    `INSERT INTO bakery_faq_entries
       (question, answer, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${RETURNING_COLUMNS}`,
    [input.question, input.answer, input.displayOrder, input.status, createdBy],
  );
  return toEntry(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateBakeryFaqEntryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BakeryFaqEntry | null> => {
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

  const result = await runQuery<EntryRow>(
    executor,
    `UPDATE bakery_faq_entries SET ${assignments.join(', ')}
      WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BakeryFaqEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `UPDATE bakery_faq_entries SET status = $2, updated_by = $3
      WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${RETURNING_COLUMNS}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE bakery_faq_entries AS fe
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE fe.id = ordered.id AND fe.deleted_at IS NULL`,
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
    'SELECT id FROM bakery_faq_entries WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL',
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
    `UPDATE bakery_faq_entries SET deleted_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL`,
    [id, deletedBy],
  );
  return (result.rowCount ?? 0) > 0;
};
