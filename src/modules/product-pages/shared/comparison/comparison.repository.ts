// src/modules/product-pages/shared/comparison/comparison.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import {
  ComparisonCategory,
  ComparisonCellType,
  ComparisonColumn,
  ComparisonColumnType,
  ComparisonRowType,
  ComparisonTone,
  ComparisonRow,
  ComparisonSection,
  ComparisonValue,
  CreateComparisonCategoryInput,
  CreateComparisonColumnInput,
  CreateComparisonRowInput,
  UpdateComparisonCategoryInput,
  UpdateComparisonColumnInput,
  UpdateComparisonRowInput,
  UpsertComparisonSectionInput,
} from './comparison.types';

/**
 * Five tables behind one grid.
 *
 * The cells are read in bulk by row id rather than one query per row, so
 * assembling the whole grid is four round trips however many rows it holds.
 */

// ── the section ───────────────────────────────────────────────────────────

const SECTION_COLUMNS = `
  id, page_key, section_key, cell_type, leader_label, leader_description, status,
  created_by, updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  page_key: string;
  section_key: string;
  cell_type: ComparisonCellType;
  leader_label: string;
  leader_description: string | null;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): ComparisonSection => ({
  id: row.id,
  pageKey: row.page_key,
  sectionKey: row.section_key,
  cellType: row.cell_type,
  leaderLabel: row.leader_label,
  leaderDescription: row.leader_description,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findSection = async (
  pageKey: string,
  sectionKey: string,
  executor?: Executor,
): Promise<ComparisonSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${SECTION_COLUMNS} FROM comparison_sections
      WHERE page_key = $1 AND section_key = $2`,
    [pageKey, sectionKey],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

