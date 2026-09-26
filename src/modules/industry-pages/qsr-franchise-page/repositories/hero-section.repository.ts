// src/modules/industry-pages/qsr-franchise-page/repositories/hero-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateQsrFranchiseHeroSlideInput,
  QsrFranchiseHeroSlide,
  QsrFranchiseHeroSlideFilters,
  UpdateQsrFranchiseHeroSlideInput,
} from '../types/hero-section.types';

/** One table, one row per slide - the same shape as every other list section. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  eyebrow: 'hs.eyebrow',
  displayOrder: 'hs.display_order',
  status: 'hs.status',
  createdAt: 'hs.created_at',
  updatedAt: 'hs.updated_at',
} as const;

/**
 * Columns an update may touch directly. The image pair is absent because it
 * needs the "setting one clears the other" handling, the button columns are
 * absent because they are written as pairs, and updated_by is absent because
 * it comes from the request context rather than the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  eyebrow: 'eyebrow',
  headline: 'headline',
  subhead: 'subhead',
  microTrust: 'micro_trust',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  hs.id, hs.eyebrow, hs.headline, hs.subhead, hs.micro_trust,
  hs.cta_label, hs.cta_href, hs.secondary_label, hs.secondary_href,
  hs.image_url, hs.image_file_id,
  hs.mobile_image_url, hs.mobile_image_file_id,
  hs.display_order, hs.status,
  hs.created_by, hs.updated_by, hs.created_at, hs.updated_at
`;

const RETURNING_COLUMNS = `
  id, eyebrow, headline, subhead, micro_trust,
  cta_label, cta_href, secondary_label, secondary_href,
  image_url, image_file_id,
  mobile_image_url, mobile_image_file_id,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface SlideRow {
  id: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  micro_trust: string | null;
  cta_label: string | null;
  cta_href: string | null;
  secondary_label: string | null;
  secondary_href: string | null;
  image_url: string | null;
  image_file_id: string | null;
  mobile_image_url: string | null;
  mobile_image_file_id: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSlide = (row: SlideRow): QsrFranchiseHeroSlide => ({
  id: row.id,
  eyebrow: row.eyebrow,
  headline: row.headline,
  subhead: row.subhead,
  microTrust: row.micro_trust,
  // The CHECK constraints keep each pair whole, so one non-null half is enough.
  cta: row.cta_label && row.cta_href ? { label: row.cta_label, href: row.cta_href } : null,
  secondaryCta:
    row.secondary_label && row.secondary_href
      ? { label: row.secondary_label, href: row.secondary_href }
      : null,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  mobileImageUrl: row.mobile_image_url,
  mobileImageFileId: row.mobile_image_file_id,
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

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<QsrFranchiseHeroSlide | null> => {
  const result = await runQuery<SlideRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM qsr_franchise_hero_slides hs WHERE hs.id = $1`,
    [id],
  );
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<QsrFranchiseHeroSlide | null> => {
  const result = await runQuery<SlideRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM qsr_franchise_hero_slides hs WHERE hs.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const findAll = async (
  filters: QsrFranchiseHeroSlideFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<QsrFranchiseHeroSlide>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'hs.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      `(hs.eyebrow ILIKE ? OR hs.headline ILIKE ? OR hs.subhead ILIKE ?)`,
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the slider.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM qsr_franchise_hero_slides hs
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, hs.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<SlideRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toSlide),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every ACTIVE slide, in order. */
export const findPublished = async (executor?: Executor): Promise<QsrFranchiseHeroSlide[]> => {
  const result = await runQuery<SlideRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM qsr_franchise_hero_slides hs
      WHERE hs.status = 'ACTIVE'
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toSlide);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM qsr_franchise_hero_slides',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM qsr_franchise_hero_slides',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateQsrFranchiseHeroSlideInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<QsrFranchiseHeroSlide> => {
  const sql = `
    INSERT INTO qsr_franchise_hero_slides
      (eyebrow, headline, subhead, micro_trust,
       cta_label, cta_href, secondary_label, secondary_href,
       image_url, image_file_id, mobile_image_url, mobile_image_file_id,
       display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<SlideRow>(executor, sql, [
    input.eyebrow,
    input.headline,
    input.subhead,
    input.microTrust,
    input.cta?.label ?? null,
    input.cta?.href ?? null,
    input.secondaryCta?.label ?? null,
    input.secondaryCta?.href ?? null,
    input.imageUrl,
    input.imageFileId,
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
  patch: UpdateQsrFranchiseHeroSlideInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<QsrFranchiseHeroSlide | null> => {
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

  // Buttons are written as a pair, so a cleared one nulls both its columns and
  // cannot leave a dangling label behind.
  if (patch.cta !== undefined) {
    assign('cta_label', patch.cta?.label ?? null);
    assign('cta_href', patch.cta?.href ?? null);
  }
  if (patch.secondaryCta !== undefined) {
    assign('secondary_label', patch.secondaryCta?.label ?? null);
    assign('secondary_href', patch.secondaryCta?.href ?? null);
  }

  /*
   * The two image columns are mutually exclusive by CHECK, so setting one has
   * to clear the other in the same statement. Without this, patching imageUrl
   * onto a slide that already has an imageFileId violates the constraint
   * instead of replacing the image.
   */
  if (patch.imageUrl !== undefined) {
    assign('image_url', patch.imageUrl);
    if (patch.imageUrl !== null && patch.imageFileId === undefined) assign('image_file_id', null);
  }
  if (patch.imageFileId !== undefined) {
    assign('image_file_id', patch.imageFileId);
    if (patch.imageFileId !== null && patch.imageUrl === undefined) assign('image_url', null);
  }

  // The mobile pair is mutually exclusive on the same rule, so setting one
  // clears the other in the same statement.
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
    UPDATE qsr_franchise_hero_slides SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<SlideRow>(executor, sql, values);
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<QsrFranchiseHeroSlide | null> => {
  const result = await runQuery<SlideRow>(
    executor,
    `UPDATE qsr_franchise_hero_slides SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${RETURNING_COLUMNS}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toSlide(result.rows[0]) : null;
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
    `UPDATE qsr_franchise_hero_slides AS hs
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE hs.id = ordered.id`,
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
    'SELECT id FROM qsr_franchise_hero_slides WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM qsr_franchise_hero_slides WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
