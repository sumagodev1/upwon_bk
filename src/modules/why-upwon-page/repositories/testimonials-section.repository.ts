// src/modules/why-upwon-page/repositories/testimonials-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateWhyUpwonClientLogoInput,
  CreateWhyUpwonTestimonialInput,
  UpdateWhyUpwonClientLogoInput,
  UpdateWhyUpwonTestimonialInput,
  UpsertWhyUpwonTestimonialsPanelInput,
  WhyUpwonClientLogo,
  WhyUpwonClientLogoFilters,
  WhyUpwonTestimonial,
  WhyUpwonTestimonialFilters,
  WhyUpwonTestimonialsPanel,
} from '../types/testimonials-section.types';

/**
 * Three tables behind one section: the client wall and the testimonials
 * (lists), and the panel (one row, read and replaced).
 *
 * Grouped in one file rather than two because they are read together - the
 * published section is a single query fan-out - and neither is big enough to be
 * worth opening on its own.
 */

// ── the client wall ───────────────────────────────────────────────────────

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

const toLogo = (row: LogoRow): WhyUpwonClientLogo => ({
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
): Promise<WhyUpwonClientLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM why_upwon_client_logos l WHERE l.id = $1`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findLogoByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<WhyUpwonClientLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM why_upwon_client_logos l WHERE l.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findAllLogos = async (
  filters: WhyUpwonClientLogoFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<WhyUpwonClientLogo>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'l.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw('l.alt ILIKE ?', `%${pagination.search}%`);
  }

  // Display order is the default: the admin list should read like the wall,
  // which starts from its left edge.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, LOGO_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${LOGO_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM why_upwon_client_logos l
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

export const findPublishedLogos = async (executor?: Executor): Promise<WhyUpwonClientLogo[]> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM why_upwon_client_logos l
      WHERE l.status = 'ACTIVE'
      ORDER BY l.display_order ASC, l.created_at ASC`,
    [],
  );
  return result.rows.map(toLogo);
};

