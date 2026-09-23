// src/modules/home-page/repositories/industries-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateIndustriesEntryInput,
  IndustriesEntry,
  IndustriesEntryFilters,
  UpdateIndustriesEntryInput,
} from '../types/industries-section.types';

/**
 * One table, one row per entry - the same shape as the hero's slides and the
 * trust section's entries, so all three repositories read the same way.
 */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  eyebrow: 'ie.eyebrow',
  displayOrder: 'ie.display_order',
  status: 'ie.status',
  createdAt: 'ie.created_at',
  updatedAt: 'ie.updated_at',
} as const;

/**
 * Columns an update may touch. The two video columns are absent because they
 * need the "setting one clears the other" handling below, and updated_by is
 * absent because it comes from the request context, never from the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  eyebrow: 'eyebrow',
  heading: 'heading',
  subtext: 'subtext',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  ie.id, ie.eyebrow, ie.heading, ie.subtext, ie.video_url, ie.video_file_id,
  ie.display_order, ie.status,
  ie.created_by, ie.updated_by, ie.created_at, ie.updated_at
`;

const RETURNING_COLUMNS = `
  id, eyebrow, heading, subtext, video_url, video_file_id,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface EntryRow {
  id: string;
  eyebrow: string;
  heading: string;
  subtext: string;
  video_url: string | null;
  video_file_id: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toEntry = (row: EntryRow): IndustriesEntry => ({
  id: row.id,
  eyebrow: row.eyebrow,
  heading: row.heading,
  subtext: row.subtext,
  videoUrl: row.video_url,
  videoFileId: row.video_file_id,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * created_at is the tiebreaker rather than id, so two entries sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
const PUBLISHED_ORDER = 'ORDER BY ie.display_order ASC, ie.created_at ASC';

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<IndustriesEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_industries_entries ie WHERE ie.id = $1`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<IndustriesEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_industries_entries ie
      WHERE ie.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const findAll = async (
  filters: IndustriesEntryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<IndustriesEntry>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'ie.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(ie.eyebrow ILIKE ? OR ie.heading ILIKE ? OR ie.subtext ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the section.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM home_industries_entries ie
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, ie.created_at ASC
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

/** The public read path: every ACTIVE entry, in order. */
export const findPublished = async (executor?: Executor): Promise<IndustriesEntry[]> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_industries_entries ie
      WHERE ie.status = 'ACTIVE'
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toEntry);
};

/**
 * The one entry the site is showing, if any.
 *
 * Backs the 'only one active at a time' rule: the service uses it to refuse a
 * second activation with a message naming the entry already live, rather than
 * letting the unique index fail with a constraint violation.
 */
export const findActive = async (executor?: Executor): Promise<IndustriesEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_industries_entries ie
      WHERE ie.status = 'ACTIVE' LIMIT 1`,
    [],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM home_industries_entries',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM home_industries_entries',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateIndustriesEntryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<IndustriesEntry> => {
  const sql = `
    INSERT INTO home_industries_entries
      (eyebrow, heading, subtext, video_url, video_file_id,
       display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<EntryRow>(executor, sql, [
    input.eyebrow,
    input.heading,
    input.subtext,
    input.videoUrl,
    input.videoFileId,
    input.displayOrder,
    input.status,
    createdBy,
  ]);
  return toEntry(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateIndustriesEntryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<IndustriesEntry | null> => {
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
   * The two video columns are mutually exclusive by CHECK, so setting one has
   * to clear the other in the same statement. Without this, patching a videoUrl
   * onto an entry that already has a videoFileId violates the constraint
   * instead of replacing the video.
   */
  if (patch.videoUrl !== undefined) {
    assign('video_url', patch.videoUrl);
    if (patch.videoUrl !== null && patch.videoFileId === undefined) {
      assign('video_file_id', null);
    }
  }
  if (patch.videoFileId !== undefined) {
    assign('video_file_id', patch.videoFileId);
    if (patch.videoFileId !== null && patch.videoUrl === undefined) {
      assign('video_url', null);
    }
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const sql = `
    UPDATE home_industries_entries SET ${assignments.join(', ')}
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
): Promise<IndustriesEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `UPDATE home_industries_entries SET status = $2, updated_by = $3
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
    `UPDATE home_industries_entries AS ie
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE ie.id = ordered.id`,
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
    'SELECT id FROM home_industries_entries WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM home_industries_entries WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
