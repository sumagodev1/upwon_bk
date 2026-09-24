// src/modules/product-pages/fms-page/repositories/video-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateFmsVideoEntryInput,
  FmsVideoEntry,
  FmsVideoEntryFilters,
  UpdateFmsVideoEntryInput,
} from '../types/video-section.types';

/** One table: the video entries, of which one is live at a time. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  displayOrder: 'e.display_order',
  status: 'e.status',
  createdAt: 'e.created_at',
  updatedAt: 'e.updated_at',
} as const;

const COLUMNS = `
  e.id, e.video_url, e.video_file_id, e.display_order, e.status,
  e.created_by, e.updated_by, e.created_at, e.updated_at
`;

const RETURNING = `
  id, video_url, video_file_id, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface EntryRow {
  id: string;
  video_url: string | null;
  video_file_id: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toEntry = (row: EntryRow): FmsVideoEntry => ({
  id: row.id,
  videoUrl: row.video_url,
  videoFileId: row.video_file_id,
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
): Promise<FmsVideoEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${COLUMNS} FROM fms_video_entries e WHERE e.id = $1`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<FmsVideoEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${COLUMNS} FROM fms_video_entries e WHERE e.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/** The live entry, if there is one. At most one row can be ACTIVE. */
export const findActive = async (executor?: Executor): Promise<FmsVideoEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${COLUMNS} FROM fms_video_entries e WHERE e.status = 'ACTIVE' LIMIT 1`,
    [],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const findAll = async (
  filters: FmsVideoEntryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<FmsVideoEntry>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'e.status',
    operator: '=',
    value: filters.status,
  });
  /*
   * Searched by video URL, which is the only text an entry carries. An
   * uploaded clip has none, so it is found by filtering rather than typing -
   * which is why the admin list leads with the status column.
   */
  if (pagination.search) {
    builder.raw('e.video_url ILIKE ?', `%${pagination.search}%`);
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM fms_video_entries e
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, e.created_at ASC
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

export const findPublished = async (executor?: Executor): Promise<FmsVideoEntry[]> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${COLUMNS} FROM fms_video_entries e
      WHERE e.status = 'ACTIVE'
      ORDER BY e.display_order ASC, e.created_at ASC`,
    [],
  );
  return result.rows.map(toEntry);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM fms_video_entries',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM fms_video_entries',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateFmsVideoEntryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<FmsVideoEntry> => {
  const result = await runQuery<EntryRow>(
    executor,
    `INSERT INTO fms_video_entries
       (video_url, video_file_id, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${RETURNING}`,
    [input.videoUrl, input.videoFileId, input.displayOrder, input.status, createdBy],
  );
  return toEntry(result.rows[0]);
};

/**
 * Setting one video source clears the other.
 *
 * Without this, uploading a replacement for an entry that currently holds a
 * URL would leave both columns populated and trip the table's exclusivity
 * check - so the edit that looks obvious in the form would fail on save.
 */
export const update = async (
  id: string,
  patch: UpdateFmsVideoEntryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<FmsVideoEntry | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

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
  if (patch.displayOrder !== undefined) assign('display_order', patch.displayOrder);
  if (patch.status !== undefined) assign('status', patch.status);

  if (assignments.length === 0) return findById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<EntryRow>(
    executor,
    `UPDATE fms_video_entries SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<FmsVideoEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `UPDATE fms_video_entries SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${RETURNING}`,
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
    `UPDATE fms_video_entries AS e
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE e.id = ordered.id`,
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
    'SELECT id FROM fms_video_entries WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM fms_video_entries WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
