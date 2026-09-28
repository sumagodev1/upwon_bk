// src/modules/industry-pages/beverage-page/repositories/trust-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  BeverageTrustLogo,
  BeverageTrustLogoFilters,
  BeverageTrustStat,
  BeverageTrustStatFilters,
  CreateBeverageTrustLogoInput,
  CreateBeverageTrustStatInput,
  UpdateBeverageTrustLogoInput,
  UpdateBeverageTrustStatInput,
} from '../types/trust-section.types';

/**
 * Two tables behind one section: the logo marquee and the stats.
 *
 * Grouped in one file rather than two because they are read together - the
 * published section is a single query fan-out - and neither is big enough to be
 * worth opening on its own.
 */

// ── the logo marquee ──────────────────────────────────────────────────────

const LOGO_SORT_COLUMNS: Readonly<Record<string, string>> = {
  alt: 'l.alt',
  displayOrder: 'l.display_order',
  status: 'l.status',
  createdAt: 'l.created_at',
  updatedAt: 'l.updated_at',
} as const;

const LOGO_UPDATABLE: Readonly<Record<string, string>> = {
  imageUrl: 'image_url',
  imageFileId: 'image_file_id',
  alt: 'alt',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const LOGO_COLUMNS = `
  l.id, l.image_url, l.image_file_id, l.alt, l.display_order, l.status,
  l.created_by, l.updated_by, l.created_at, l.updated_at
`;

const LOGO_RETURNING = `
  id, image_url, image_file_id, alt, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface LogoRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  alt: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toLogo = (row: LogoRow): BeverageTrustLogo => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  alt: row.alt,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findLogoById = async (
  id: string,
  executor?: Executor,
): Promise<BeverageTrustLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM beverage_trust_logos l WHERE l.id = $1`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findLogoByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BeverageTrustLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM beverage_trust_logos l WHERE l.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findAllLogos = async (
  filters: BeverageTrustLogoFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BeverageTrustLogo>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'l.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw('l.alt ILIKE ?', `%${pagination.search}%`);
  }

  // Display order is the default: the admin list should read like the marquee,
  // which starts from its left edge.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, LOGO_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${LOGO_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM beverage_trust_logos l
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, l.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<LogoRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toLogo),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedLogos = async (executor?: Executor): Promise<BeverageTrustLogo[]> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM beverage_trust_logos l
      WHERE l.status = 'ACTIVE'
      ORDER BY l.display_order ASC, l.created_at ASC`,
    [],
  );
  return result.rows.map(toLogo);
};

export const countLogos = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM beverage_trust_logos',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextLogoOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM beverage_trust_logos',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createLogo = async (
  input: CreateBeverageTrustLogoInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BeverageTrustLogo> => {
  const result = await runQuery<LogoRow>(
    executor,
    `INSERT INTO beverage_trust_logos
       (image_url, image_file_id, alt, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${LOGO_RETURNING}`,
    [
      input.imageUrl,
      input.imageFileId,
      input.alt,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toLogo(result.rows[0]);
};

/**
 * Setting one image source clears the other.
 *
 * Without this, swapping an uploaded mark for a hosted URL would leave both
 * columns populated and trip the table's exclusivity check - so the edit that
 * looks obvious in the form would fail on save.
 */
export const updateLogo = async (
  id: string,
  patch: UpdateBeverageTrustLogoInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BeverageTrustLogo | null> => {
  const effective: Record<string, unknown> = { ...patch };
  if (patch.imageUrl !== undefined && patch.imageUrl !== null) effective.imageFileId = null;
  if (patch.imageFileId !== undefined && patch.imageFileId !== null) effective.imageUrl = null;

  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(LOGO_UPDATABLE)) {
    const value = effective[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findLogoById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<LogoRow>(
    executor,
    `UPDATE beverage_trust_logos SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${LOGO_RETURNING}`,
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
    `UPDATE beverage_trust_logos AS l
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE l.id = ordered.id`,
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
    'SELECT id FROM beverage_trust_logos WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeLogo = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM beverage_trust_logos WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── the stats ─────────────────────────────────────────────────────────────

const STAT_SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 's.label',
  value: 's.value',
  displayOrder: 's.display_order',
  status: 's.status',
  createdAt: 's.created_at',
  updatedAt: 's.updated_at',
} as const;

/** Columns an update may touch directly. The photo pair is handled below. */
const STAT_UPDATABLE: Readonly<Record<string, string>> = {
  value: 'value',
  label: 'label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const STAT_COLUMNS = `
  s.id, s.value, s.label, s.image_url, s.image_file_id,
  s.display_order, s.status,
  s.created_by, s.updated_by, s.created_at, s.updated_at
`;

const STAT_RETURNING = `
  id, value, label, image_url, image_file_id, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface StatRow {
  id: string;
  value: string;
  label: string;
  image_url: string | null;
  image_file_id: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toStat = (row: StatRow): BeverageTrustStat => ({
  id: row.id,
  value: row.value,
  label: row.label,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findStatById = async (
  id: string,
  executor?: Executor,
): Promise<BeverageTrustStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM beverage_trust_stats s WHERE s.id = $1`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const findStatByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BeverageTrustStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM beverage_trust_stats s WHERE s.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const findAllStats = async (
  filters: BeverageTrustStatFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BeverageTrustStat>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 's.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(s.label ILIKE ? OR s.value ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, STAT_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${STAT_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM beverage_trust_stats s
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, s.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<StatRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toStat),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedStats = async (executor?: Executor): Promise<BeverageTrustStat[]> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM beverage_trust_stats s
      WHERE s.status = 'ACTIVE'
      ORDER BY s.display_order ASC, s.created_at ASC`,
    [],
  );
  return result.rows.map(toStat);
};

export const countStats = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM beverage_trust_stats',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextStatOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM beverage_trust_stats',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createStat = async (
  input: CreateBeverageTrustStatInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BeverageTrustStat> => {
  const result = await runQuery<StatRow>(
    executor,
    `INSERT INTO beverage_trust_stats
       (value, label, image_url, image_file_id, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING ${STAT_RETURNING}`,
    [
      input.value,
      input.label,
      input.imageUrl,
      input.imageFileId,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toStat(result.rows[0]);
};

/**
 * Setting one photo source clears the other, so swapping an uploaded photo
 * for a hosted URL does not trip the table's exclusivity check.
 */
export const updateStat = async (
  id: string,
  patch: UpdateBeverageTrustStatInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BeverageTrustStat | null> => {
  const effective: Record<string, unknown> = { ...patch };
  if (patch.imageUrl !== undefined && patch.imageUrl !== null) effective.imageFileId = null;
  if (patch.imageFileId !== undefined && patch.imageFileId !== null) effective.imageUrl = null;

  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(STAT_UPDATABLE)) {
    const value = effective[key];
    if (value === undefined) continue;
    assign(column, value);
  }
  if (effective.imageUrl !== undefined) assign('image_url', effective.imageUrl);
  if (effective.imageFileId !== undefined) assign('image_file_id', effective.imageFileId);

  if (assignments.length === 0) return findStatById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<StatRow>(
    executor,
    `UPDATE beverage_trust_stats SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${STAT_RETURNING}`,
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
    `UPDATE beverage_trust_stats AS s
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE s.id = ordered.id`,
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
    'SELECT id FROM beverage_trust_stats WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeStat = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM beverage_trust_stats WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
