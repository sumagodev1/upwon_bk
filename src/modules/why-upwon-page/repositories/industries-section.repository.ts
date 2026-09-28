// src/modules/why-upwon-page/repositories/industries-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateWhyUpwonIndustryInput,
  WhyUpwonIndustry,
  WhyUpwonIndustryFilters,
  UpdateWhyUpwonIndustryInput,
} from '../types/industries-section.types';

/**
 * One table, one row per industry - the same shape as every other list
 * section: a photo, a name and a link.
 *
 * Grouped in one file rather than two because they are read together - the
 * published section is a single query fan-out - and neither is big enough to be
 * worth opening on its own.
 */

// ── the industries ──────────────────────────────────────────────────────────

const CATEGORY_SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 'l.label',
  displayOrder: 'l.display_order',
  status: 'l.status',
  createdAt: 'l.created_at',
  updatedAt: 'l.updated_at',
} as const;

const CATEGORY_UPDATABLE: Readonly<Record<string, string>> = {
  imageUrl: 'image_url',
  imageFileId: 'image_file_id',
  label: 'label',
  href: 'href',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const CATEGORY_COLUMNS = `
  l.id, l.image_url, l.image_file_id, l.label, l.href, l.display_order, l.status,
  l.created_by, l.updated_by, l.created_at, l.updated_at
`;

const CATEGORY_RETURNING = `
  id, image_url, image_file_id, label, href, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface IndustryRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  label: string;
  href: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toIndustry = (row: IndustryRow): WhyUpwonIndustry => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  label: row.label,
  href: row.href,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findIndustryById = async (
  id: string,
  executor?: Executor,
): Promise<WhyUpwonIndustry | null> => {
  const result = await runQuery<IndustryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM why_upwon_industries l WHERE l.id = $1`,
    [id],
  );
  return result.rows[0] ? toIndustry(result.rows[0]) : null;
};

export const findIndustryByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<WhyUpwonIndustry | null> => {
  const result = await runQuery<IndustryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM why_upwon_industries l WHERE l.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toIndustry(result.rows[0]) : null;
};

export const findAllIndustries = async (
  filters: WhyUpwonIndustryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<WhyUpwonIndustry>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'l.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw('l.label ILIKE ?', `%${pagination.search}%`);
  }

  // Display order is the default: the admin list should read like the row.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, CATEGORY_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${CATEGORY_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM why_upwon_industries l
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, l.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<IndustryRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toIndustry),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedIndustries = async (executor?: Executor): Promise<WhyUpwonIndustry[]> => {
  const result = await runQuery<IndustryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM why_upwon_industries l
      WHERE l.status = 'ACTIVE'
      ORDER BY l.display_order ASC, l.created_at ASC`,
    [],
  );
  return result.rows.map(toIndustry);
};

export const countIndustries = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM why_upwon_industries',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextIndustryOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM why_upwon_industries',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createIndustry = async (
  input: CreateWhyUpwonIndustryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<WhyUpwonIndustry> => {
  const result = await runQuery<IndustryRow>(
    executor,
    `INSERT INTO why_upwon_industries
       (image_url, image_file_id, label, href, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING ${CATEGORY_RETURNING}`,
    [
      input.imageUrl,
      input.imageFileId,
      input.label,
      input.href,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toIndustry(result.rows[0]);
};

/**
 * Setting one image source clears the other.
 *
 * Without this, swapping an uploaded mark for a hosted URL would leave both
 * columns populated and trip the table's exclusivity check - so the edit that
 * looks obvious in the form would fail on save.
 */
export const updateIndustry = async (
  id: string,
  patch: UpdateWhyUpwonIndustryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WhyUpwonIndustry | null> => {
  const effective: Record<string, unknown> = { ...patch };
  if (patch.imageUrl !== undefined && patch.imageUrl !== null) effective.imageFileId = null;
  if (patch.imageFileId !== undefined && patch.imageFileId !== null) effective.imageUrl = null;

  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(CATEGORY_UPDATABLE)) {
    const value = effective[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findIndustryById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<IndustryRow>(
    executor,
    `UPDATE why_upwon_industries SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${CATEGORY_RETURNING}`,
    values,
  );
  return result.rows[0] ? toIndustry(result.rows[0]) : null;
};

export const applyIndustryOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE why_upwon_industries AS l
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE l.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIndustryIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM why_upwon_industries WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeIndustry = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM why_upwon_industries WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

