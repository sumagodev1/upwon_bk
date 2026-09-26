// src/modules/blog/repositories/hero-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  BlogHeroSlide,
  BlogHeroSlideFilters,
  CreateBlogHeroSlideInput,
  UpdateBlogHeroSlideInput,
} from '../types/hero-section.types';

/*
 * The SQL mirrors the Insider hero repository statement for statement; only
 * the table and its columns differ (an eyebrow, no image_alt, no
 * mobile_image_url, and an image_url the API never writes a URL into).
 */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  displayOrder: 'bhs.display_order',
  status: 'bhs.status',
  createdAt: 'bhs.created_at',
  updatedAt: 'bhs.updated_at',
} as const;

/**
 * Columns an update may touch. The image columns are absent because they need
 * the "an upload replaces the legacy picture" handling in update(), and
 * updated_by is absent because it comes from the request context, never from
 * the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  eyebrow: 'eyebrow',
  heading: 'heading',
  subtext: 'subtext',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  bhs.id, bhs.eyebrow, bhs.heading, bhs.subtext,
  bhs.image_url, bhs.image_file_id, bhs.mobile_image_file_id,
  bhs.display_order, bhs.status,
  bhs.created_by, bhs.updated_by, bhs.created_at, bhs.updated_at
`;

const RETURNING_COLUMNS = `
  id, eyebrow, heading, subtext,
  image_url, image_file_id, mobile_image_file_id,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface BlogHeroSlideRow {
  id: string;
  eyebrow: string;
  heading: string;
  subtext: string;
  image_url: string | null;
  image_file_id: string | null;
  mobile_image_file_id: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSlide = (row: BlogHeroSlideRow): BlogHeroSlide => ({
  id: row.id,
  eyebrow: row.eyebrow,
  heading: row.heading,
  subtext: row.subtext,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  mobileImageFileId: row.mobile_image_file_id,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** created_at breaks display_order ties, so the live order is stable. */
const PUBLISHED_ORDER = 'ORDER BY bhs.display_order ASC, bhs.created_at ASC';

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<BlogHeroSlide | null> => {
  const sql = `SELECT ${QUALIFIED_COLUMNS} FROM blog_hero_slides bhs WHERE bhs.id = $1`;
  const result = await runQuery<BlogHeroSlideRow>(executor, sql, [id]);
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BlogHeroSlide | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS} FROM blog_hero_slides bhs WHERE bhs.id = $1 FOR UPDATE
  `;
  const result = await runQuery<BlogHeroSlideRow>(executor, sql, [id]);
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const findAll = async (
  filters: BlogHeroSlideFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BlogHeroSlide>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'bhs.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(bhs.eyebrow ILIKE ? OR bhs.heading ILIKE ? OR bhs.subtext ILIKE ?)',
      `%${pagination.search}%`,
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
      FROM blog_hero_slides bhs
    ${whereClause}
     ORDER BY ${sort.column} ${sort.order}, bhs.created_at ASC
    ${limitClause}
  `;
  const result = await runQuery<BlogHeroSlideRow & { total_count: number }>(
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
 * MAX_BLOG_HERO_SLIDES keeps the set small enough that paging would only add a
 * round trip.
 */
export const findPublished = async (executor?: Executor): Promise<BlogHeroSlide[]> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM blog_hero_slides bhs
     WHERE bhs.status = 'ACTIVE'
    ${PUBLISHED_ORDER}
  `;
  const result = await runQuery<BlogHeroSlideRow>(executor, sql, []);
  return result.rows.map(toSlide);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM blog_hero_slides',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM blog_hero_slides',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateBlogHeroSlideInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BlogHeroSlide> => {
  // image_url is not in the list: it is legacy / seed-only (see
  // 050_blog_hero_slides.sql), and a slide created through the API takes its
  // pictures from uploads alone.
  const sql = `
    INSERT INTO blog_hero_slides
      (eyebrow, heading, subtext, image_file_id, mobile_image_file_id,
       display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<BlogHeroSlideRow>(executor, sql, [
    input.eyebrow,
    input.heading,
    input.subtext,
    input.imageFileId,
    input.mobileImageFileId,
    input.displayOrder,
    input.status,
    createdBy,
  ]);
  return toSlide(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateBlogHeroSlideInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BlogHeroSlide | null> => {
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

  if (patch.imageFileId !== undefined) assign('image_file_id', patch.imageFileId);
  if (patch.mobileImageFileId !== undefined) {
    assign('mobile_image_file_id', patch.mobileImageFileId);
  }

  /*
   * The only write image_url ever gets is NULL: any imageFileId sent - an
   * upload (which also keeps the single-source CHECK satisfied) or null for
   * "removed" - replaces the seeded picture, and so does clearLegacyImage. An
   * absent imageFileId leaves it; see the validator for why that is safe.
   */
  if (patch.clearLegacyImage || patch.imageFileId !== undefined) {
    assign('image_url', null);
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);

  values.push(id);
  const sql = `
    UPDATE blog_hero_slides SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<BlogHeroSlideRow>(executor, sql, values);
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BlogHeroSlide | null> => {
  const sql = `
    UPDATE blog_hero_slides SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<BlogHeroSlideRow>(executor, sql, [id, status, updatedBy]);
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
    UPDATE blog_hero_slides AS bhs
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE bhs.id = ordered.id
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
    'SELECT id FROM blog_hero_slides WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** A hard delete; INACTIVE covers "hide it for now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM blog_hero_slides WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
