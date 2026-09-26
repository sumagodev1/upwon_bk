// src/modules/product-pages/pos-page/repositories/security-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { PosIconName } from '../utils/icons';
import {
  CreatePosSecurityAssuranceInput,
  CreatePosSecurityBadgeInput,
  CreatePosSecurityLogoInput,
  PosSecurityAssurance,
  PosSecurityBadge,
  PosSecurityListFilters,
  PosSecurityLogo,
  PosSecuritySection,
  UpdatePosSecurityAssuranceInput,
  UpdatePosSecurityBadgeInput,
  UpdatePosSecurityLogoInput,
  UpsertPosSecuritySectionInput,
} from '../types/security-section.types';

/**
 * Four tables behind one band: the furniture, the badges, the sphere's marks
 * and the assurances.
 *
 * Grouped in one file because they are read together - the published section
 * is a single query fan-out - and none of them is big enough to open alone.
 */

// ── the fixed furniture ───────────────────────────────────────────────────

const SECTION_COLUMNS = `
  id, panel_one_label, panel_two_label,
  shield_image_url, shield_image_file_id, sphere_footnote,
  data_icon, data_heading, data_body,
  data_left_image_url, data_left_image_file_id,
  data_right_image_url, data_right_image_file_id,
  created_by, updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  panel_one_label: string;
  panel_two_label: string;
  shield_image_url: string | null;
  shield_image_file_id: string | null;
  sphere_footnote: string | null;
  data_icon: string;
  data_heading: string;
  data_body: string;
  data_left_image_url: string | null;
  data_left_image_file_id: string | null;
  data_right_image_url: string | null;
  data_right_image_file_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): PosSecuritySection => ({
  id: row.id,
  panelOneLabel: row.panel_one_label,
  panelTwoLabel: row.panel_two_label,
  shieldImageUrl: row.shield_image_url,
  shieldImageFileId: row.shield_image_file_id,
  sphereFootnote: row.sphere_footnote,
  dataIcon: row.data_icon as PosIconName,
  dataHeading: row.data_heading,
  dataBody: row.data_body,
  dataLeftImageUrl: row.data_left_image_url,
  dataLeftImageFileId: row.data_left_image_file_id,
  dataRightImageUrl: row.data_right_image_url,
  dataRightImageFileId: row.data_right_image_file_id,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findSection = async (executor?: Executor): Promise<PosSecuritySection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${SECTION_COLUMNS} FROM pos_security_section WHERE singleton = TRUE`,
    [],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Creates the row on the first save and replaces it on every later one.
 *
 * ON CONFLICT (singleton) is what makes this a singleton: the unique column
 * can only ever hold TRUE, so there is exactly one row to conflict with.
 */
export const upsertSection = async (
  input: UpsertPosSecuritySectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<PosSecuritySection> => {
  const result = await runQuery<SectionRow>(
    executor,
    `INSERT INTO pos_security_section
       (singleton, panel_one_label, panel_two_label,
        shield_image_url, shield_image_file_id, sphere_footnote,
        data_icon, data_heading, data_body,
        data_left_image_url, data_left_image_file_id,
        data_right_image_url, data_right_image_file_id,
        created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
     ON CONFLICT (singleton) DO UPDATE SET
       panel_one_label = EXCLUDED.panel_one_label,
       panel_two_label = EXCLUDED.panel_two_label,
       shield_image_url = EXCLUDED.shield_image_url,
       shield_image_file_id = EXCLUDED.shield_image_file_id,
       sphere_footnote = EXCLUDED.sphere_footnote,
       data_icon = EXCLUDED.data_icon,
       data_heading = EXCLUDED.data_heading,
       data_body = EXCLUDED.data_body,
       data_left_image_url = EXCLUDED.data_left_image_url,
       data_left_image_file_id = EXCLUDED.data_left_image_file_id,
       data_right_image_url = EXCLUDED.data_right_image_url,
       data_right_image_file_id = EXCLUDED.data_right_image_file_id,
       updated_by = EXCLUDED.updated_by
     RETURNING ${SECTION_COLUMNS}`,
    [
      input.panelOneLabel,
      input.panelTwoLabel,
      input.shieldImageUrl,
      input.shieldImageFileId,
      input.sphereFootnote,
      input.dataIcon,
      input.dataHeading,
      input.dataBody,
      input.dataLeftImageUrl,
      input.dataLeftImageFileId,
      input.dataRightImageUrl,
      input.dataRightImageFileId,
      updatedBy,
    ],
  );
  return toSection(result.rows[0]);
};

// ── the compliance badges ─────────────────────────────────────────────────

const BADGE_SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'b.title',
  displayOrder: 'b.display_order',
  status: 'b.status',
  createdAt: 'b.created_at',
  updatedAt: 'b.updated_at',
} as const;

