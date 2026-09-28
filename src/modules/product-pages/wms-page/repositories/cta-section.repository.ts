// src/modules/product-pages/wms-page/repositories/cta-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { WmsIconName } from '../utils/icons';
import {
  CreateWmsCtaTrustItemInput,
  WmsCtaSection,
  WmsCtaTrustItem,
  WmsCtaTrustItemFilters,
  UpdateWmsCtaTrustItemInput,
  UpsertWmsCtaSectionInput,
} from '../types/cta-section.types';

/**
 * Two tables behind one band: its own furniture, and the reassurances under
 * the buttons.
 *
 * Grouped in one file because they are read together - the published band is
 * a single query fan-out - and neither is big enough to open alone.
 */

// ── the band ──────────────────────────────────────────────────────────────

const SECTION_COLUMNS = `
  id, image_url, image_file_id, mobile_image_url, mobile_image_file_id,
  primary_label, primary_href, primary_icon,
  secondary_label, secondary_href, secondary_icon,
  created_by, updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  mobile_image_url: string | null;
  mobile_image_file_id: string | null;
  primary_label: string;
  primary_href: string;
  primary_icon: string;
  secondary_label: string | null;
  secondary_href: string | null;
  secondary_icon: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): WmsCtaSection => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  mobileImageUrl: row.mobile_image_url,
  mobileImageFileId: row.mobile_image_file_id,
  primaryLabel: row.primary_label,
  primaryHref: row.primary_href,
  primaryIcon: row.primary_icon as WmsIconName,
  secondaryLabel: row.secondary_label,
  secondaryHref: row.secondary_href,
  secondaryIcon: row.secondary_icon as WmsIconName | null,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findSection = async (executor?: Executor): Promise<WmsCtaSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${SECTION_COLUMNS} FROM wms_cta_section WHERE singleton = TRUE`,
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
  input: UpsertWmsCtaSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WmsCtaSection> => {
  const result = await runQuery<SectionRow>(
    executor,
    `INSERT INTO wms_cta_section
       (singleton, image_url, image_file_id, mobile_image_url, mobile_image_file_id,
        primary_label, primary_href, primary_icon,
        secondary_label, secondary_href, secondary_icon,
        created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
     ON CONFLICT (singleton) DO UPDATE SET
       image_url = EXCLUDED.image_url,
       image_file_id = EXCLUDED.image_file_id,
       mobile_image_url = EXCLUDED.mobile_image_url,
       mobile_image_file_id = EXCLUDED.mobile_image_file_id,
       primary_label = EXCLUDED.primary_label,
       primary_href = EXCLUDED.primary_href,
       primary_icon = EXCLUDED.primary_icon,
       secondary_label = EXCLUDED.secondary_label,
       secondary_href = EXCLUDED.secondary_href,
       secondary_icon = EXCLUDED.secondary_icon,
       updated_by = EXCLUDED.updated_by
     RETURNING ${SECTION_COLUMNS}`,
    [
      input.imageUrl,
      input.imageFileId,
      input.mobileImageUrl,
      input.mobileImageFileId,
      input.primaryLabel,
      input.primaryHref,
      input.primaryIcon,
      input.secondaryLabel,
      input.secondaryHref,
      input.secondaryIcon,
      updatedBy,
    ],
  );
  return toSection(result.rows[0]);
};

// ── the trust strip ───────────────────────────────────────────────────────

const TRUST_SORT_COLUMNS: Readonly<Record<string, string>> = {
  lineOne: 't.line_one',
  displayOrder: 't.display_order',
  status: 't.status',
  createdAt: 't.created_at',
  updatedAt: 't.updated_at',
} as const;

const TRUST_UPDATABLE: Readonly<Record<string, string>> = {
  icon: 'icon',
  lineOne: 'line_one',
  lineTwo: 'line_two',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const TRUST_COLUMNS = `
  t.id, t.icon, t.line_one, t.line_two, t.display_order, t.status,
  t.created_by, t.updated_by, t.created_at, t.updated_at
`;

const TRUST_RETURNING = `
  id, icon, line_one, line_two, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface TrustRow {
  id: string;
  icon: string;
  line_one: string;
  line_two: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toTrustItem = (row: TrustRow): WmsCtaTrustItem => ({
  id: row.id,
  icon: row.icon as WmsIconName,
  lineOne: row.line_one,
  lineTwo: row.line_two,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findTrustItemById = async (
  id: string,
  executor?: Executor,
): Promise<WmsCtaTrustItem | null> => {
  const result = await runQuery<TrustRow>(
    executor,
    `SELECT ${TRUST_COLUMNS} FROM wms_cta_trust_items t WHERE t.id = $1`,
    [id],
  );
  return result.rows[0] ? toTrustItem(result.rows[0]) : null;
};

export const findTrustItemByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<WmsCtaTrustItem | null> => {
  const result = await runQuery<TrustRow>(
    executor,
    `SELECT ${TRUST_COLUMNS} FROM wms_cta_trust_items t WHERE t.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toTrustItem(result.rows[0]) : null;
};

export const findAllTrustItems = async (
  filters: WmsCtaTrustItemFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<WmsCtaTrustItem>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, { column: 't.status', operator: '=', value: filters.status });
  if (pagination.search) {
    builder.raw(
      '(t.line_one ILIKE ? OR t.line_two ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, TRUST_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<TrustRow & { total_count: number }>(
    executor,
    `SELECT ${TRUST_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM wms_cta_trust_items t
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, t.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toTrustItem),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedTrustItems = async (
  executor?: Executor,
): Promise<WmsCtaTrustItem[]> => {
  const result = await runQuery<TrustRow>(
    executor,
    `SELECT ${TRUST_COLUMNS} FROM wms_cta_trust_items t
      WHERE t.status = 'ACTIVE'
      ORDER BY t.display_order ASC, t.created_at ASC`,
    [],
  );
  return result.rows.map(toTrustItem);
};

export const countTrustItems = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM wms_cta_trust_items',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextTrustItemOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM wms_cta_trust_items',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createTrustItem = async (
  input: CreateWmsCtaTrustItemInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<WmsCtaTrustItem> => {
  const result = await runQuery<TrustRow>(
    executor,
    `INSERT INTO wms_cta_trust_items
       (icon, line_one, line_two, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${TRUST_RETURNING}`,
    [input.icon, input.lineOne, input.lineTwo, input.displayOrder, input.status, createdBy],
  );
  return toTrustItem(result.rows[0]);
};

export const updateTrustItem = async (
  id: string,
  patch: UpdateWmsCtaTrustItemInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WmsCtaTrustItem | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(TRUST_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findTrustItemById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<TrustRow>(
    executor,
    `UPDATE wms_cta_trust_items SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${TRUST_RETURNING}`,
    values,
  );
  return result.rows[0] ? toTrustItem(result.rows[0]) : null;
};

export const applyTrustItemOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE wms_cta_trust_items AS t
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE t.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingTrustItemIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM wms_cta_trust_items WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeTrustItem = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM wms_cta_trust_items WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
