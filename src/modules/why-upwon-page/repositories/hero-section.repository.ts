// src/modules/why-upwon-page/repositories/hero-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateWhyUpwonHeroSlideInput,
  UpdateWhyUpwonHeroSlideInput,
  WhyUpwonHeroSlide,
  WhyUpwonHeroSlideFilters,
} from '../types/hero-section.types';

/** One table behind the section: the slides the hero rotates through. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  eyebrow: 's.eyebrow',
  displayOrder: 's.display_order',
  status: 's.status',
  createdAt: 's.created_at',
  updatedAt: 's.updated_at',
} as const;

/** Columns an update may touch directly; the artwork pairs are handled below. */
const UPDATABLE: Readonly<Record<string, string>> = {
  eyebrow: 'eyebrow',
  headline: 'headline',
  subhead: 'subhead',
  imageAlt: 'image_alt',
  primaryLabel: 'primary_label',
  primaryHref: 'primary_href',
  secondaryLabel: 'secondary_label',
  secondaryHref: 'secondary_href',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  s.id, s.eyebrow, s.headline, s.subhead,
  s.desktop_image_url, s.desktop_image_file_id,
  s.mobile_image_url, s.mobile_image_file_id,
  s.image_alt,
  s.primary_label, s.primary_href, s.secondary_label, s.secondary_href,
  s.display_order, s.status,
  s.created_by, s.updated_by, s.created_at, s.updated_at
`;

const RETURNING = `
  id, eyebrow, headline, subhead,
  desktop_image_url, desktop_image_file_id,
  mobile_image_url, mobile_image_file_id,
  image_alt,
  primary_label, primary_href, secondary_label, secondary_href,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface Row {
  id: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  desktop_image_url: string | null;
  desktop_image_file_id: string | null;
  mobile_image_url: string | null;
  mobile_image_file_id: string | null;
  image_alt: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string | null;
  secondary_href: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSlide = (row: Row): WhyUpwonHeroSlide => ({
  id: row.id,
  eyebrow: row.eyebrow,
  headline: row.headline,
  subhead: row.subhead,
  desktopImageUrl: row.desktop_image_url,
  desktopImageFileId: row.desktop_image_file_id,
  mobileImageUrl: row.mobile_image_url,
  mobileImageFileId: row.mobile_image_file_id,
  imageAlt: row.image_alt,
  primaryLabel: row.primary_label,
  primaryHref: row.primary_href,
  secondaryLabel: row.secondary_label,
  secondaryHref: row.secondary_href,
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
): Promise<WhyUpwonHeroSlide | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM why_upwon_hero_slides s WHERE s.id = $1`,
    [id],
  );
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<WhyUpwonHeroSlide | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM why_upwon_hero_slides s WHERE s.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const findAll = async (
  filters: WhyUpwonHeroSlideFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<WhyUpwonHeroSlide>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 's.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(s.eyebrow ILIKE ? OR s.headline ILIKE ? OR s.subhead ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the slider,
  // which starts from its first slide.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM why_upwon_hero_slides s
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, s.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<Row & { total_count: number }>(executor, sql, builder.getValues());

  return {
    rows: result.rows.map(toSlide),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (executor?: Executor): Promise<WhyUpwonHeroSlide[]> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM why_upwon_hero_slides s
      WHERE s.status = 'ACTIVE'
      ORDER BY s.display_order ASC, s.created_at ASC`,
    [],
  );
  return result.rows.map(toSlide);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM why_upwon_hero_slides',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM why_upwon_hero_slides',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateWhyUpwonHeroSlideInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<WhyUpwonHeroSlide> => {
  const result = await runQuery<Row>(
    executor,
    `INSERT INTO why_upwon_hero_slides
       (eyebrow, headline, subhead,
        desktop_image_url, desktop_image_file_id,
        mobile_image_url, mobile_image_file_id,
        image_alt,
        primary_label, primary_href, secondary_label, secondary_href,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
     RETURNING ${RETURNING}`,
    [
      input.eyebrow,
      input.headline,
      input.subhead,
      input.desktopImageUrl,
      input.desktopImageFileId,
      input.mobileImageUrl,
      input.mobileImageFileId,
      input.imageAlt,
      input.primaryLabel,
      input.primaryHref,
      input.secondaryLabel,
      input.secondaryHref,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toSlide(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateWhyUpwonHeroSlideInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WhyUpwonHeroSlide | null> => {
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
   * Each artwork pair is mutually exclusive, so naming one half clears the
   * other in the same statement. Without this, patching a URL onto a slide
   * that already holds an upload violates the constraint instead of replacing
   * the artwork.
   */
  if (patch.desktopImageUrl !== undefined) {
    assign('desktop_image_url', patch.desktopImageUrl);
    if (patch.desktopImageFileId === undefined) assign('desktop_image_file_id', null);
  }
  if (patch.desktopImageFileId !== undefined) {
    assign('desktop_image_file_id', patch.desktopImageFileId);
    if (patch.desktopImageUrl === undefined) assign('desktop_image_url', null);
  }
  if (patch.mobileImageUrl !== undefined) {
    assign('mobile_image_url', patch.mobileImageUrl);
    if (patch.mobileImageFileId === undefined) assign('mobile_image_file_id', null);
  }
  if (patch.mobileImageFileId !== undefined) {
    assign('mobile_image_file_id', patch.mobileImageFileId);
    if (patch.mobileImageUrl === undefined) assign('mobile_image_url', null);
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<Row>(
    executor,
    `UPDATE why_upwon_hero_slides SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
  );
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE why_upwon_hero_slides AS s
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE s.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM why_upwon_hero_slides WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM why_upwon_hero_slides WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
