// src/modules/home-page/repositories/hero-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateHeroSlideInput,
  HeroSlide,
  HeroSlideFilters,
  UpdateHeroSlideInput,
} from '../types/hero-section.types';

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  eyebrow: 'hs.eyebrow',
  displayOrder: 'hs.display_order',
  status: 'hs.status',
  createdAt: 'hs.created_at',
  updatedAt: 'hs.updated_at',
} as const;

/**
 * Columns an update may touch. The two image columns are absent because they need
 * the "setting one clears the other" handling below, and updated_by is absent
 * because it comes from the request context, never from the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  eyebrow: 'eyebrow',
  heading: 'heading',
  subtext: 'subtext',
  imageAlt: 'image_alt',
  shine: 'shine',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  hs.id, hs.eyebrow, hs.heading, hs.subtext, hs.image_url, hs.image_file_id,
  hs.image_alt, hs.mobile_image_url, hs.mobile_image_file_id,
  hs.shine, hs.display_order, hs.status,
  hs.created_by, hs.updated_by, hs.created_at, hs.updated_at
`;

const RETURNING_COLUMNS = `
  id, eyebrow, heading, subtext, image_url, image_file_id,
  image_alt, mobile_image_url, mobile_image_file_id,
  shine, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface HeroSlideRow {
  id: string;
  eyebrow: string;
  heading: string;
  subtext: string;
  image_url: string | null;
  image_file_id: string | null;
  image_alt: string | null;
  mobile_image_url: string | null;
  mobile_image_file_id: string | null;
  shine: boolean;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toHeroSlide = (row: HeroSlideRow): HeroSlide => ({
  id: row.id,
  eyebrow: row.eyebrow,
  heading: row.heading,
  subtext: row.subtext,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  imageAlt: row.image_alt,
  mobileImageUrl: row.mobile_image_url,
  mobileImageFileId: row.mobile_image_file_id,
  shine: row.shine,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * created_at is the tiebreaker rather than id, so two slides sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
const PUBLISHED_ORDER = 'ORDER BY hs.display_order ASC, hs.created_at ASC';

export const findById = async (id: string, executor?: Executor): Promise<HeroSlide | null> => {
  const sql = `SELECT ${QUALIFIED_COLUMNS} FROM home_hero_slides hs WHERE hs.id = $1`;
  const result = await runQuery<HeroSlideRow>(executor, sql, [id]);
  return result.rows[0] ? toHeroSlide(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<HeroSlide | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS} FROM home_hero_slides hs WHERE hs.id = $1 FOR UPDATE
  `;
  const result = await runQuery<HeroSlideRow>(executor, sql, [id]);
  return result.rows[0] ? toHeroSlide(result.rows[0]) : null;
};

export const findAll = async (
  filters: HeroSlideFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<HeroSlide>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'hs.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(hs.eyebrow ILIKE ? OR hs.heading ILIKE ? OR hs.subtext ILIKE ?)',
      `%${pagination.search}%`,
      `%${pagination.search}%`,
      `%${pagination.search}%`,
    );
  }

  // Display order is the default: the admin list should read like the carousel.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM home_hero_slides hs
    ${whereClause}
     ORDER BY ${sort.column} ${sort.order}, hs.created_at ASC
    ${limitClause}
  `;
  const result = await runQuery<HeroSlideRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toHeroSlide),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/**
 * The public read path: every ACTIVE slide, in order, unpaginated.
 *
 * Unpaginated on purpose - the carousel renders all of them, and MAX_HERO_SLIDES
 * keeps the set small enough that paging would only add a round trip.
 */
export const findPublished = async (executor?: Executor): Promise<HeroSlide[]> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM home_hero_slides hs
     WHERE hs.status = 'ACTIVE'
    ${PUBLISHED_ORDER}
  `;
  const result = await runQuery<HeroSlideRow>(executor, sql, []);
  return result.rows.map(toHeroSlide);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM home_hero_slides',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM home_hero_slides',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateHeroSlideInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<HeroSlide> => {
  const sql = `
    INSERT INTO home_hero_slides
      (eyebrow, heading, subtext, image_url, image_file_id, image_alt,
       mobile_image_url, mobile_image_file_id,
       shine, display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<HeroSlideRow>(executor, sql, [
    input.eyebrow,
    input.heading,
    input.subtext,
    input.imageUrl,
    input.imageFileId,
    input.imageAlt,
    input.mobileImageUrl,
    input.mobileImageFileId,
    input.shine,
    input.displayOrder,
    input.status,
    createdBy,
  ]);
  return toHeroSlide(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateHeroSlideInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HeroSlide | null> => {
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
   * The two image columns are mutually exclusive by CHECK constraint, so setting
   * one has to clear the other in the same statement. Without this, patching
   * imageUrl onto a slide that already has an imageFileId violates the
   * constraint instead of replacing the image.
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

  // The mobile pair carries the same constraint, and so the same rule.
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
    UPDATE home_hero_slides SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<HeroSlideRow>(executor, sql, values);
  return result.rows[0] ? toHeroSlide(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HeroSlide | null> => {
  const sql = `
    UPDATE home_hero_slides SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<HeroSlideRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toHeroSlide(result.rows[0]) : null;
};

/**
 * Rewrites display_order for the given ids in one statement, each row's position
 * taken from its index in the array. One UPDATE rather than N keeps the reorder
 * atomic and holds the row locks for as short a time as possible.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const sql = `
    UPDATE home_hero_slides AS hs
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE hs.id = ordered.id
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
    'SELECT id FROM home_hero_slides WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/**
 * A hard delete. Slides reference nothing and carry no history worth keeping, so
 * the INACTIVE status covers "hide it for now" and this covers "it is gone".
 */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM home_hero_slides WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
