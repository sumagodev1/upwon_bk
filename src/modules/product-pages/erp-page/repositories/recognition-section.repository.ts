// src/modules/product-pages/erp-page/repositories/recognition-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { ErpIconName } from '../utils/icons';
import {
  CreateErpIndustryBenefitInput,
  CreateErpIndustryFeatureInput,
  CreateErpIndustryInput,
  ErpIndustry,
  ErpIndustryBenefit,
  ErpIndustryFeature,
  ErpIndustryFilters,
  UpdateErpIndustryBenefitInput,
  UpdateErpIndustryFeatureInput,
  UpdateErpIndustryInput,
} from '../types/recognition-section.types';

/**
 * Three tables behind one section: the industries, their features, and the
 * benefits strip. Features are read in bulk by industry id rather than one
 * query per industry, so assembling the whole section is two round trips.
 */

// ── industries ────────────────────────────────────────────────────────────

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  name: 'i.name',
  slug: 'i.slug',
  displayOrder: 'i.display_order',
  status: 'i.status',
  createdAt: 'i.created_at',
  updatedAt: 'i.updated_at',
} as const;

/**
 * Columns an update may touch directly. The two image pairs are absent because
 * each needs the "setting one clears the other" handling below, and updated_by
 * is absent because it comes from the request context.
 */
const INDUSTRY_UPDATABLE: Readonly<Record<string, string>> = {
  name: 'name',
  slug: 'slug',
  icon: 'icon',
  shortDescription: 'short_description',
  erpTitle: 'erp_title',
  erpDescription: 'erp_description',
  imageAlt: 'image_alt',
  dashboardAlt: 'dashboard_alt',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const INDUSTRY_COLUMNS = `
  i.id, i.name, i.slug, i.icon, i.short_description,
  i.erp_title, i.erp_description,
  i.image_url, i.image_file_id, i.image_alt,
  i.dashboard_url, i.dashboard_file_id, i.dashboard_alt,
  i.display_order, i.status,
  i.created_by, i.updated_by, i.created_at, i.updated_at
`;

const INDUSTRY_RETURNING = `
  id, name, slug, icon, short_description,
  erp_title, erp_description,
  image_url, image_file_id, image_alt,
  dashboard_url, dashboard_file_id, dashboard_alt,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface IndustryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
  short_description: string;
  erp_title: string;
  erp_description: string;
  image_url: string | null;
  image_file_id: string | null;
  image_alt: string | null;
  dashboard_url: string | null;
  dashboard_file_id: string | null;
  dashboard_alt: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toIndustry = (row: IndustryRow): ErpIndustry => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  icon: row.icon as ErpIconName,
  shortDescription: row.short_description,
  erpTitle: row.erp_title,
  erpDescription: row.erp_description,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  imageAlt: row.image_alt,
  dashboardUrl: row.dashboard_url,
  dashboardFileId: row.dashboard_file_id,
  dashboardAlt: row.dashboard_alt,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * created_at is the tiebreaker rather than id, so two rows sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
const PUBLISHED_ORDER = 'ORDER BY i.display_order ASC, i.created_at ASC';

export const findIndustryById = async (
  id: string,
  executor?: Executor,
): Promise<ErpIndustry | null> => {
  const result = await runQuery<IndustryRow>(
    executor,
    `SELECT ${INDUSTRY_COLUMNS} FROM erp_industries i WHERE i.id = $1`,
    [id],
  );
  return result.rows[0] ? toIndustry(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findIndustryByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ErpIndustry | null> => {
  const result = await runQuery<IndustryRow>(
    executor,
    `SELECT ${INDUSTRY_COLUMNS} FROM erp_industries i WHERE i.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toIndustry(result.rows[0]) : null;
};

/** Lets the service report a duplicate slug as a field error, not a 409. */
export const findIndustryBySlug = async (
  slug: string,
  executor?: Executor,
): Promise<ErpIndustry | null> => {
  const result = await runQuery<IndustryRow>(
    executor,
    `SELECT ${INDUSTRY_COLUMNS} FROM erp_industries i WHERE i.slug = $1`,
    [slug],
  );
  return result.rows[0] ? toIndustry(result.rows[0]) : null;
};

export const findAllIndustries = async (
  filters: ErpIndustryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ErpIndustry>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'i.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      `(i.name ILIKE ? OR i.slug ILIKE ? OR i.short_description ILIKE ?
        OR i.erp_title ILIKE ? OR i.erp_description ILIKE ?)`,
      ...Array.from({ length: 5 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the selector.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${INDUSTRY_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM erp_industries i
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, i.created_at ASC
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

export const findPublishedIndustries = async (
  executor?: Executor,
): Promise<ErpIndustry[]> => {
  const result = await runQuery<IndustryRow>(
    executor,
    `SELECT ${INDUSTRY_COLUMNS} FROM erp_industries i
      WHERE i.status = 'ACTIVE'
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toIndustry);
};

