// src/modules/product-pages/pos-page/repositories/growth-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreatePosGrowthFeatureInput,
  CreatePosGrowthTierInput,
  PosGrowthFeature,
  PosGrowthSection,
  PosGrowthTier,
  PosGrowthTierFilters,
  UpdatePosGrowthFeatureInput,
  UpdatePosGrowthTierInput,
} from '../types/growth-section.types';

/**
 * Three tables: the reassurance line, the tier cards, and their ticks. The
 * ticks are read in bulk by tier id rather than one query per card, so
 * assembling the whole section is two round trips.
 */

// -- the reassurance line ---------------------------------------------------

const SECTION_COLUMNS = `
  id, footnote, created_by, updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  footnote: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): PosGrowthSection => ({
  id: row.id,
  footnote: row.footnote,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null before the line has ever been set - a normal first-run state. */
export const findSection = async (
  executor?: Executor,
): Promise<PosGrowthSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${SECTION_COLUMNS} FROM pos_growth_section LIMIT 1`,
    [],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Creates the record on the first save and replaces it on every later one.
 *
 * The conflict is on `singleton`, which is unique and always TRUE, so two
 * administrators saving at once end with one row rather than two.
 */
export const upsertSection = async (
  footnote: string | null,
  adminId: string | null,
  executor?: Executor,
): Promise<PosGrowthSection> => {
  const result = await runQuery<SectionRow>(
    executor,
    `INSERT INTO pos_growth_section (singleton, footnote, created_by, updated_by)
     VALUES (TRUE, $1, $2, $2)
     ON CONFLICT (singleton) DO UPDATE
        SET footnote   = EXCLUDED.footnote,
            updated_by = EXCLUDED.updated_by
     RETURNING ${SECTION_COLUMNS}`,
    [footnote, adminId],
  );
  return toSection(result.rows[0]);
};

// -- the tier cards ---------------------------------------------------------

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  name: 't.name',
  slug: 't.slug',
  displayOrder: 't.display_order',
  status: 't.status',
  createdAt: 't.created_at',
  updatedAt: 't.updated_at',
} as const;