export const findSectionForUpdate = async (
  pageKey: string,
  sectionKey: string,
  executor: Executor,
): Promise<ComparisonSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${SECTION_COLUMNS} FROM comparison_sections
      WHERE page_key = $1 AND section_key = $2 FOR UPDATE`,
    [pageKey, sectionKey],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Creates the grid or edits its leader column.
 *
 * ON CONFLICT on the (page_key, section_key) pair, so the first save creates
 * the section that the columns and categories hang off and every later save
 * edits it - an administrator never has to create the container by hand.
 */
export const upsertSection = async (
  pageKey: string,
  sectionKey: string,
  input: UpsertComparisonSectionInput,
  adminId: string | null,
  executor?: Executor,
): Promise<ComparisonSection> => {
  const result = await runQuery<SectionRow>(
    executor,
    /*
     * COALESCE on the conflict path, not EXCLUDED: a save that does not name a
     * cell type leaves the stored one alone, so an ordinary edit of the leader
     * column can never quietly turn a rating grid back into a text one.
     */
    `INSERT INTO comparison_sections
       (page_key, section_key, leader_label, leader_description, cell_type,
        created_by, updated_by)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'TEXT'), $6, $6)
     ON CONFLICT (page_key, section_key) DO UPDATE
        SET leader_label = EXCLUDED.leader_label,
            leader_description = EXCLUDED.leader_description,
            cell_type = COALESCE($5, comparison_sections.cell_type),
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${SECTION_COLUMNS}`,
    [
      pageKey,
      sectionKey,
      input.leaderLabel,
      input.leaderDescription,
      input.cellType ?? null,
      adminId,
    ],
  );
  return toSection(result.rows[0]);
};

// ── columns ───────────────────────────────────────────────────────────────

const COLUMN_UPDATABLE: Readonly<Record<string, string>> = {
  name: 'name',
  description: 'description',
  logoAlt: 'logo_alt',
  columnType: 'column_type',
  highlightColumn: 'highlight_column',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMN_COLUMNS = `
  id, section_id, name, description,
  logo_url, logo_file_id, logo_alt,
  column_type, highlight_column, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface ColumnRow {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  logo_file_id: string | null;
  logo_alt: string | null;
  column_type: ComparisonColumnType;
  highlight_column: boolean;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toColumn = (row: ColumnRow): ComparisonColumn => ({
  id: row.id,
  sectionId: row.section_id,
  name: row.name,
  description: row.description,
  logoUrl: row.logo_url,
  logoFileId: row.logo_file_id,
  logoAlt: row.logo_alt,
  columnType: row.column_type,
  highlightColumn: row.highlight_column,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findColumnById = async (
  id: string,
  executor?: Executor,
): Promise<ComparisonColumn | null> => {
  const result = await runQuery<ColumnRow>(
    executor,
    `SELECT ${COLUMN_COLUMNS} FROM comparison_columns WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toColumn(result.rows[0]) : null;
};

export const findColumnByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ComparisonColumn | null> => {
  const result = await runQuery<ColumnRow>(
    executor,
    `SELECT ${COLUMN_COLUMNS} FROM comparison_columns WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toColumn(result.rows[0]) : null;
};

export const findColumns = async (
  sectionId: string,
  executor?: Executor,
): Promise<ComparisonColumn[]> => {
  const result = await runQuery<ColumnRow>(
    executor,
    `SELECT ${COLUMN_COLUMNS} FROM comparison_columns
      WHERE section_id = $1
      ORDER BY display_order ASC, created_at ASC`,
    [sectionId],
  );
  return result.rows.map(toColumn);
};

export const findPublishedColumns = async (
  sectionId: string,
  executor?: Executor,
): Promise<ComparisonColumn[]> => {
  const result = await runQuery<ColumnRow>(
    executor,
    `SELECT ${COLUMN_COLUMNS} FROM comparison_columns
      WHERE section_id = $1 AND status = 'ACTIVE'
      ORDER BY display_order ASC, created_at ASC`,
    [sectionId],
  );
  return result.rows.map(toColumn);
};

export const countColumns = async (
  sectionId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM comparison_columns WHERE section_id = $1',
    [sectionId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextColumnOrder = async (
  sectionId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
       FROM comparison_columns WHERE section_id = $1`,
    [sectionId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createColumn = async (
  sectionId: string,
  input: CreateComparisonColumnInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ComparisonColumn> => {
  const result = await runQuery<ColumnRow>(
    executor,
    `INSERT INTO comparison_columns
       (section_id, name, description, logo_url, logo_file_id, logo_alt,
        column_type, highlight_column, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
     RETURNING ${COLUMN_COLUMNS}`,
    [
      sectionId,
      input.name,
      input.description,
      input.logoUrl,
      input.logoFileId,
      input.logoAlt,
      input.columnType,
      input.highlightColumn,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toColumn(result.rows[0]);
};

export const updateColumn = async (
  id: string,
  patch: UpdateComparisonColumnInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ComparisonColumn | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(COLUMN_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  /*
   * The two logo columns are mutually exclusive by CHECK, so setting one has to
   * clear the other in the same statement. Without this, patching a URL onto a
   * column that already holds a file id violates the constraint instead of
   * replacing the wordmark.
   */
  if (patch.logoUrl !== undefined) {
    assign('logo_url', patch.logoUrl);
    if (patch.logoUrl !== null && patch.logoFileId === undefined) assign('logo_file_id', null);
  }
  if (patch.logoFileId !== undefined) {
    assign('logo_file_id', patch.logoFileId);
    if (patch.logoFileId !== null && patch.logoUrl === undefined) assign('logo_url', null);
  }

  if (assignments.length === 0) return findColumnById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<ColumnRow>(
    executor,
    `UPDATE comparison_columns SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${COLUMN_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toColumn(result.rows[0]) : null;
};

/**
 * Clears the highlight from every other column in the grid.
 *
 * At most one column is highlighted: the tinted band is what marks "this is
 * us", and two of them says nothing. Enforced here rather than by a partial
 * unique index so that turning a highlight on simply moves it.
 */
export const clearOtherHighlights = async (
  sectionId: string,
  keepId: string,
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  const result = await runQuery(
    executor,
    `UPDATE comparison_columns
        SET highlight_column = FALSE, updated_by = $3
      WHERE section_id = $1 AND id <> $2 AND highlight_column = TRUE`,
    [sectionId, keepId, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const applyColumnOrder = async (
  sectionId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE comparison_columns AS c
        SET display_order = ordered.position, updated_by = $3
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id AND c.section_id = $2`,
    [orderedIds, sectionId, updatedBy],
  );
  return result.rowCount ?? 0;
};

/** The cells in this column go with it - comparison_values cascades. */
export const removeColumn = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM comparison_columns WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── categories ────────────────────────────────────────────────────────────

const CATEGORY_UPDATABLE: Readonly<Record<string, string>> = {
  name: 'name',
  description: 'description',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const CATEGORY_COLUMNS = `
  id, section_id, name, description, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CategoryRow {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCategory = (row: CategoryRow): ComparisonCategory => ({
  id: row.id,
  sectionId: row.section_id,
  name: row.name,
  description: row.description,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCategoryById = async (
  id: string,
  executor?: Executor,
): Promise<ComparisonCategory | null> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM comparison_categories WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

export const findCategoryByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ComparisonCategory | null> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM comparison_categories WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

export const findCategories = async (
  sectionId: string,
  executor?: Executor,
): Promise<ComparisonCategory[]> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM comparison_categories
      WHERE section_id = $1
      ORDER BY display_order ASC, created_at ASC`,
    [sectionId],
  );
  return result.rows.map(toCategory);
};

export const findPublishedCategories = async (
  sectionId: string,
  executor?: Executor,
): Promise<ComparisonCategory[]> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM comparison_categories
      WHERE section_id = $1 AND status = 'ACTIVE'
      ORDER BY display_order ASC, created_at ASC`,
    [sectionId],
  );
  return result.rows.map(toCategory);
};

export const countCategories = async (
  sectionId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM comparison_categories WHERE section_id = $1',
    [sectionId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextCategoryOrder = async (
  sectionId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
       FROM comparison_categories WHERE section_id = $1`,
    [sectionId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createCategory = async (
  sectionId: string,
  input: CreateComparisonCategoryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ComparisonCategory> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `INSERT INTO comparison_categories
       (section_id, name, description, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${CATEGORY_COLUMNS}`,
    [sectionId, input.name, input.description, input.displayOrder, input.status, createdBy],
  );
  return toCategory(result.rows[0]);
};

export const updateCategory = async (
  id: string,
  patch: UpdateComparisonCategoryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ComparisonCategory | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(CATEGORY_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findCategoryById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<CategoryRow>(
    executor,
    `UPDATE comparison_categories SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${CATEGORY_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

export const applyCategoryOrder = async (
  sectionId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE comparison_categories AS c
        SET display_order = ordered.position, updated_by = $3
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id AND c.section_id = $2`,
    [orderedIds, sectionId, updatedBy],
  );
  return result.rowCount ?? 0;
};

/** The rows in this band go with it, and their cells with them. */
export const removeCategory = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM comparison_categories WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};

// ── rows ──────────────────────────────────────────────────────────────────

const ROW_UPDATABLE: Readonly<Record<string, string>> = {
  parameter: 'parameter',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const ROW_COLUMNS = `
  id, category_id, row_type, parameter, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface RowRow {
  id: string;
  category_id: string;
  row_type: ComparisonRowType;
  parameter: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toRow = (row: RowRow): ComparisonRow => ({
  id: row.id,
  categoryId: row.category_id,
  rowType: row.row_type,
  parameter: row.parameter,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findRowById = async (
  id: string,
  executor?: Executor,
): Promise<ComparisonRow | null> => {
  const result = await runQuery<RowRow>(
    executor,
    `SELECT ${ROW_COLUMNS} FROM comparison_rows WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toRow(result.rows[0]) : null;
};

export const findRowByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ComparisonRow | null> => {
  const result = await runQuery<RowRow>(
    executor,
    `SELECT ${ROW_COLUMNS} FROM comparison_rows WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toRow(result.rows[0]) : null;
};

export const findRowsByCategory = async (
  categoryId: string,
  executor?: Executor,
): Promise<ComparisonRow[]> => {
  const result = await runQuery<RowRow>(
    executor,
    `SELECT ${ROW_COLUMNS} FROM comparison_rows
      WHERE category_id = $1
      ORDER BY display_order ASC, created_at ASC`,
    [categoryId],
  );
  return result.rows.map(toRow);
};

/** One query for every category's rows, rather than one query per category. */
export const findActiveRowsForCategories = async (
  categoryIds: string[],
  executor?: Executor,
): Promise<ComparisonRow[]> => {
  if (categoryIds.length === 0) return [];
  const result = await runQuery<RowRow>(
    executor,
    `SELECT ${ROW_COLUMNS} FROM comparison_rows
      WHERE category_id = ANY($1::uuid[]) AND status = 'ACTIVE'
      ORDER BY display_order ASC, created_at ASC`,
    [categoryIds],
  );
  return result.rows.map(toRow);
};

export const countRows = async (categoryId: string, executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM comparison_rows WHERE category_id = $1',
    [categoryId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextRowOrder = async (
  categoryId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
       FROM comparison_rows WHERE category_id = $1`,
    [categoryId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createRow = async (
  categoryId: string,
  input: CreateComparisonRowInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ComparisonRow> => {
  const result = await runQuery<RowRow>(
    executor,
    `INSERT INTO comparison_rows
       (category_id, parameter, row_type, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${ROW_COLUMNS}`,
    [
      categoryId,
      input.parameter,
      input.rowType ?? 'STANDARD',
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toRow(result.rows[0]);
};

export const updateRow = async (
  id: string,
  patch: UpdateComparisonRowInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ComparisonRow | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(ROW_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findRowById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<RowRow>(
    executor,
    `UPDATE comparison_rows SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${ROW_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toRow(result.rows[0]) : null;
};

export const applyRowOrder = async (
  categoryId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE comparison_rows AS r
        SET display_order = ordered.position, updated_by = $3
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE r.id = ordered.id AND r.category_id = $2`,
    [orderedIds, categoryId, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const removeRow = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM comparison_rows WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── cells ─────────────────────────────────────────────────────────────────

const VALUE_COLUMNS = `
  id, row_id, column_id, content, rating, flag, tone, created_at, updated_at
`;

interface ValueRow {
  id: string;
  row_id: string;
  column_id: string;
  content: string | null;
  /** SMALLINT, which node-postgres returns as a number. */
  rating: number | null;
  flag: boolean | null;
  tone: ComparisonTone | null;
  created_at: Date;
  updated_at: Date;
}

const toValue = (row: ValueRow): ComparisonValue => ({
  id: row.id,
  rowId: row.row_id,
  columnId: row.column_id,
  content: row.content,
  rating: row.rating === null ? null : Number(row.rating),
  flag: row.flag,
  tone: row.tone,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findValuesByRow = async (
  rowId: string,
  executor?: Executor,
): Promise<ComparisonValue[]> => {
  const result = await runQuery<ValueRow>(
    executor,
    `SELECT ${VALUE_COLUMNS} FROM comparison_values WHERE row_id = $1`,
    [rowId],
  );
  return result.rows.map(toValue);
};

/** One query for every row's cells, rather than one query per row. */
export const findValuesForRows = async (
  rowIds: string[],
  executor?: Executor,
): Promise<ComparisonValue[]> => {
  if (rowIds.length === 0) return [];
  const result = await runQuery<ValueRow>(
    executor,
    `SELECT ${VALUE_COLUMNS} FROM comparison_values WHERE row_id = ANY($1::uuid[])`,
    [rowIds],
  );
  return result.rows.map(toValue);
};

/**
 * Replaces a row's cells with exactly the ones given.
 *
 * Wholesale rather than per cell, because that is how the form saves: whatever
 * the editor left in the boxes is what the row now says, and a box cleared is a
 * cell removed. Deleting first and inserting after keeps it to two statements
 * and cannot leave a stale cell behind for a column that is no longer named.
 */
export const replaceValues = async (
  rowId: string,
  values: Array<{
    columnId: string;
    content?: string | null;
    rating?: number | null;
    flag?: boolean | null;
    tone?: ComparisonTone | null;
  }>,
  adminId: string | null,
  executor: Executor,
): Promise<ComparisonValue[]> => {
  await runQuery(executor, 'DELETE FROM comparison_values WHERE row_id = $1', [rowId]);

  if (values.length === 0) return [];

  /*
   * The arrays are typed at the cast rather than inferred, because a column of
   * all-nulls has no type Postgres can guess - which is exactly what a rating
   * section sends for `content`, and a text section for `rating`.
   */
  const result = await runQuery<ValueRow>(
    executor,
    `INSERT INTO comparison_values
       (row_id, column_id, content, rating, flag, tone, created_by, updated_by)
     SELECT $1, u.column_id, u.content, u.rating, u.flag, u.tone, $7, $7
       FROM unnest($2::uuid[], $3::text[], $4::smallint[], $5::boolean[], $6::text[])
         AS u(column_id, content, rating, flag, tone)
     RETURNING ${VALUE_COLUMNS}`,
    [
      rowId,
      values.map((v) => v.columnId),
      values.map((v) => v.content ?? null),
      values.map((v) => v.rating ?? null),
      // `?? null` rather than `|| null`: false is a real answer here.
      values.map((v) => v.flag ?? null),
      values.map((v) => v.tone ?? null),
      adminId,
    ],
  );
  return result.rows.map(toValue);
};
