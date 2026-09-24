// src/modules/product-pages/sfa-dms-page/repositories/compliance-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { SfaIconName } from '../utils/icons';
import {
  CreateSfaComplianceBadgeInput,
  SfaComplianceBadge,
  SfaComplianceBadgeFilters,
  SfaComplianceSection,
  UpdateSfaComplianceBadgeInput,
  UpsertSfaComplianceSectionInput,
} from '../types/compliance-section.types';

/**
 * Two tables: the panel headers and the badges.
 *
 * The sphere beside them has no table here - it draws the home page's
 * integration logos, read through that module.
 */

// ── the two panel headers ─────────────────────────────────────────────────

const SECTION_COLUMNS = `
  id, compliance_label, compliance_icon,
  background_image_url, background_image_file_id,
  ecosystem_label, ecosystem_icon, ecosystem_color,
  created_by, updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  compliance_label: string;
  compliance_icon: string;
  background_image_url: string | null;
  background_image_file_id: string | null;
  ecosystem_label: string;
  ecosystem_icon: string;
  ecosystem_color: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): SfaComplianceSection => ({
  id: row.id,
  complianceLabel: row.compliance_label,
  complianceIcon: row.compliance_icon as SfaIconName,
  backgroundImageUrl: row.background_image_url,
  backgroundImageFileId: row.background_image_file_id,
  ecosystemLabel: row.ecosystem_label,
  ecosystemIcon: row.ecosystem_icon as SfaIconName,
  ecosystemColor: row.ecosystem_color,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findSection = async (
  executor?: Executor,
): Promise<SfaComplianceSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${SECTION_COLUMNS} FROM sfa_compliance_section LIMIT 1`,
    [],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Creates the panel headers or replaces them.
 *
 * ON CONFLICT on `singleton`, which can only ever be TRUE - so the first save
 * creates the row and every later save replaces it, and an administrator never
 * has to create the record before editing it.
 */
export const upsertSection = async (
  input: UpsertSfaComplianceSectionInput,
  adminId: string | null,
  executor?: Executor,
): Promise<SfaComplianceSection> => {
  const result = await runQuery<SectionRow>(
    executor,
    `INSERT INTO sfa_compliance_section
       (singleton, compliance_label, compliance_icon,
        background_image_url, background_image_file_id,
        ecosystem_label, ecosystem_icon, ecosystem_color,
        created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $8)
     ON CONFLICT (singleton) DO UPDATE
        SET compliance_label = EXCLUDED.compliance_label,
            compliance_icon = EXCLUDED.compliance_icon,
            background_image_url = EXCLUDED.background_image_url,
            background_image_file_id = EXCLUDED.background_image_file_id,
            ecosystem_label = EXCLUDED.ecosystem_label,
            ecosystem_icon = EXCLUDED.ecosystem_icon,
            ecosystem_color = EXCLUDED.ecosystem_color,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${SECTION_COLUMNS}`,
    [
      input.complianceLabel,
      input.complianceIcon,
      input.backgroundImageUrl,
      input.backgroundImageFileId,
      input.ecosystemLabel,
      input.ecosystemIcon,
      input.ecosystemColor,
      adminId,
    ],
  );
  return toSection(result.rows[0]);
};

// ── the badges ────────────────────────────────────────────────────────────

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'b.title',
  displayOrder: 'b.display_order',
  status: 'b.status',
  createdAt: 'b.created_at',
  updatedAt: 'b.updated_at',
} as const;

const UPDATABLE: Readonly<Record<string, string>> = {
  icon: 'icon',
  title: 'title',
  subtext: 'subtext',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const BADGE_COLUMNS = `
  b.id, b.icon, b.title, b.subtext, b.display_order, b.status,
  b.created_by, b.updated_by, b.created_at, b.updated_at
`;

const BADGE_RETURNING = `
  id, icon, title, subtext, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface BadgeRow {
  id: string;
  icon: string;
  title: string;
  subtext: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toBadge = (row: BadgeRow): SfaComplianceBadge => ({
  id: row.id,
  icon: row.icon as SfaIconName,
  title: row.title,
  subtext: row.subtext,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findBadgeById = async (
  id: string,
  executor?: Executor,
): Promise<SfaComplianceBadge | null> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `SELECT ${BADGE_COLUMNS} FROM sfa_compliance_badges b WHERE b.id = $1`,
    [id],
  );
  return result.rows[0] ? toBadge(result.rows[0]) : null;
};

export const findBadgeByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<SfaComplianceBadge | null> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `SELECT ${BADGE_COLUMNS} FROM sfa_compliance_badges b WHERE b.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toBadge(result.rows[0]) : null;
};

export const findAllBadges = async (
  filters: SfaComplianceBadgeFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<SfaComplianceBadge>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'b.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(b.title ILIKE ? OR b.subtext ILIKE ? OR b.icon ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the column.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${BADGE_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM sfa_compliance_badges b
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, b.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<BadgeRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toBadge),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedBadges = async (
  executor?: Executor,
): Promise<SfaComplianceBadge[]> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `SELECT ${BADGE_COLUMNS} FROM sfa_compliance_badges b
      WHERE b.status = 'ACTIVE'
      ORDER BY b.display_order ASC, b.created_at ASC`,
    [],
  );
  return result.rows.map(toBadge);
};

export const countBadges = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM sfa_compliance_badges',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextBadgeOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM sfa_compliance_badges',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createBadge = async (
  input: CreateSfaComplianceBadgeInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<SfaComplianceBadge> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `INSERT INTO sfa_compliance_badges
       (icon, title, subtext, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${BADGE_RETURNING}`,
    [input.icon, input.title, input.subtext, input.displayOrder, input.status, createdBy],
  );
  return toBadge(result.rows[0]);
};

export const updateBadge = async (
  id: string,
  patch: UpdateSfaComplianceBadgeInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<SfaComplianceBadge | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findBadgeById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<BadgeRow>(
    executor,
    `UPDATE sfa_compliance_badges SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${BADGE_RETURNING}`,
    values,
  );
  return result.rows[0] ? toBadge(result.rows[0]) : null;
};

export const applyBadgeOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE sfa_compliance_badges AS b
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE b.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingBadgeIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM sfa_compliance_badges WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeBadge = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM sfa_compliance_badges WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
