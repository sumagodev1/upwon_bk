// src/modules/product-pages/sfa-dms-page/repositories/proof-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateSfaProofLogoInput,
  CreateSfaProofStatInput,
  SfaProofLogo,
  SfaProofLogoFilters,
  SfaProofPanel,
  SfaProofStat,
  SfaProofStatFilters,
  UpdateSfaProofLogoInput,
  UpdateSfaProofStatInput,
  UpsertSfaProofPanelInput,
} from '../types/proof-section.types';

/**
 * Three tables behind one section: the card, its logos and the numbers.
 *
 * Grouped in one file rather than three because they are read together - the
 * published section is a single query fan-out - and none of them is big enough
 * to be worth opening on its own.
 */

// ── the left card ─────────────────────────────────────────────────────────

const PANEL_COLUMNS = `
  id, heading, body_text, link_label, link_href, logos_label,
  created_by, updated_by, created_at, updated_at
`;

interface PanelRow {
  id: string;
  heading: string;
  body_text: string;
  link_label: string | null;
  link_href: string | null;
  logos_label: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toPanel = (row: PanelRow): SfaProofPanel => ({
  id: row.id,
  heading: row.heading,
  bodyText: row.body_text,
  linkLabel: row.link_label,
  linkHref: row.link_href,
  logosLabel: row.logos_label,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findPanel = async (executor?: Executor): Promise<SfaProofPanel | null> => {
  const result = await runQuery<PanelRow>(
    executor,
    `SELECT ${PANEL_COLUMNS} FROM sfa_proof_panel LIMIT 1`,
    [],
  );
  return result.rows[0] ? toPanel(result.rows[0]) : null;
};

/**
 * Creates the card or replaces it.
 *
 * ON CONFLICT on `singleton`, which can only ever be TRUE - so the first save
 * creates the row and every later save replaces it, and an administrator never
 * has to create the record before editing it.
 */
export const upsertPanel = async (
  input: UpsertSfaProofPanelInput,
  adminId: string | null,
  executor?: Executor,
): Promise<SfaProofPanel> => {
  const result = await runQuery<PanelRow>(
    executor,
    `INSERT INTO sfa_proof_panel
       (singleton, heading, body_text, link_label, link_href, logos_label,
        created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (singleton) DO UPDATE
        SET heading = EXCLUDED.heading,
            body_text = EXCLUDED.body_text,
            link_label = EXCLUDED.link_label,
            link_href = EXCLUDED.link_href,
            logos_label = EXCLUDED.logos_label,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${PANEL_COLUMNS}`,
    [
      input.heading,
      input.bodyText,
      input.linkLabel,
      input.linkHref,
      input.logosLabel,
      adminId,
    ],
  );
  return toPanel(result.rows[0]);
};

// ── the customer logos ────────────────────────────────────────────────────

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

const toLogo = (row: LogoRow): SfaProofLogo => ({
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
): Promise<SfaProofLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM sfa_proof_logos l WHERE l.id = $1`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findLogoByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<SfaProofLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM sfa_proof_logos l WHERE l.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findAllLogos = async (
  filters: SfaProofLogoFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<SfaProofLogo>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'l.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw('l.alt ILIKE ?', `%${pagination.search}%`);
  }

  // Display order is the default: the admin list should read like the marquee.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, LOGO_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${LOGO_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM sfa_proof_logos l
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

export const findPublishedLogos = async (executor?: Executor): Promise<SfaProofLogo[]> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM sfa_proof_logos l
      WHERE l.status = 'ACTIVE'
      ORDER BY l.display_order ASC, l.created_at ASC`,
    [],
  );
  return result.rows.map(toLogo);
};

export const countLogos = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM sfa_proof_logos',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextLogoOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM sfa_proof_logos',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createLogo = async (
  input: CreateSfaProofLogoInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<SfaProofLogo> => {
  const result = await runQuery<LogoRow>(
    executor,
    `INSERT INTO sfa_proof_logos
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
  patch: UpdateSfaProofLogoInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<SfaProofLogo | null> => {
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
    `UPDATE sfa_proof_logos SET ${assignments.join(', ')}
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
    `UPDATE sfa_proof_logos AS l
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
    'SELECT id FROM sfa_proof_logos WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeLogo = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM sfa_proof_logos WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── the numbers ───────────────────────────────────────────────────────────

const STAT_SORT_COLUMNS: Readonly<Record<string, string>> = {
  value: 's.value',
  label: 's.label',
  displayOrder: 's.display_order',
  status: 's.status',
  createdAt: 's.created_at',
  updatedAt: 's.updated_at',
} as const;

const STAT_UPDATABLE: Readonly<Record<string, string>> = {
  value: 'value',
  label: 'label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const STAT_COLUMNS = `
  s.id, s.value, s.label, s.display_order, s.status,
  s.created_by, s.updated_by, s.created_at, s.updated_at
`;

const STAT_RETURNING = `
  id, value, label, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface StatRow {
  id: string;
  value: string;
  label: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toStat = (row: StatRow): SfaProofStat => ({
  id: row.id,
  value: row.value,
  label: row.label,
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
): Promise<SfaProofStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM sfa_proof_stats s WHERE s.id = $1`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const findStatByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<SfaProofStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM sfa_proof_stats s WHERE s.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const findAllStats = async (
  filters: SfaProofStatFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<SfaProofStat>> => {
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
      FROM sfa_proof_stats s
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

export const findPublishedStats = async (executor?: Executor): Promise<SfaProofStat[]> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM sfa_proof_stats s
      WHERE s.status = 'ACTIVE'
      ORDER BY s.display_order ASC, s.created_at ASC`,
    [],
  );
  return result.rows.map(toStat);
};

export const countStats = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM sfa_proof_stats',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextStatOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM sfa_proof_stats',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createStat = async (
  input: CreateSfaProofStatInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<SfaProofStat> => {
  const result = await runQuery<StatRow>(
    executor,
    `INSERT INTO sfa_proof_stats
       (value, label, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${STAT_RETURNING}`,
    [input.value, input.label, input.displayOrder, input.status, createdBy],
  );
  return toStat(result.rows[0]);
};

export const updateStat = async (
  id: string,
  patch: UpdateSfaProofStatInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<SfaProofStat | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(STAT_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findStatById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<StatRow>(
    executor,
    `UPDATE sfa_proof_stats SET ${assignments.join(', ')}
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
    `UPDATE sfa_proof_stats AS s
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
    'SELECT id FROM sfa_proof_stats WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeStat = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM sfa_proof_stats WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
