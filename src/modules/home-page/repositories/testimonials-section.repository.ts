// src/modules/home-page/repositories/testimonials-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateTestimonialEntryInput,
  TestimonialEntry,
  TestimonialEntryFilters,
  UpdateTestimonialEntryInput,
} from '../types/testimonials-section.types';

/**
 * One table, one row per testimonial card - the same shape as the other home
 * page sections, so all six repositories read the same way.
 */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  clientName: 'te.client_name',
  displayOrder: 'te.display_order',
  status: 'te.status',
  createdAt: 'te.created_at',
  updatedAt: 'te.updated_at',
} as const;

/**
 * Columns an update may touch. The four media columns are absent because they
 * need the "setting one clears the other" handling below, and updated_by is
 * absent because it comes from the request context, never from the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  quote: 'quote',
  clientName: 'client_name',
  clientPosition: 'client_position',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  te.id,
  te.poster_url, te.poster_file_id, te.video_url, te.video_file_id,
  te.quote, te.client_name, te.client_position,
  te.display_order, te.status,
  te.created_by, te.updated_by, te.created_at, te.updated_at
`;

const RETURNING_COLUMNS = `
  id,
  poster_url, poster_file_id, video_url, video_file_id,
  quote, client_name, client_position,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface EntryRow {
  id: string;
  poster_url: string | null;
  poster_file_id: string | null;
  video_url: string | null;
  video_file_id: string | null;
  quote: string;
  client_name: string;
  client_position: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toEntry = (row: EntryRow): TestimonialEntry => ({
  id: row.id,
  posterUrl: row.poster_url,
  posterFileId: row.poster_file_id,
  videoUrl: row.video_url,
  videoFileId: row.video_file_id,
  quote: row.quote,
  clientName: row.client_name,
  clientPosition: row.client_position,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * created_at is the tiebreaker rather than id, so two cards sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
const PUBLISHED_ORDER = 'ORDER BY te.display_order ASC, te.created_at ASC';

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<TestimonialEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_testimonial_entries te WHERE te.id = $1`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<TestimonialEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_testimonial_entries te
      WHERE te.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const findAll = async (
  filters: TestimonialEntryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<TestimonialEntry>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'te.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      `(te.quote ILIKE ? OR te.client_name ILIKE ? OR te.client_position ILIKE ?)`,
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the marquee.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM home_testimonial_entries te
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, te.created_at ASC
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

/** The public read path: every ACTIVE card, in order. */
export const findPublished = async (executor?: Executor): Promise<TestimonialEntry[]> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_testimonial_entries te
      WHERE te.status = 'ACTIVE'
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toEntry);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM home_testimonial_entries',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM home_testimonial_entries',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateTestimonialEntryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<TestimonialEntry> => {
  const sql = `
    INSERT INTO home_testimonial_entries
      (poster_url, poster_file_id, video_url, video_file_id,
       quote, client_name, client_position,
       display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<EntryRow>(executor, sql, [
    input.posterUrl,
    input.posterFileId,
    input.videoUrl,
    input.videoFileId,
    input.quote,
    input.clientName,
    input.clientPosition,
    input.displayOrder,
    input.status,
    createdBy,
  ]);
  return toEntry(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateTestimonialEntryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<TestimonialEntry | null> => {
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

  /*
   * Each pair of media columns is mutually exclusive by CHECK, so setting one
   * has to clear the other in the same statement. Without this, patching a URL
   * onto a card that already has a file id violates the constraint instead of
   * replacing the media.
   */
  const assignExclusivePair = (
    urlColumn: string,
    fileColumn: string,
    url: string | null | undefined,
    fileId: string | null | undefined,
  ): void => {
    if (url !== undefined) {
      assign(urlColumn, url);
      if (url !== null && fileId === undefined) assign(fileColumn, null);
    }
    if (fileId !== undefined) {
      assign(fileColumn, fileId);
      if (fileId !== null && url === undefined) assign(urlColumn, null);
    }
  };

  assignExclusivePair('poster_url', 'poster_file_id', patch.posterUrl, patch.posterFileId);
  assignExclusivePair('video_url', 'video_file_id', patch.videoUrl, patch.videoFileId);

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const sql = `
    UPDATE home_testimonial_entries SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<EntryRow>(executor, sql, values);
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<TestimonialEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `UPDATE home_testimonial_entries SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${RETURNING_COLUMNS}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/**
 * Rewrites display_order for the given ids in one statement, each row's
 * position taken from its index in the array. One UPDATE rather than N keeps
 * the reorder atomic and holds the row locks for as short a time as possible.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE home_testimonial_entries AS te
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE te.id = ordered.id`,
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
    'SELECT id FROM home_testimonial_entries WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM home_testimonial_entries WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