export const countIndustries = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM erp_industries',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextIndustryOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM erp_industries',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createIndustry = async (
  input: CreateErpIndustryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ErpIndustry> => {
  const result = await runQuery<IndustryRow>(
    executor,
    `INSERT INTO erp_industries
       (name, slug, icon, short_description, erp_title, erp_description,
        image_url, image_file_id, image_alt,
        dashboard_url, dashboard_file_id, dashboard_alt,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
     RETURNING ${INDUSTRY_RETURNING}`,
    [
      input.name,
      input.slug,
      input.icon,
      input.shortDescription,
      input.erpTitle,
      input.erpDescription,
      input.imageUrl,
      input.imageFileId,
      input.imageAlt,
      input.dashboardUrl,
      input.dashboardFileId,
      input.dashboardAlt,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toIndustry(result.rows[0]);
};

export const updateIndustry = async (
  id: string,
  patch: UpdateErpIndustryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpIndustry | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(INDUSTRY_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  /*
   * Each pair of image columns is mutually exclusive by CHECK, so setting one
   * has to clear the other in the same statement. Without this, patching a URL
   * onto a row that already has a file id violates the constraint instead of
   * replacing the image.
   */
  const assignExclusivePair = (
    urlColumn: string,
    fileColumn: string,
    url: string | null | undefined,
    fileId: string | null | undefined,
  ): void => {
    if (url !== undefined) {
      assign(urlColumn, url);
      if (url !== null && fileId === undefined) assign(fileColumn, null);
    }
    if (fileId !== undefined) {
      assign(fileColumn, fileId);
      if (fileId !== null && url === undefined) assign(urlColumn, null);
    }
  };

  assignExclusivePair('image_url', 'image_file_id', patch.imageUrl, patch.imageFileId);
  assignExclusivePair(
    'dashboard_url',
    'dashboard_file_id',
    patch.dashboardUrl,
    patch.dashboardFileId,
  );

  if (assignments.length === 0) return findIndustryById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<IndustryRow>(
    executor,
    `UPDATE erp_industries SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${INDUSTRY_RETURNING}`,
    values,
  );
  return result.rows[0] ? toIndustry(result.rows[0]) : null;
};

export const updateIndustryStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpIndustry | null> => {
  const result = await runQuery<IndustryRow>(
    executor,
    `UPDATE erp_industries SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${INDUSTRY_RETURNING}`,
    [id, status, updatedBy],
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
    `UPDATE erp_industries AS i
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE i.id = ordered.id`,
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
    'SELECT id FROM erp_industries WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** The child features go with it - erp_industry_features cascades on delete. */
export const removeIndustry = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM erp_industries WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── features ──────────────────────────────────────────────────────────────

const FEATURE_UPDATABLE: Readonly<Record<string, string>> = {
  title: 'title',
  description: 'description',
  icon: 'icon',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const FEATURE_COLUMNS = `
  f.id, f.industry_id, f.title, f.description, f.icon,
  f.display_order, f.status,
  f.created_by, f.updated_by, f.created_at, f.updated_at
`;

const FEATURE_RETURNING = `
  id, industry_id, title, description, icon,
  display_order, status, created_by, updated_by, created_at, updated_at
`;

interface FeatureRow {
  id: string;
  industry_id: string;
  title: string;
  description: string;
  icon: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toFeature = (row: FeatureRow): ErpIndustryFeature => ({
  id: row.id,
  industryId: row.industry_id,
  title: row.title,
  description: row.description,
  icon: row.icon as ErpIconName,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findFeatureById = async (
  id: string,
  executor?: Executor,
): Promise<ErpIndustryFeature | null> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM erp_industry_features f WHERE f.id = $1`,
    [id],
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

export const findFeatureByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ErpIndustryFeature | null> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM erp_industry_features f WHERE f.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

/** One industry's features, every status, in order. */
export const findFeaturesByIndustry = async (
  industryId: string,
  executor?: Executor,
): Promise<ErpIndustryFeature[]> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM erp_industry_features f
      WHERE f.industry_id = $1
      ORDER BY f.display_order ASC, f.created_at ASC`,
    [industryId],
  );
  return result.rows.map(toFeature);
};

/**
 * Every active feature for the given industries, in one query.
 *
 * Assembling the section otherwise means a query per industry - seven round
 * trips for a page that renders once.
 */
export const findActiveFeaturesForIndustries = async (
  industryIds: string[],
  executor?: Executor,
): Promise<ErpIndustryFeature[]> => {
  if (industryIds.length === 0) return [];
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM erp_industry_features f
      WHERE f.industry_id = ANY($1::uuid[]) AND f.status = 'ACTIVE'
      ORDER BY f.display_order ASC, f.created_at ASC`,
    [industryIds],
  );
  return result.rows.map(toFeature);
};

export const countFeatures = async (
  industryId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM erp_industry_features WHERE industry_id = $1',
    [industryId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextFeatureOrder = async (
  industryId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
       FROM erp_industry_features WHERE industry_id = $1`,
    [industryId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createFeature = async (
  industryId: string,
  input: CreateErpIndustryFeatureInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ErpIndustryFeature> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `INSERT INTO erp_industry_features
       (industry_id, title, description, icon, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING ${FEATURE_RETURNING}`,
    [
      industryId,
      input.title,
      input.description,
      input.icon,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toFeature(result.rows[0]);
};

export const updateFeature = async (
  id: string,
  patch: UpdateErpIndustryFeatureInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpIndustryFeature | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(FEATURE_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  if (assignments.length === 0) return findFeatureById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<FeatureRow>(
    executor,
    `UPDATE erp_industry_features SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${FEATURE_RETURNING}`,
    values,
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

export const applyFeatureOrder = async (
  industryId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE erp_industry_features AS f
        SET display_order = ordered.position, updated_by = $3
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE f.id = ordered.id AND f.industry_id = $2`,
    [orderedIds, industryId, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const removeFeature = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM erp_industry_features WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};

// ── benefits ──────────────────────────────────────────────────────────────

const BENEFIT_UPDATABLE: Readonly<Record<string, string>> = {
  title: 'title',
  icon: 'icon',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const BENEFIT_COLUMNS = `
  b.id, b.title, b.icon, b.display_order, b.status,
  b.created_by, b.updated_by, b.created_at, b.updated_at
`;

const BENEFIT_RETURNING = `
  id, title, icon, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface BenefitRow {
  id: string;
  title: string;
  icon: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toBenefit = (row: BenefitRow): ErpIndustryBenefit => ({
  id: row.id,
  title: row.title,
  icon: row.icon as ErpIconName,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findBenefitById = async (
  id: string,
  executor?: Executor,
): Promise<ErpIndustryBenefit | null> => {
  const result = await runQuery<BenefitRow>(
    executor,
    `SELECT ${BENEFIT_COLUMNS} FROM erp_industry_benefits b WHERE b.id = $1`,
    [id],
  );
  return result.rows[0] ? toBenefit(result.rows[0]) : null;
};

export const findBenefitByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ErpIndustryBenefit | null> => {
  const result = await runQuery<BenefitRow>(
    executor,
    `SELECT ${BENEFIT_COLUMNS} FROM erp_industry_benefits b WHERE b.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toBenefit(result.rows[0]) : null;
};

export const findAllBenefits = async (
  executor?: Executor,
): Promise<ErpIndustryBenefit[]> => {
  const result = await runQuery<BenefitRow>(
    executor,
    `SELECT ${BENEFIT_COLUMNS} FROM erp_industry_benefits b
      ORDER BY b.display_order ASC, b.created_at ASC`,
    [],
  );
  return result.rows.map(toBenefit);
};

export const findPublishedBenefits = async (
  executor?: Executor,
): Promise<ErpIndustryBenefit[]> => {
  const result = await runQuery<BenefitRow>(
    executor,
    `SELECT ${BENEFIT_COLUMNS} FROM erp_industry_benefits b
      WHERE b.status = 'ACTIVE'
      ORDER BY b.display_order ASC, b.created_at ASC`,
    [],
  );
  return result.rows.map(toBenefit);
};

export const countBenefits = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM erp_industry_benefits',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextBenefitOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM erp_industry_benefits',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createBenefit = async (
  input: CreateErpIndustryBenefitInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ErpIndustryBenefit> => {
  const result = await runQuery<BenefitRow>(
    executor,
    `INSERT INTO erp_industry_benefits
       (title, icon, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${BENEFIT_RETURNING}`,
    [input.title, input.icon, input.displayOrder, input.status, createdBy],
  );
  return toBenefit(result.rows[0]);
};

export const updateBenefit = async (
  id: string,
  patch: UpdateErpIndustryBenefitInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpIndustryBenefit | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(BENEFIT_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  if (assignments.length === 0) return findBenefitById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<BenefitRow>(
    executor,
    `UPDATE erp_industry_benefits SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${BENEFIT_RETURNING}`,
    values,
  );
  return result.rows[0] ? toBenefit(result.rows[0]) : null;
};

export const applyBenefitOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE erp_industry_benefits AS b
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE b.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingBenefitIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM erp_industry_benefits WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeBenefit = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM erp_industry_benefits WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
