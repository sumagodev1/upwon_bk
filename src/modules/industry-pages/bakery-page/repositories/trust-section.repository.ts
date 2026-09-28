// src/modules/industry-pages/bakery-page/repositories/trust-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  BakeryTrustLogo,
  BakeryTrustLogoFilters,
  BakeryTrustStat,
  BakeryTrustStatFilters,
  CreateBakeryTrustLogoInput,
  CreateBakeryTrustStatInput,
  UpdateBakeryTrustLogoInput,
  UpdateBakeryTrustStatInput,
} from '../types/trust-section.types';
import { assignImagePair } from '../utils/image-pair';

/** Two tables, one row per logo and one per figure. */

// ── the customer logos ────────────────────────────────────────────────────

const LOGO_SORT_COLUMNS: Readonly<Record<string, string>> = {
  alt: 'tl.alt',
  displayOrder: 'tl.display_order',
  status: 'tl.status',
  createdAt: 'tl.created_at',
  updatedAt: 'tl.updated_at',
} as const;

const LOGO_QUALIFIED_COLUMNS = `
  tl.id, tl.image_url, tl.image_file_id, tl.alt, tl.display_order, tl.status,
  tl.created_by, tl.updated_by, tl.created_at, tl.updated_at
`;

const LOGO_RETURNING_COLUMNS = `
  id, image_url, image_file_id, alt, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface LogoRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  alt: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toLogo = (row: LogoRow): BakeryTrustLogo => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  alt: row.alt,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findLogoById = async (
  id: string,
  executor?: Executor,
): Promise<BakeryTrustLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_QUALIFIED_COLUMNS} FROM bakery_trust_logos tl WHERE tl.id = $1 AND tl.deleted_at IS NULL`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findLogoByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BakeryTrustLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_QUALIFIED_COLUMNS} FROM bakery_trust_logos tl WHERE tl.id = $1 AND tl.deleted_at IS NULL FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findAllLogos = async (
  filters: BakeryTrustLogoFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BakeryTrustLogo>> => {
  const builder = new SqlBuilder();
  // Soft-deleted rows are gone from every admin list and search.
  builder.raw('tl.deleted_at IS NULL');
  builder.whereIf(filters.status, { column: 'tl.status', operator: '=', value: filters.status });
  if (pagination.search) builder.raw('tl.alt ILIKE ?', `%${pagination.search}%`);

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, LOGO_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<LogoRow & { total_count: number }>(
    executor,
    `SELECT ${LOGO_QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM bakery_trust_logos tl
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, tl.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toLogo),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedLogos = async (executor?: Executor): Promise<BakeryTrustLogo[]> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_QUALIFIED_COLUMNS} FROM bakery_trust_logos tl
      WHERE tl.status = 'ACTIVE' AND tl.deleted_at IS NULL
     ORDER BY tl.display_order ASC, tl.created_at ASC`,
    [],
  );
  return result.rows.map(toLogo);
};

export const countLogos = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM bakery_trust_logos WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextLogoOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM bakery_trust_logos WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createLogo = async (
  input: CreateBakeryTrustLogoInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BakeryTrustLogo> => {
  const result = await runQuery<LogoRow>(
    executor,
    `INSERT INTO bakery_trust_logos
       (image_url, image_file_id, alt, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${LOGO_RETURNING_COLUMNS}`,
    [input.imageUrl, input.imageFileId, input.alt, input.displayOrder, input.status, createdBy],
  );
  return toLogo(result.rows[0]);
};

export const updateLogo = async (
  id: string,
  patch: UpdateBakeryTrustLogoInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BakeryTrustLogo | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (patch.alt !== undefined) assign('alt', patch.alt);
  if (patch.displayOrder !== undefined) assign('display_order', patch.displayOrder);
  if (patch.status !== undefined) assign('status', patch.status);
  assignImagePair(assign, 'image_url', 'image_file_id', patch.imageUrl, patch.imageFileId);

  if (assignments.length === 0) return findLogoById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<LogoRow>(
    executor,
    `UPDATE bakery_trust_logos SET ${assignments.join(', ')}
      WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING ${LOGO_RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const applyLogoOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE bakery_trust_logos AS tl
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE tl.id = ordered.id AND tl.deleted_at IS NULL`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingLogoIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM bakery_trust_logos WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/**
 * Soft delete: stamps deleted_at rather than removing the row, so the record
 * stays in the table for audit and recovery. Every read above ignores it.
 */
export const removeLogo = async (
  id: string,
  deletedBy: string | null,
  executor?: Executor,
): Promise<boolean> => {
  const result = await runQuery(
    executor,
    `UPDATE bakery_trust_logos SET deleted_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL`,
    [id, deletedBy],
  );
  return (result.rowCount ?? 0) > 0;
};

// ── the figures ───────────────────────────────────────────────────────────

const STAT_SORT_COLUMNS: Readonly<Record<string, string>> = {
  value: 'ts.value',
  label: 'ts.label',
  displayOrder: 'ts.display_order',
  status: 'ts.status',
  createdAt: 'ts.created_at',
  updatedAt: 'ts.updated_at',
} as const;

const STAT_QUALIFIED_COLUMNS = `
  ts.id, ts.value, ts.label, ts.icon_url, ts.icon_file_id, ts.is_featured,
  ts.display_order, ts.status,
  ts.created_by, ts.updated_by, ts.created_at, ts.updated_at
`;

const STAT_RETURNING_COLUMNS = `
  id, value, label, icon_url, icon_file_id, is_featured,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface StatRow {
  id: string;
  value: string;
  label: string;
  icon_url: string | null;
  icon_file_id: string | null;
  is_featured: boolean;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toStat = (row: StatRow): BakeryTrustStat => ({
  id: row.id,
  value: row.value,
  label: row.label,
  iconUrl: row.icon_url,
  iconFileId: row.icon_file_id,
  isFeatured: row.is_featured,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findStatById = async (
  id: string,
  executor?: Executor,
): Promise<BakeryTrustStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_QUALIFIED_COLUMNS} FROM bakery_trust_stats ts WHERE ts.id = $1 AND ts.deleted_at IS NULL`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const findStatByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BakeryTrustStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_QUALIFIED_COLUMNS} FROM bakery_trust_stats ts WHERE ts.id = $1 AND ts.deleted_at IS NULL FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const findAllStats = async (
  filters: BakeryTrustStatFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BakeryTrustStat>> => {
  const builder = new SqlBuilder();
  // Soft-deleted rows are gone from every admin list and search.
  builder.raw('ts.deleted_at IS NULL');
  builder.whereIf(filters.status, { column: 'ts.status', operator: '=', value: filters.status });
  if (pagination.search) {
    builder.raw(
      '(ts.value ILIKE ? OR ts.label ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, STAT_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<StatRow & { total_count: number }>(
    executor,
    `SELECT ${STAT_QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM bakery_trust_stats ts
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, ts.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toStat),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedStats = async (executor?: Executor): Promise<BakeryTrustStat[]> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_QUALIFIED_COLUMNS} FROM bakery_trust_stats ts
      WHERE ts.status = 'ACTIVE' AND ts.deleted_at IS NULL
     ORDER BY ts.display_order ASC, ts.created_at ASC`,
    [],
  );
  return result.rows.map(toStat);
};

export const countStats = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM bakery_trust_stats WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextStatOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM bakery_trust_stats WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createStat = async (
  input: CreateBakeryTrustStatInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BakeryTrustStat> => {
  const result = await runQuery<StatRow>(
    executor,
    `INSERT INTO bakery_trust_stats
       (value, label, icon_url, icon_file_id, is_featured,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING ${STAT_RETURNING_COLUMNS}`,
    [
      input.value,
      input.label,
      input.iconUrl,
      input.iconFileId,
      input.isFeatured,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toStat(result.rows[0]);
};

export const updateStat = async (
  id: string,
  patch: UpdateBakeryTrustStatInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BakeryTrustStat | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (patch.value !== undefined) assign('value', patch.value);
  if (patch.label !== undefined) assign('label', patch.label);
  if (patch.isFeatured !== undefined) assign('is_featured', patch.isFeatured);
  if (patch.displayOrder !== undefined) assign('display_order', patch.displayOrder);
  if (patch.status !== undefined) assign('status', patch.status);
  assignImagePair(assign, 'icon_url', 'icon_file_id', patch.iconUrl, patch.iconFileId);

  if (assignments.length === 0) return findStatById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<StatRow>(
    executor,
    `UPDATE bakery_trust_stats SET ${assignments.join(', ')}
      WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING ${STAT_RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const applyStatOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE bakery_trust_stats AS ts
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE ts.id = ordered.id AND ts.deleted_at IS NULL`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingStatIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM bakery_trust_stats WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/**
 * Soft delete: stamps deleted_at rather than removing the row, so the record
 * stays in the table for audit and recovery. Every read above ignores it.
 */
export const removeStat = async (
  id: string,
  deletedBy: string | null,
  executor?: Executor,
): Promise<boolean> => {
  const result = await runQuery(
    executor,
    `UPDATE bakery_trust_stats SET deleted_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL`,
    [id, deletedBy],
  );
  return (result.rowCount ?? 0) > 0;
};