const BADGE_UPDATABLE: Readonly<Record<string, string>> = {
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

const toBadge = (row: BadgeRow): PosSecurityBadge => ({
  id: row.id,
  icon: row.icon as PosIconName,
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
): Promise<PosSecurityBadge | null> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `SELECT ${BADGE_COLUMNS} FROM pos_security_badges b WHERE b.id = $1`,
    [id],
  );
  return result.rows[0] ? toBadge(result.rows[0]) : null;
};

export const findBadgeByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<PosSecurityBadge | null> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `SELECT ${BADGE_COLUMNS} FROM pos_security_badges b WHERE b.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toBadge(result.rows[0]) : null;
};

export const findAllBadges = async (
  filters: PosSecurityListFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<PosSecurityBadge>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, { column: 'b.status', operator: '=', value: filters.status });
  if (pagination.search) {
    builder.raw(
      '(b.title ILIKE ? OR b.subtext ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, BADGE_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<BadgeRow & { total_count: number }>(
    executor,
    `SELECT ${BADGE_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM pos_security_badges b
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, b.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toBadge),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedBadges = async (
  executor?: Executor,
): Promise<PosSecurityBadge[]> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `SELECT ${BADGE_COLUMNS} FROM pos_security_badges b
      WHERE b.status = 'ACTIVE'
      ORDER BY b.display_order ASC, b.created_at ASC`,
    [],
  );
  return result.rows.map(toBadge);
};