export const countLogos = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM why_upwon_client_logos',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextLogoOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM why_upwon_client_logos',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createLogo = async (
  input: CreateWhyUpwonClientLogoInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<WhyUpwonClientLogo> => {
  const result = await runQuery<LogoRow>(
    executor,
    `INSERT INTO why_upwon_client_logos
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
  patch: UpdateWhyUpwonClientLogoInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WhyUpwonClientLogo | null> => {
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
    `UPDATE why_upwon_client_logos SET ${assignments.join(', ')}
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
    `UPDATE why_upwon_client_logos AS l
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
    'SELECT id FROM why_upwon_client_logos WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeLogo = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM why_upwon_client_logos WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── the testimonials ──────────────────────────────────────────────────────

const TESTIMONIAL_SORT_COLUMNS: Readonly<Record<string, string>> = {
  brand: 't.brand',
  author: 't.author',
  displayOrder: 't.display_order',
  status: 't.status',
  createdAt: 't.created_at',
  updatedAt: 't.updated_at',
} as const;

/** Columns an update may touch directly. The logo pair is handled below. */
const TESTIMONIAL_UPDATABLE: Readonly<Record<string, string>> = {
  quote: 'quote',
  author: 'author',
  role: 'role',
  brand: 'brand',
  category: 'category',
  location: 'location',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const TESTIMONIAL_COLUMNS = `
  t.id, t.quote, t.author, t.role, t.brand, t.category, t.location,
  t.logo_url, t.logo_file_id, t.display_order, t.status,
  t.created_by, t.updated_by, t.created_at, t.updated_at
`;

const TESTIMONIAL_RETURNING = `
  id, quote, author, role, brand, category, location,
  logo_url, logo_file_id, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface TestimonialRow {
  id: string;
  quote: string;
  author: string;
  role: string;
  brand: string;
  category: string | null;
  location: string | null;
  logo_url: string | null;
  logo_file_id: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toTestimonial = (row: TestimonialRow): WhyUpwonTestimonial => ({
  id: row.id,
  quote: row.quote,
  author: row.author,
  role: row.role,
  brand: row.brand,
  category: row.category,
  location: row.location,
  logoUrl: row.logo_url,
  logoFileId: row.logo_file_id,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findTestimonialById = async (
  id: string,
  executor?: Executor,
): Promise<WhyUpwonTestimonial | null> => {
  const result = await runQuery<TestimonialRow>(
    executor,
    `SELECT ${TESTIMONIAL_COLUMNS} FROM why_upwon_testimonials t WHERE t.id = $1`,
    [id],
  );
  return result.rows[0] ? toTestimonial(result.rows[0]) : null;
};

export const findTestimonialByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<WhyUpwonTestimonial | null> => {
  const result = await runQuery<TestimonialRow>(
    executor,
    `SELECT ${TESTIMONIAL_COLUMNS} FROM why_upwon_testimonials t WHERE t.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toTestimonial(result.rows[0]) : null;
};

export const findAllTestimonials = async (
  filters: WhyUpwonTestimonialFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<WhyUpwonTestimonial>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 't.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(t.brand ILIKE ? OR t.author ILIKE ? OR t.quote ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, TESTIMONIAL_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${TESTIMONIAL_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM why_upwon_testimonials t
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, t.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<TestimonialRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toTestimonial),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedTestimonials = async (
  executor?: Executor,
): Promise<WhyUpwonTestimonial[]> => {
  const result = await runQuery<TestimonialRow>(
    executor,
    `SELECT ${TESTIMONIAL_COLUMNS} FROM why_upwon_testimonials t
      WHERE t.status = 'ACTIVE'
      ORDER BY t.display_order ASC, t.created_at ASC`,
    [],
  );
  return result.rows.map(toTestimonial);
};

export const countTestimonials = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM why_upwon_testimonials',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextTestimonialOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM why_upwon_testimonials',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createTestimonial = async (
  input: CreateWhyUpwonTestimonialInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<WhyUpwonTestimonial> => {
  const result = await runQuery<TestimonialRow>(
    executor,
    `INSERT INTO why_upwon_testimonials
       (quote, author, role, brand, category, location, logo_url, logo_file_id,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
     RETURNING ${TESTIMONIAL_RETURNING}`,
    [
      input.quote,
      input.author,
      input.role,
      input.brand,
      input.category,
      input.location,
      input.logoUrl,
      input.logoFileId,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toTestimonial(result.rows[0]);
};

/**
 * Setting one logo source clears the other, so swapping an uploaded logo for a
 * hosted URL does not trip the table's exclusivity check.
 */
export const updateTestimonial = async (
  id: string,
  patch: UpdateWhyUpwonTestimonialInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WhyUpwonTestimonial | null> => {
  const effective: Record<string, unknown> = { ...patch };
  if (patch.logoUrl !== undefined && patch.logoUrl !== null) effective.logoFileId = null;
  if (patch.logoFileId !== undefined && patch.logoFileId !== null) effective.logoUrl = null;

  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(TESTIMONIAL_UPDATABLE)) {
    const value = effective[key];
    if (value === undefined) continue;
    assign(column, value);
  }
  if (effective.logoUrl !== undefined) assign('logo_url', effective.logoUrl);
  if (effective.logoFileId !== undefined) assign('logo_file_id', effective.logoFileId);

  if (assignments.length === 0) return findTestimonialById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<TestimonialRow>(
    executor,
    `UPDATE why_upwon_testimonials SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${TESTIMONIAL_RETURNING}`,
    values,
  );
  return result.rows[0] ? toTestimonial(result.rows[0]) : null;
};

export const applyTestimonialOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE why_upwon_testimonials AS t
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE t.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingTestimonialIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM why_upwon_testimonials WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeTestimonial = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM why_upwon_testimonials WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};

// ── the panel ─────────────────────────────────────────────────────────────

const PANEL_COLUMNS = `
  id, lead_line, button_label, button_href, wall_label,
  created_by, updated_by, created_at, updated_at
`;

interface PanelRow {
  id: string;
  lead_line: string | null;
  button_label: string | null;
  button_href: string | null;
  wall_label: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toPanel = (row: PanelRow): WhyUpwonTestimonialsPanel => ({
  id: row.id,
  leadLine: row.lead_line,
  buttonLabel: row.button_label,
  buttonHref: row.button_href,
  wallLabel: row.wall_label,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findPanel = async (executor?: Executor): Promise<WhyUpwonTestimonialsPanel | null> => {
  const result = await runQuery<PanelRow>(
    executor,
    `SELECT ${PANEL_COLUMNS} FROM why_upwon_testimonials_panel LIMIT 1`,
    [],
  );
  return result.rows[0] ? toPanel(result.rows[0]) : null;
};

/**
 * Creates the panel or replaces it. ON CONFLICT on `singleton`, which can only
 * ever be TRUE - so the first save creates the row and every later save
 * replaces it.
 */
export const upsertPanel = async (
  input: UpsertWhyUpwonTestimonialsPanelInput,
  adminId: string | null,
  executor?: Executor,
): Promise<WhyUpwonTestimonialsPanel> => {
  const result = await runQuery<PanelRow>(
    executor,
    `INSERT INTO why_upwon_testimonials_panel
       (singleton, lead_line, button_label, button_href, wall_label, created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $5)
     ON CONFLICT (singleton) DO UPDATE
        SET lead_line = EXCLUDED.lead_line,
            button_label = EXCLUDED.button_label,
            button_href = EXCLUDED.button_href,
            wall_label = EXCLUDED.wall_label,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${PANEL_COLUMNS}`,
    [input.leadLine, input.buttonLabel, input.buttonHref, input.wallLabel, adminId],
  );
  return toPanel(result.rows[0]);
};
