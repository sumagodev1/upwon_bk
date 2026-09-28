// src/modules/clients-page/repositories/testimonials-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  ClientsTestimonial,
  ClientsTestimonialFilters,
  CreateClientsTestimonialInput,
  UpdateClientsTestimonialInput,
} from '../types/testimonials-section.types';

/** One table: the marquee is a flat list of testimonials in their authored order. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  author: 't.author',
  company: 't.company',
  displayOrder: 't.display_order',
  status: 't.status',
  createdAt: 't.created_at',
  updatedAt: 't.updated_at',
} as const;

/**
 * Columns an update may touch directly. The avatar pair is absent because it
 * needs the "setting one clears the other" handling in update().
 */
const UPDATABLE: Readonly<Record<string, string>> = {
  quote: 'quote',
  author: 'author',
  company: 'company',
  rating: 'rating',
  fallbackColor: 'fallback_color',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  t.id, t.quote, t.author, t.company, t.rating, t.avatar_url, t.avatar_file_id,
  t.fallback_color, t.display_order, t.status,
  t.created_by, t.updated_by, t.created_at, t.updated_at
`;

const RETURNING = `
  id, quote, author, company, rating, avatar_url, avatar_file_id,
  fallback_color, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface TestimonialRow {
  id: string;
  quote: string;
  author: string;
  company: string;
  rating: number;
  avatar_url: string | null;
  avatar_file_id: string | null;
  fallback_color: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toTestimonial = (row: TestimonialRow): ClientsTestimonial => ({
  id: row.id,
  quote: row.quote,
  author: row.author,
  company: row.company,
  rating: Number(row.rating),
  avatarUrl: row.avatar_url,
  avatarFileId: row.avatar_file_id,
  fallbackColor: row.fallback_color,
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
): Promise<ClientsTestimonial | null> => {
  const result = await runQuery<TestimonialRow>(
    executor,
    `SELECT ${COLUMNS} FROM clients_testimonials t WHERE t.id = $1`,
    [id],
  );
  return result.rows[0] ? toTestimonial(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ClientsTestimonial | null> => {
  const result = await runQuery<TestimonialRow>(
    executor,
    `SELECT ${COLUMNS} FROM clients_testimonials t WHERE t.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toTestimonial(result.rows[0]) : null;
};

export const findAll = async (
  filters: ClientsTestimonialFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ClientsTestimonial>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, { column: 't.status', operator: '=', value: filters.status });
  if (pagination.search) {
    const term = `%${pagination.search}%`;
    builder.raw('(t.quote ILIKE ? OR t.author ILIKE ? OR t.company ILIKE ?)', term, term, term);
  }

  // Display order is the default: the admin list should read like the marquee.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM clients_testimonials t
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, t.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<TestimonialRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toTestimonial),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** Every ACTIVE testimonial, in order, unpaginated - the cap keeps the set small. */
export const findPublished = async (executor?: Executor): Promise<ClientsTestimonial[]> => {
  const result = await runQuery<TestimonialRow>(
    executor,
    `
    SELECT ${COLUMNS}
      FROM clients_testimonials t
     WHERE t.status = 'ACTIVE'
     ORDER BY t.display_order ASC, t.created_at ASC
    `,
    [],
  );
  return result.rows.map(toTestimonial);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM clients_testimonials',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM clients_testimonials',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateClientsTestimonialInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ClientsTestimonial> => {
  const result = await runQuery<TestimonialRow>(
    executor,
    `
    INSERT INTO clients_testimonials
      (quote, author, company, rating, avatar_url, avatar_file_id, fallback_color,
       display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
    RETURNING ${RETURNING}
    `,
    [
      input.quote,
      input.author,
      input.company,
      input.rating,
      input.avatarUrl,
      input.avatarFileId,
      input.fallbackColor,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toTestimonial(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateClientsTestimonialInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsTestimonial | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  // The avatar pair is mutually exclusive by CHECK constraint, so setting one
  // side clears the other in the same statement.
  if (patch.avatarUrl !== undefined) {
    assign('avatar_url', patch.avatarUrl);
    if (patch.avatarUrl !== null && patch.avatarFileId === undefined) {
      assign('avatar_file_id', null);
    }
  }
  if (patch.avatarFileId !== undefined) {
    assign('avatar_file_id', patch.avatarFileId);
    if (patch.avatarFileId !== null && patch.avatarUrl === undefined) {
      assign('avatar_url', null);
    }
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<TestimonialRow>(
    executor,
    `
    UPDATE clients_testimonials SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING}
    `,
    values,
  );
  return result.rows[0] ? toTestimonial(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsTestimonial | null> => {
  const result = await runQuery<TestimonialRow>(
    executor,
    `
    UPDATE clients_testimonials SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${RETURNING}
    `,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toTestimonial(result.rows[0]) : null;
};

/** Rewrites display_order for the given ids in one statement. */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `
    UPDATE clients_testimonials AS t
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE t.id = ordered.id
    `,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

/** Returns the ids that actually exist, so a reorder can reject unknown ones. */
export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM clients_testimonials WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** A hard delete; INACTIVE covers "hide it for now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM clients_testimonials WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