export const countBadges = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM pos_security_badges',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextBadgeOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM pos_security_badges',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createBadge = async (
  input: CreatePosSecurityBadgeInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<PosSecurityBadge> => {
  const result = await runQuery<BadgeRow>(
    executor,
    `INSERT INTO pos_security_badges
       (icon, title, subtext, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${BADGE_RETURNING}`,
    [input.icon, input.title, input.subtext, input.displayOrder, input.status, createdBy],
  );
  return toBadge(result.rows[0]);
};

export const updateBadge = async (
  id: string,
  patch: UpdatePosSecurityBadgeInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<PosSecurityBadge | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(BADGE_UPDATABLE)) {
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
    `UPDATE pos_security_badges SET ${assignments.join(', ')}
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
    `UPDATE pos_security_badges AS b
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
    'SELECT id FROM pos_security_badges WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeBadge = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM pos_security_badges WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── the sphere's marks ────────────────────────────────────────────────────

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

const toLogo = (row: LogoRow): PosSecurityLogo => ({
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
): Promise<PosSecurityLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM pos_security_logos l WHERE l.id = $1`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findLogoByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<PosSecurityLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM pos_security_logos l WHERE l.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findAllLogos = async (
  filters: PosSecurityListFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<PosSecurityLogo>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, { column: 'l.status', operator: '=', value: filters.status });
  if (pagination.search) {
    builder.raw('l.alt ILIKE ?', `%${pagination.search}%`);
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, LOGO_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<LogoRow & { total_count: number }>(
    executor,
    `SELECT ${LOGO_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM pos_security_logos l
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, l.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toLogo),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedLogos = async (executor?: Executor): Promise<PosSecurityLogo[]> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM pos_security_logos l
      WHERE l.status = 'ACTIVE'
      ORDER BY l.display_order ASC, l.created_at ASC`,
    [],
  );
  return result.rows.map(toLogo);
};

export const countLogos = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM pos_security_logos',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextLogoOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM pos_security_logos',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createLogo = async (
  input: CreatePosSecurityLogoInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<PosSecurityLogo> => {
  const result = await runQuery<LogoRow>(
    executor,
    `INSERT INTO pos_security_logos
       (image_url, image_file_id, alt, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${LOGO_RETURNING}`,
    [input.imageUrl, input.imageFileId, input.alt, input.displayOrder, input.status, createdBy],
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
  patch: UpdatePosSecurityLogoInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<PosSecurityLogo | null> => {
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
    `UPDATE pos_security_logos SET ${assignments.join(', ')}
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
    `UPDATE pos_security_logos AS l
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
    'SELECT id FROM pos_security_logos WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeLogo = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM pos_security_logos WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── the assurances ────────────────────────────────────────────────────────

const ASSURANCE_SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 'a.label',
  displayOrder: 'a.display_order',
  status: 'a.status',
  createdAt: 'a.created_at',
  updatedAt: 'a.updated_at',
} as const;

const ASSURANCE_UPDATABLE: Readonly<Record<string, string>> = {
  icon: 'icon',
  label: 'label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const ASSURANCE_COLUMNS = `
  a.id, a.icon, a.label, a.display_order, a.status,
  a.created_by, a.updated_by, a.created_at, a.updated_at
`;

const ASSURANCE_RETURNING = `
  id, icon, label, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface AssuranceRow {
  id: string;
  icon: string;
  label: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toAssurance = (row: AssuranceRow): PosSecurityAssurance => ({
  id: row.id,
  icon: row.icon as PosIconName,
  label: row.label,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findAssuranceById = async (
  id: string,
  executor?: Executor,
): Promise<PosSecurityAssurance | null> => {
  const result = await runQuery<AssuranceRow>(
    executor,
    `SELECT ${ASSURANCE_COLUMNS} FROM pos_security_assurances a WHERE a.id = $1`,
    [id],
  );
  return result.rows[0] ? toAssurance(result.rows[0]) : null;
};

export const findAssuranceByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<PosSecurityAssurance | null> => {
  const result = await runQuery<AssuranceRow>(
    executor,
    `SELECT ${ASSURANCE_COLUMNS} FROM pos_security_assurances a WHERE a.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toAssurance(result.rows[0]) : null;
};

export const findAllAssurances = async (
  filters: PosSecurityListFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<PosSecurityAssurance>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, { column: 'a.status', operator: '=', value: filters.status });
  if (pagination.search) {
    builder.raw('a.label ILIKE ?', `%${pagination.search}%`);
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, ASSURANCE_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<AssuranceRow & { total_count: number }>(
    executor,
    `SELECT ${ASSURANCE_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM pos_security_assurances a
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, a.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toAssurance),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedAssurances = async (
  executor?: Executor,
): Promise<PosSecurityAssurance[]> => {
  const result = await runQuery<AssuranceRow>(
    executor,
    `SELECT ${ASSURANCE_COLUMNS} FROM pos_security_assurances a
      WHERE a.status = 'ACTIVE'
      ORDER BY a.display_order ASC, a.created_at ASC`,
    [],
  );
  return result.rows.map(toAssurance);
};

export const countAssurances = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM pos_security_assurances',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextAssuranceOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM pos_security_assurances',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createAssurance = async (
  input: CreatePosSecurityAssuranceInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<PosSecurityAssurance> => {
  const result = await runQuery<AssuranceRow>(
    executor,
    `INSERT INTO pos_security_assurances
       (icon, label, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${ASSURANCE_RETURNING}`,
    [input.icon, input.label, input.displayOrder, input.status, createdBy],
  );
  return toAssurance(result.rows[0]);
};

export const updateAssurance = async (
  id: string,
  patch: UpdatePosSecurityAssuranceInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<PosSecurityAssurance | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(ASSURANCE_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findAssuranceById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<AssuranceRow>(
    executor,
    `UPDATE pos_security_assurances SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${ASSURANCE_RETURNING}`,
    values,
  );
  return result.rows[0] ? toAssurance(result.rows[0]) : null;
};

export const applyAssuranceOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE pos_security_assurances AS a
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE a.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingAssuranceIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM pos_security_assurances WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeAssurance = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM pos_security_assurances WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
