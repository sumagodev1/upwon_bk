// src/modules/clients-page/repositories/hero-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateClientsHeroSlideInput,
  ClientsHeroSlide,
  ClientsHeroSlideFilters,
  UpdateClientsHeroSlideInput,
} from '../types/hero-section.types';

/*
 * The SQL mirrors the home hero repository statement for statement; only the
 * table and the absent shine column differ. Kept as its own file rather than a
 * table-name parameter so each section's SQL stays greppable and independently
 * changeable.
 */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  displayOrder: 'chs.display_order',
  status: 'chs.status',
  createdAt: 'chs.created_at',
  updatedAt: 'chs.updated_at',
} as const;

/**
 * Columns an update may touch. The image columns are absent because they need
 * the "setting one clears the other" handling in update(), and updated_by is
 * absent because it comes from the request context, never from the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  heading: 'heading',
  subtext: 'subtext',
  imageAlt: 'image_alt',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  chs.id, chs.heading, chs.subtext, chs.image_url, chs.image_file_id,
  chs.image_alt, chs.mobile_image_url, chs.mobile_image_file_id,
  chs.display_order, chs.status,
  chs.created_by, chs.updated_by, chs.created_at, chs.updated_at
`;

const RETURNING_COLUMNS = `
  id, heading, subtext, image_url, image_file_id,
  image_alt, mobile_image_url, mobile_image_file_id,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface ClientsHeroSlideRow {
  id: string;
  heading: string;
  subtext: string;
  image_url: string | null;
  image_file_id: string | null;
  image_alt: string | null;
  mobile_image_url: string | null;
  mobile_image_file_id: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSlide = (row: ClientsHeroSlideRow): ClientsHeroSlide => ({
  id: row.id,
  heading: row.heading,
  subtext: row.subtext,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  imageAlt: row.image_alt,
  mobileImageUrl: row.mobile_image_url,
  mobileImageFileId: row.mobile_image_file_id,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** created_at breaks display_order ties, so the live order is stable. */
const PUBLISHED_ORDER = 'ORDER BY chs.display_order ASC, chs.created_at ASC';

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<ClientsHeroSlide | null> => {
  const sql = `SELECT ${QUALIFIED_COLUMNS} FROM clients_hero_slides chs WHERE chs.id = $1`;
  const result = await runQuery<ClientsHeroSlideRow>(executor, sql, [id]);
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ClientsHeroSlide | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS} FROM clients_hero_slides chs WHERE chs.id = $1 FOR UPDATE
  `;
  const result = await runQuery<ClientsHeroSlideRow>(executor, sql, [id]);
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const findAll = async (
  filters: ClientsHeroSlideFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ClientsHeroSlide>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'chs.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(chs.heading ILIKE ? OR chs.subtext ILIKE ?)',
      `%${pagination.search}%`,
      `%${pagination.search}%`,
    );
  }

  // Display order is the default: the admin list should read like the slider.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM clients_hero_slides chs
    ${whereClause}
     ORDER BY ${sort.column} ${sort.order}, chs.created_at ASC
    ${limitClause}
  `;
  const result = await runQuery<ClientsHeroSlideRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toSlide),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/**
 * The public read path: every ACTIVE slide, in order, unpaginated.
 * MAX_CLIENTS_HERO_SLIDES keeps the set small enough that paging would only add
 * a round trip.
 */
export const findPublished = async (executor?: Executor): Promise<ClientsHeroSlide[]> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM clients_hero_slides chs
     WHERE chs.status = 'ACTIVE'
    ${PUBLISHED_ORDER}
  `;
  const result = await runQuery<ClientsHeroSlideRow>(executor, sql, []);
  return result.rows.map(toSlide);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM clients_hero_slides',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM clients_hero_slides',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateClientsHeroSlideInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ClientsHeroSlide> => {
  const sql = `
    INSERT INTO clients_hero_slides
      (heading, subtext, image_url, image_file_id, image_alt,
       mobile_image_url, mobile_image_file_id,
       display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<ClientsHeroSlideRow>(executor, sql, [
    input.heading,
    input.subtext,
    input.imageUrl,
    input.imageFileId,
    input.imageAlt,
    input.mobileImageUrl,
    input.mobileImageFileId,
    input.displayOrder,
    input.status,
    createdBy,
  ]);
  return toSlide(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateClientsHeroSlideInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsHeroSlide | null> => {
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
   * Each image pair is mutually exclusive by CHECK constraint, so setting one
   * side has to clear the other in the same statement - otherwise patching
   * imageUrl onto a slide that has an imageFileId violates the constraint
   * instead of replacing the image.
   */
  if (patch.imageUrl !== undefined) {
    assign('image_url', patch.imageUrl);
    if (patch.imageUrl !== null && patch.imageFileId === undefined) {
      assign('image_file_id', null);
    }
  }
  if (patch.imageFileId !== undefined) {
    assign('image_file_id', patch.imageFileId);
    if (patch.imageFileId !== null && patch.imageUrl === undefined) {
      assign('image_url', null);
    }
  }

  if (patch.mobileImageUrl !== undefined) {
    assign('mobile_image_url', patch.mobileImageUrl);
    if (patch.mobileImageUrl !== null && patch.mobileImageFileId === undefined) {
      assign('mobile_image_file_id', null);
    }
  }
  if (patch.mobileImageFileId !== undefined) {
    assign('mobile_image_file_id', patch.mobileImageFileId);
    if (patch.mobileImageFileId !== null && patch.mobileImageUrl === undefined) {
      assign('mobile_image_url', null);
    }
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);

  values.push(id);
  const sql = `
    UPDATE clients_hero_slides SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<ClientsHeroSlideRow>(executor, sql, values);
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsHeroSlide | null> => {
  const sql = `
    UPDATE clients_hero_slides SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<ClientsHeroSlideRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

/**
 * Rewrites display_order for the given ids in one statement, each row's
 * position taken from its index in the array.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const sql = `
    UPDATE clients_hero_slides AS chs
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE chs.id = ordered.id
  `;
  const result = await runQuery(executor, sql, [orderedIds, updatedBy]);
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
    'SELECT id FROM clients_hero_slides WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** A hard delete; INACTIVE covers "hide it for now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM clients_hero_slides WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
