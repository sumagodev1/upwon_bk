// src/modules/industry-pages/bakery-page/repositories/cta-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  BakeryCtaFeature,
  BakeryCtaFeatureFilters,
  BakeryCtaSection,
  CreateBakeryCtaFeatureInput,
  UpdateBakeryCtaFeatureInput,
  UpsertBakeryCtaSectionInput,
} from '../types/cta-section.types';

// ── the band ──────────────────────────────────────────────────────────────
//
// One row, read and replaced. The singleton column is what an upsert conflicts on.

const COLUMNS = `
  id,
  desktop_image_url, desktop_image_file_id,
  mobile_image_url, mobile_image_file_id,
  primary_label, primary_href, secondary_label, secondary_href,
  created_by, updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  desktop_image_url: string | null;
  desktop_image_file_id: string | null;
  mobile_image_url: string | null;
  mobile_image_file_id: string | null;
  primary_label: string;
  primary_href: string;
  secondary_label: string | null;
  secondary_href: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): BakeryCtaSection => ({
  id: row.id,
  desktopImageUrl: row.desktop_image_url,
  desktopImageFileId: row.desktop_image_file_id,
  mobileImageUrl: row.mobile_image_url,
  mobileImageFileId: row.mobile_image_file_id,
  primaryLabel: row.primary_label,
  primaryHref: row.primary_href,
  secondaryLabel: row.secondary_label,
  secondaryHref: row.secondary_href,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const find = async (executor?: Executor): Promise<BakeryCtaSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM bakery_cta_section LIMIT 1`,
    [],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Creates the band or replaces it.
 *
 * ON CONFLICT on `singleton`, which can only ever be TRUE - so the first save
 * creates the row and every later save replaces it, and an administrator never
 * has to create the record before editing it.
 */
export const upsert = async (
  input: UpsertBakeryCtaSectionInput,
  adminId: string | null,
  executor?: Executor,
): Promise<BakeryCtaSection> => {
  const result = await runQuery<SectionRow>(
    executor,
    `INSERT INTO bakery_cta_section
       (singleton, desktop_image_url, desktop_image_file_id,
        mobile_image_url, mobile_image_file_id,
        primary_label, primary_href, secondary_label, secondary_href,
        created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
     ON CONFLICT (singleton) DO UPDATE
        SET desktop_image_url = EXCLUDED.desktop_image_url,
            desktop_image_file_id = EXCLUDED.desktop_image_file_id,
            mobile_image_url = EXCLUDED.mobile_image_url,
            mobile_image_file_id = EXCLUDED.mobile_image_file_id,
            primary_label = EXCLUDED.primary_label,
            primary_href = EXCLUDED.primary_href,
            secondary_label = EXCLUDED.secondary_label,
            secondary_href = EXCLUDED.secondary_href,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${COLUMNS}`,
    [
      input.desktopImageUrl,
      input.desktopImageFileId,
      input.mobileImageUrl,
      input.mobileImageFileId,
      input.primaryLabel,
      input.primaryHref,
      input.secondaryLabel,
      input.secondaryHref,
      adminId,
    ],
  );
  return toSection(result.rows[0]);
};

// ── the capability marks ──────────────────────────────────────────────────
//
// One table, one row per mark - no media, so nothing to resolve.

const FEATURE_SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 'cf.label',
  displayOrder: 'cf.display_order',
  status: 'cf.status',
  createdAt: 'cf.created_at',
  updatedAt: 'cf.updated_at',
} as const;

const FEATURE_UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  icon: 'icon',
  label: 'label',
  subLabel: 'sub_label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const FEATURE_QUALIFIED_COLUMNS = `
  cf.id, cf.icon, cf.label, cf.sub_label, cf.display_order, cf.status,
  cf.created_by, cf.updated_by, cf.created_at, cf.updated_at
`;

const FEATURE_RETURNING_COLUMNS = `
  id, icon, label, sub_label, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface FeatureRow {
  id: string;
  icon: string;
  label: string;
  sub_label: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toFeature = (row: FeatureRow): BakeryCtaFeature => ({
  id: row.id,
  icon: row.icon,
  label: row.label,
  subLabel: row.sub_label,
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
): Promise<BakeryCtaFeature | null> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_QUALIFIED_COLUMNS} FROM bakery_cta_features cf WHERE cf.id = $1 AND cf.deleted_at IS NULL`,
    [id],
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findFeatureByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BakeryCtaFeature | null> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_QUALIFIED_COLUMNS} FROM bakery_cta_features cf WHERE cf.id = $1 AND cf.deleted_at IS NULL FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

export const findAllFeatures = async (
  filters: BakeryCtaFeatureFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BakeryCtaFeature>> => {
  const builder = new SqlBuilder();
  // Soft-deleted rows are gone from every admin list and search.
  builder.raw('cf.deleted_at IS NULL');
  builder.whereIf(filters.status, {
    column: 'cf.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(cf.label ILIKE ? OR cf.sub_label ILIKE ? OR cf.icon ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, FEATURE_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${FEATURE_QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM bakery_cta_features cf
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, cf.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<FeatureRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toFeature),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedFeatures = async (executor?: Executor): Promise<BakeryCtaFeature[]> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_QUALIFIED_COLUMNS} FROM bakery_cta_features cf
      WHERE cf.status = 'ACTIVE' AND cf.deleted_at IS NULL
     ORDER BY cf.display_order ASC, cf.created_at ASC`,
    [],
  );
  return result.rows.map(toFeature);
};

export const countFeatures = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM bakery_cta_features WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextFeatureOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM bakery_cta_features WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createFeature = async (
  input: CreateBakeryCtaFeatureInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BakeryCtaFeature> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `INSERT INTO bakery_cta_features
       (icon, label, sub_label, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${FEATURE_RETURNING_COLUMNS}`,
    [input.icon, input.label, input.subLabel, input.displayOrder, input.status, createdBy],
  );
  return toFeature(result.rows[0]);
};

export const updateFeature = async (
  id: string,
  patch: UpdateBakeryCtaFeatureInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BakeryCtaFeature | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(FEATURE_UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findFeatureById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<FeatureRow>(
    executor,
    `UPDATE bakery_cta_features SET ${assignments.join(', ')}
      WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING ${FEATURE_RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

export const applyFeatureOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE bakery_cta_features AS cf
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE cf.id = ordered.id AND cf.deleted_at IS NULL`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingFeatureIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM bakery_cta_features WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/**
 * Soft delete: stamps deleted_at rather than removing the row, so the record
 * stays in the table for audit and recovery. Every read above ignores it.
 */
export const removeFeature = async (
  id: string,
  deletedBy: string | null,
  executor?: Executor,
): Promise<boolean> => {
  const result = await runQuery(
    executor,
    `UPDATE bakery_cta_features SET deleted_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL`,
    [id, deletedBy],
  );
  return (result.rowCount ?? 0) > 0;
};