/** Columns an update may touch directly; updated_by comes from the context. */
const TIER_UPDATABLE: Readonly<Record<string, string>> = {
  name: 'name',
  slug: 'slug',
  lead: 'lead',
  tagline: 'tagline',
  scope: 'scope',
  inheritsLabel: 'inherits_label',
  buttonLabel: 'button_label',
  buttonHref: 'button_href',
  isPopular: 'is_popular',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const TIER_COLUMNS = `
  t.id, t.name, t.slug, t.lead, t.tagline, t.scope, t.inherits_label,
  t.button_label, t.button_href, t.is_popular,
  t.display_order, t.status,
  t.created_by, t.updated_by, t.created_at, t.updated_at
`;

const TIER_RETURNING = `
  id, name, slug, lead, tagline, scope, inherits_label,
  button_label, button_href, is_popular,
  display_order, status, created_by, updated_by, created_at, updated_at
`;

interface TierRow {
  id: string;
  name: string;
  slug: string;
  lead: string;
  tagline: string;
  scope: string;
  inherits_label: string | null;
  button_label: string;
  button_href: string;
  is_popular: boolean;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toTier = (row: TierRow): PosGrowthTier => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  lead: row.lead,
  tagline: row.tagline,
  scope: row.scope,
  inheritsLabel: row.inherits_label,
  buttonLabel: row.button_label,
  buttonHref: row.button_href,
  isPopular: row.is_popular,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findTierById = async (
  id: string,
  executor?: Executor,
): Promise<PosGrowthTier | null> => {
  const result = await runQuery<TierRow>(
    executor,
    `SELECT ${TIER_COLUMNS} FROM pos_growth_tiers t WHERE t.id = $1`,
    [id],
  );
  return result.rows[0] ? toTier(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findTierByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<PosGrowthTier | null> => {
  const result = await runQuery<TierRow>(
    executor,
    `SELECT ${TIER_COLUMNS} FROM pos_growth_tiers t WHERE t.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toTier(result.rows[0]) : null;
};

/** Lets the service report a duplicate slug as a field error, not a 409. */
export const findTierBySlug = async (
  slug: string,
  executor?: Executor,
): Promise<PosGrowthTier | null> => {
  const result = await runQuery<TierRow>(
    executor,
    `SELECT ${TIER_COLUMNS} FROM pos_growth_tiers t WHERE t.slug = $1`,
    [slug],
  );
  return result.rows[0] ? toTier(result.rows[0]) : null;
};

/** The highlighted tier, if there is one. At most one row can be popular. */
export const findPopularTier = async (
  executor?: Executor,
): Promise<PosGrowthTier | null> => {
  const result = await runQuery<TierRow>(
    executor,
    `SELECT ${TIER_COLUMNS} FROM pos_growth_tiers t WHERE t.is_popular = TRUE LIMIT 1`,
    [],
  );
  return result.rows[0] ? toTier(result.rows[0]) : null;
};

export const findAllTiers = async (
  filters: PosGrowthTierFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<PosGrowthTier>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 't.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(t.name ILIKE ? OR t.slug ILIKE ? OR t.tagline ILIKE ? OR t.scope ILIKE ?)',
      ...Array.from({ length: 4 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the row.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${TIER_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM pos_growth_tiers t
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, t.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<TierRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toTier),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/**
 * created_at is the tiebreaker rather than id, so two rows sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
export const findPublishedTiers = async (
  executor?: Executor,
): Promise<PosGrowthTier[]> => {
  const result = await runQuery<TierRow>(
    executor,
    `SELECT ${TIER_COLUMNS} FROM pos_growth_tiers t
      WHERE t.status = 'ACTIVE'
      ORDER BY t.display_order ASC, t.created_at ASC`,
    [],
  );
  return result.rows.map(toTier);
};

export const countTiers = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM pos_growth_tiers',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextTierOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM pos_growth_tiers',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createTier = async (
  input: CreatePosGrowthTierInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<PosGrowthTier> => {
  const result = await runQuery<TierRow>(
    executor,
    `INSERT INTO pos_growth_tiers
       (name, slug, lead, tagline, scope, inherits_label,
        button_label, button_href, is_popular,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
     RETURNING ${TIER_RETURNING}`,
    [
      input.name,
      input.slug,
      input.lead,
      input.tagline,
      input.scope,
      input.inheritsLabel,
      input.buttonLabel,
      input.buttonHref,
      input.isPopular,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toTier(result.rows[0]);
};

export const updateTier = async (
  id: string,
  patch: UpdatePosGrowthTierInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<PosGrowthTier | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(TIER_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  if (assignments.length === 0) return findTierById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<TierRow>(
    executor,
    `UPDATE pos_growth_tiers SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${TIER_RETURNING}`,
    values,
  );
  return result.rows[0] ? toTier(result.rows[0]) : null;
};

export const updateTierStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<PosGrowthTier | null> => {
  const result = await runQuery<TierRow>(
    executor,
    `UPDATE pos_growth_tiers SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${TIER_RETURNING}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toTier(result.rows[0]) : null;
};

export const applyTierOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE pos_growth_tiers AS t
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE t.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingTierIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM pos_growth_tiers WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** The ticks go with it - pos_growth_features cascades on delete. */
export const removeTier = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM pos_growth_tiers WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// -- the ticks --------------------------------------------------------------

const FEATURE_UPDATABLE: Readonly<Record<string, string>> = {
  label: 'label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const FEATURE_COLUMNS = `
  f.id, f.tier_id, f.label, f.display_order, f.status,
  f.created_by, f.updated_by, f.created_at, f.updated_at
`;

const FEATURE_RETURNING = `
  id, tier_id, label, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface FeatureRow {
  id: string;
  tier_id: string;
  label: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toFeature = (row: FeatureRow): PosGrowthFeature => ({
  id: row.id,
  tierId: row.tier_id,
  label: row.label,
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
): Promise<PosGrowthFeature | null> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM pos_growth_features f WHERE f.id = $1`,
    [id],
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

export const findFeatureByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<PosGrowthFeature | null> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM pos_growth_features f WHERE f.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

/** One tier's ticks, every status, in order. */
export const findFeaturesByTier = async (
  tierId: string,
  executor?: Executor,
): Promise<PosGrowthFeature[]> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM pos_growth_features f
      WHERE f.tier_id = $1
      ORDER BY f.display_order ASC, f.created_at ASC`,
    [tierId],
  );
  return result.rows.map(toFeature);
};

/**
 * Every active tick for the given tiers, in one query.
 *
 * Assembling the section otherwise means a query per card - three round trips
 * for one row of content that renders together.
 */
export const findActiveFeaturesForTiers = async (
  tierIds: string[],
  executor?: Executor,
): Promise<PosGrowthFeature[]> => {
  if (tierIds.length === 0) return [];
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM pos_growth_features f
      WHERE f.tier_id = ANY($1::uuid[]) AND f.status = 'ACTIVE'
      ORDER BY f.display_order ASC, f.created_at ASC`,
    [tierIds],
  );
  return result.rows.map(toFeature);
};

export const countFeatures = async (
  tierId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM pos_growth_features WHERE tier_id = $1',
    [tierId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextFeatureOrder = async (
  tierId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
       FROM pos_growth_features WHERE tier_id = $1`,
    [tierId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createFeature = async (
  tierId: string,
  input: CreatePosGrowthFeatureInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<PosGrowthFeature> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `INSERT INTO pos_growth_features
       (tier_id, label, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${FEATURE_RETURNING}`,
    [tierId, input.label, input.displayOrder, input.status, createdBy],
  );
  return toFeature(result.rows[0]);
};

export const updateFeature = async (
  id: string,
  patch: UpdatePosGrowthFeatureInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<PosGrowthFeature | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
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
    `UPDATE pos_growth_features SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${FEATURE_RETURNING}`,
    values,
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

export const applyFeatureOrder = async (
  tierId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE pos_growth_features AS f
        SET display_order = ordered.position, updated_by = $3
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE f.id = ordered.id AND f.tier_id = $2`,
    [orderedIds, tierId, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const removeFeature = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM pos_growth_features WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
