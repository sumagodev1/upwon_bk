// src/modules/product-pages/vendor-portal-page/repositories/outcomes-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateVmsOutcomeVideoInput,
  UpdateVmsOutcomeVideoInput,
  VmsOutcomeVideo,
  VmsOutcomeVideoFilters,
} from '../types/outcomes-section.types';

/** One table behind the section: the tabs beside the player. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 'v.label',
  title: 'v.title',
  displayOrder: 'v.display_order',
  status: 'v.status',
  createdAt: 'v.created_at',
  updatedAt: 'v.updated_at',
} as const;

/**
 * Columns an update may touch directly.
 *
 * Every media column is here too, unlike the sections whose picture is
 * required: each of these is genuinely optional, so `null` is a value to
 * write rather than a half-finished state to guard against. The two
 * exclusivity rules are handled below.
 */
const UPDATABLE: Readonly<Record<string, string>> = {
  label: 'label',
  badge: 'badge',
  duration: 'duration',
  title: 'title',
  description: 'description',
  buttonLabel: 'button_label',
  buttonHref: 'button_href',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  v.id, v.label, v.badge, v.duration, v.title, v.description,
  v.button_label, v.button_href,
  v.video_url, v.video_file_id, v.poster_url, v.poster_file_id,
  v.display_order, v.status,
  v.created_by, v.updated_by, v.created_at, v.updated_at
`;

const RETURNING = `
  id, label, badge, duration, title, description,
  button_label, button_href,
  video_url, video_file_id, poster_url, poster_file_id,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface Row {
  id: string;
  label: string;
  badge: string;
  duration: string | null;
  title: string;
  description: string;
  button_label: string | null;
  button_href: string | null;
  video_url: string | null;
  video_file_id: string | null;
  poster_url: string | null;
  poster_file_id: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toVideo = (row: Row): VmsOutcomeVideo => ({
  id: row.id,
  label: row.label,
  badge: row.badge,
  duration: row.duration,
  title: row.title,
  description: row.description,
  buttonLabel: row.button_label,
  buttonHref: row.button_href,
  videoUrl: row.video_url,
  videoFileId: row.video_file_id,
  posterUrl: row.poster_url,
  posterFileId: row.poster_file_id,
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
): Promise<VmsOutcomeVideo | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_outcome_videos v WHERE v.id = $1`,
    [id],
  );
  return result.rows[0] ? toVideo(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<VmsOutcomeVideo | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_outcome_videos v WHERE v.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toVideo(result.rows[0]) : null;
};

export const findAll = async (
  filters: VmsOutcomeVideoFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<VmsOutcomeVideo>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'v.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(v.label ILIKE ? OR v.title ILIKE ? OR v.description ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the tab
  // strip, which starts from its top tab.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM vms_outcome_videos v
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, v.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<Row & { total_count: number }>(executor, sql, builder.getValues());

  return {
    rows: result.rows.map(toVideo),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (executor?: Executor): Promise<VmsOutcomeVideo[]> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_outcome_videos v
      WHERE v.status = 'ACTIVE'
      ORDER BY v.display_order ASC, v.created_at ASC`,
    [],
  );
  return result.rows.map(toVideo);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM vms_outcome_videos',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM vms_outcome_videos',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateVmsOutcomeVideoInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<VmsOutcomeVideo> => {
  const result = await runQuery<Row>(
    executor,
    `INSERT INTO vms_outcome_videos
       (label, badge, duration, title, description,
        button_label, button_href,
        video_url, video_file_id, poster_url, poster_file_id,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
     RETURNING ${RETURNING}`,
    [
      input.label,
      input.badge,
      input.duration,
      input.title,
      input.description,
      input.buttonLabel,
      input.buttonHref,
      input.videoUrl,
      input.videoFileId,
      input.posterUrl,
      input.posterFileId,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toVideo(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateVmsOutcomeVideoInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<VmsOutcomeVideo | null> => {
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

  /*
   * Each media pair is mutually exclusive, so naming one half clears the
   * other in the same statement. Without this, patching a URL onto an entry
   * that already holds an upload violates the constraint instead of replacing
   * the film.
   */
  if (patch.videoUrl !== undefined) {
    assign('video_url', patch.videoUrl);
    if (patch.videoFileId === undefined) assign('video_file_id', null);
  }
  if (patch.videoFileId !== undefined) {
    assign('video_file_id', patch.videoFileId);
    if (patch.videoUrl === undefined) assign('video_url', null);
  }
  if (patch.posterUrl !== undefined) {
    assign('poster_url', patch.posterUrl);
    if (patch.posterFileId === undefined) assign('poster_file_id', null);
  }
  if (patch.posterFileId !== undefined) {
    assign('poster_file_id', patch.posterFileId);
    if (patch.posterUrl === undefined) assign('poster_url', null);
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<Row>(
    executor,
    `UPDATE vms_outcome_videos SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
  );
  return result.rows[0] ? toVideo(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE vms_outcome_videos AS v
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE v.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM vms_outcome_videos WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM vms_outcome_videos WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
