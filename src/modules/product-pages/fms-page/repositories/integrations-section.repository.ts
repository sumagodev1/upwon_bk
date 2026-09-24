// src/modules/product-pages/fms-page/repositories/integrations-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateFmsIntegrationLogoInput,
  FmsIntegrationLogo,
  FmsIntegrationLogoFilters,
  FmsIntegrationSection,
  UpdateFmsIntegrationLogoInput,
} from '../types/integrations-section.types';

/**
 * Two tables: the one record holding the centre mark, and the orbit logos.
 */

// -- the centre mark --------------------------------------------------------

const SECTION_COLUMNS = `
  id, centre_logo_url, centre_logo_file_id,
  created_by, updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  centre_logo_url: string | null;
  centre_logo_file_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): FmsIntegrationSection => ({
  id: row.id,
  centreLogoUrl: row.centre_logo_url,
  centreLogoFileId: row.centre_logo_file_id,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null before the centre mark has ever been set - a normal first-run state. */
export const findSection = async (
  executor?: Executor,
): Promise<FmsIntegrationSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${SECTION_COLUMNS} FROM fms_integration_section LIMIT 1`,
    [],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Creates the record on the first save and replaces it on every later one.
 *
 * The conflict is on `singleton`, which is unique and always TRUE, so two
 * administrators saving at once end with one row rather than two.
 *
 * COALESCE is deliberate on neither column: the two are mutually exclusive and
 * the service resolves which one to write before calling in, so an absent
 * value here genuinely means "clear it".
 */
export const upsertSection = async (
  input: { centreLogoUrl: string | null; centreLogoFileId: string | null },
  adminId: string | null,
  executor?: Executor,
): Promise<FmsIntegrationSection> => {
  const result = await runQuery<SectionRow>(
    executor,
    `INSERT INTO fms_integration_section
       (singleton, centre_logo_url, centre_logo_file_id, created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $3)
     ON CONFLICT (singleton) DO UPDATE
        SET centre_logo_url     = EXCLUDED.centre_logo_url,
            centre_logo_file_id = EXCLUDED.centre_logo_file_id,
            updated_by          = EXCLUDED.updated_by
     RETURNING ${SECTION_COLUMNS}`,
    [input.centreLogoUrl, input.centreLogoFileId, adminId],
  );
  return toSection(result.rows[0]);
};

// -- the orbit logos --------------------------------------------------------

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  logoAlt: 'l.logo_alt',
  displayOrder: 'l.display_order',
  status: 'l.status',
  createdAt: 'l.created_at',
  updatedAt: 'l.updated_at',
} as const;

const LOGO_COLUMNS = `
  l.id, l.logo_url, l.logo_file_id, l.logo_alt,
  l.display_order, l.status,
  l.created_by, l.updated_by, l.created_at, l.updated_at
`;

const LOGO_RETURNING = `
  id, logo_url, logo_file_id, logo_alt,
  display_order, status, created_by, updated_by, created_at, updated_at
`;

interface LogoRow {
  id: string;
  logo_url: string | null;
  logo_file_id: string | null;
  logo_alt: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toLogo = (row: LogoRow): FmsIntegrationLogo => ({
  id: row.id,
  logoUrl: row.logo_url,
  logoFileId: row.logo_file_id,
  logoAlt: row.logo_alt,
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
): Promise<FmsIntegrationLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM fms_integration_logos l WHERE l.id = $1`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findLogoByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<FmsIntegrationLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM fms_integration_logos l WHERE l.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findAllLogos = async (
  filters: FmsIntegrationLogoFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<FmsIntegrationLogo>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'l.status',
    operator: '=',
    value: filters.status,
  });
  // The brand name is the only text a row carries, so it is what search means.
  if (pagination.search) {
    builder.raw('l.logo_alt ILIKE ?', `%${pagination.search}%`);
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${LOGO_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM fms_integration_logos l
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

/**
 * created_at is the tiebreaker rather than id, so two rows sharing a
 * display_order keep a stable, authoring-order position on the sphere.
 */
export const findPublishedLogos = async (
  executor?: Executor,
): Promise<FmsIntegrationLogo[]> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM fms_integration_logos l
      WHERE l.status = 'ACTIVE'
      ORDER BY l.display_order ASC, l.created_at ASC`,
    [],
  );
  return result.rows.map(toLogo);
};

export const countLogos = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM fms_integration_logos',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextLogoOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM fms_integration_logos',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createLogo = async (
  input: CreateFmsIntegrationLogoInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<FmsIntegrationLogo> => {
  const result = await runQuery<LogoRow>(
    executor,
    `INSERT INTO fms_integration_logos
       (logo_url, logo_file_id, logo_alt, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${LOGO_RETURNING}`,
    [
      input.logoUrl,
      input.logoFileId,
      input.logoAlt,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toLogo(result.rows[0]);
};

/**
 * Setting one logo source clears the other.
 *
 * Without this, uploading a replacement for a row that currently holds a URL
 * would leave both columns populated and trip the table's exclusivity check -
 * so the edit that looks obvious in the form would fail on save.
 */
export const updateLogo = async (
  id: string,
  patch: UpdateFmsIntegrationLogoInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<FmsIntegrationLogo | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (patch.logoUrl !== undefined) {
    assign('logo_url', patch.logoUrl);
    if (patch.logoUrl !== null && patch.logoFileId === undefined) {
      assign('logo_file_id', null);
    }
  }
  if (patch.logoFileId !== undefined) {
    assign('logo_file_id', patch.logoFileId);
    if (patch.logoFileId !== null && patch.logoUrl === undefined) {
      assign('logo_url', null);
    }
  }
  if (patch.logoAlt !== undefined) assign('logo_alt', patch.logoAlt);
  if (patch.displayOrder !== undefined) assign('display_order', patch.displayOrder);
  if (patch.status !== undefined) assign('status', patch.status);

  if (assignments.length === 0) return findLogoById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<LogoRow>(
    executor,
    `UPDATE fms_integration_logos SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${LOGO_RETURNING}`,
    values,
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const updateLogoStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<FmsIntegrationLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `UPDATE fms_integration_logos SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${LOGO_RETURNING}`,
    [id, status, updatedBy],
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
    `UPDATE fms_integration_logos AS l
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
    'SELECT id FROM fms_integration_logos WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeLogo = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM fms_integration_logos WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
