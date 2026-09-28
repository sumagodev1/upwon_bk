// src/modules/product-pages/vendor-portal-page/repositories/faq-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateVmsFaqEntryInput,
  UpdateVmsFaqEntryInput,
  VmsFaqEntry,
  VmsFaqEntryFilters,
} from '../types/faq-section.types';

/** One table behind the section: the questions in the accordion. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  question: 'e.question',
  displayOrder: 'e.display_order',
  status: 'e.status',
  createdAt: 'e.created_at',
  updatedAt: 'e.updated_at',
} as const;

const UPDATABLE: Readonly<Record<string, string>> = {
  question: 'question',
  answer: 'answer',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  e.id, e.question, e.answer, e.display_order, e.status,
  e.created_by, e.updated_by, e.created_at, e.updated_at
`;

const RETURNING = `
  id, question, answer, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface Row {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toEntry = (row: Row): VmsFaqEntry => ({
  id: row.id,
  question: row.question,
  answer: row.answer,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findById = async (id: string, executor?: Executor): Promise<VmsFaqEntry | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_faq_entries e WHERE e.id = $1`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<VmsFaqEntry | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_faq_entries e WHERE e.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const findAll = async (
  filters: VmsFaqEntryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<VmsFaqEntry>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'e.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(e.question ILIKE ? OR e.answer ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the
  // accordion, which starts from its first question.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM vms_faq_entries e
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, e.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<Row & { total_count: number }>(executor, sql, builder.getValues());

  return {
    rows: result.rows.map(toEntry),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (executor?: Executor): Promise<VmsFaqEntry[]> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_faq_entries e
      WHERE e.status = 'ACTIVE'
      ORDER BY e.display_order ASC, e.created_at ASC`,
    [],
  );
  return result.rows.map(toEntry);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM vms_faq_entries',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM vms_faq_entries',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateVmsFaqEntryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<VmsFaqEntry> => {
  const result = await runQuery<Row>(
    executor,
    `INSERT INTO vms_faq_entries
       (question, answer, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${RETURNING}`,
    [input.question, input.answer, input.displayOrder, input.status, createdBy],
  );
  return toEntry(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateVmsFaqEntryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<VmsFaqEntry | null> => {
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
    `UPDATE vms_faq_entries SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
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
    `UPDATE vms_faq_entries AS e
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE e.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM vms_faq_entries WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM vms_faq_entries WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
