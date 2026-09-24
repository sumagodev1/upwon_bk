// src/modules/product-pages/erp-page/services/comparison-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { env } from '../../../../config/env';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { RequestContext } from '../../../../core/types/common.types';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../../files/repositories/file.repository';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../../shared/comparison/comparison.repository';
import {
  ComparisonCategory,
  ComparisonColumn,
  ComparisonRow,
  ComparisonSection,
  ComparisonValue,
  CreateComparisonCategoryInput,
  CreateComparisonColumnInput,
  CreateComparisonRowInput,
  PublicComparisonSection,
  ResolvedComparisonColumn,
  ResolvedComparisonRow,
  UpdateComparisonCategoryInput,
  UpdateComparisonColumnInput,
  UpdateComparisonRowInput,
  UpsertComparisonSectionInput,
} from '../../shared/comparison/comparison.types';

const MODULE = 'erp_page';
const SECTION_ENTITY = 'comparison_section';
const COLUMN_ENTITY = 'comparison_column';
const CATEGORY_ENTITY = 'comparison_category';
const ROW_ENTITY = 'comparison_row';

/**
 * The ERP page's grid. The tables carry no page in their names, so the one
 * place that says which grid this module edits is here.
 */
const PAGE_KEY = 'erp';
const SECTION_KEY = 'alternatives';

/** Only images belong in a column header; a PDF in an <img> is a broken frame. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the header falls back to its name, which is
  // what it shows today anyway.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

/**
 * Rejects a file id that is not a live image.
 *
 * No dimension rule: a wordmark is drawn at its own aspect inside a fixed
 * height, so there is no single shape to hold it to.
 */
const assertUsableImageFile = async (fileId: string, field: string): Promise<void> => {
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('That file must be an image', [
      { field, message: `Expected an image, got ${file.mimeType}`, code: 'INVALID_FILE_TYPE' },
    ]);
  }
};

const toResolvedColumn = async (
  column: ComparisonColumn,
): Promise<ResolvedComparisonColumn> => ({
  ...column,
  logo: await resolveSource(column.logoUrl, column.logoFileId),
});

/**
 * The grid every write hangs off.
 *
 * Created on demand rather than by the seed alone, so a page whose grid has
 * never been saved still accepts its first column instead of 404ing on a
 * container the administrator never knew existed.
 */
const ensureSection = async (
  context: RequestContext,
  client?: Parameters<typeof repo.findSection>[2],
): Promise<ComparisonSection> => {
  const existing = await repo.findSection(PAGE_KEY, SECTION_KEY, client);
  if (existing) return existing;

  return repo.upsertSection(
    PAGE_KEY,
    SECTION_KEY,
    { leaderLabel: 'How They Compare', leaderDescription: null },
    context.adminId,
    client,
  );
};

// ── the section ───────────────────────────────────────────────────────────

/** Null when the grid has never been saved - a normal first-run state. */
export const getSection = async (): Promise<ComparisonSection | null> =>
  repo.findSection(PAGE_KEY, SECTION_KEY);

export const saveSection = async (
  input: UpsertComparisonSectionInput,
  context: RequestContext,
): Promise<ComparisonSection> =>
  withTransaction(async (client) => {
    const existing = await repo.findSectionForUpdate(PAGE_KEY, SECTION_KEY, client);
    const saved = await repo.upsertSection(
      PAGE_KEY,
      SECTION_KEY,
      input,
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_SECTION_UPDATED,
        module: MODULE,
        entityType: SECTION_ENTITY,
        entityId: saved.id,
        oldValues: existing ? { leaderLabel: existing.leaderLabel } : undefined,
        newValues: { leaderLabel: saved.leaderLabel },
      },
      context,
      client,
    );

    return saved;
  });

// ── columns ───────────────────────────────────────────────────────────────

export const listColumns = async (): Promise<ResolvedComparisonColumn[]> => {
  const section = await repo.findSection(PAGE_KEY, SECTION_KEY);
  if (!section) return [];
  const columns = await repo.findColumns(section.id);
  return Promise.all(columns.map(toResolvedColumn));
};

export const getColumnById = async (id: string): Promise<ResolvedComparisonColumn> => {
  const column = await repo.findColumnById(id);
  if (!column) throw new NotFoundError('Column');
  return toResolvedColumn(column);
};

export const createColumn = async (
  input: CreateComparisonColumnInput,
  context: RequestContext,
): Promise<ResolvedComparisonColumn> => {
  if (input.logoFileId) await assertUsableImageFile(input.logoFileId, 'logoFileId');

  return withTransaction(async (client) => {
    const section = await ensureSection(context, client);

    const existing = await repo.countColumns(section.id, client);
    if (existing >= LIMITS.MAX_COMPARISON_COLUMNS) {
      throw new ConflictError(
        `The grid holds at most ${LIMITS.MAX_COMPARISON_COLUMNS} columns beside the leader column`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextColumnOrder(section.id, client));
    const created = await repo.createColumn(
      section.id,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    // At most one highlighted column: the tinted band means "this is us".
    if (created.highlightColumn) {
      await repo.clearOtherHighlights(section.id, created.id, context.adminId, client);
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_COLUMN_CREATED,
        module: MODULE,
        entityType: COLUMN_ENTITY,
        entityId: created.id,
        newValues: { name: created.name, status: created.status },
      },
      context,
      client,
    );

    return toResolvedColumn(created);
  });
};

export const updateColumn = async (
  id: string,
  patch: UpdateComparisonColumnInput,
  context: RequestContext,
): Promise<ResolvedComparisonColumn> => {
  if (patch.logoFileId) await assertUsableImageFile(patch.logoFileId, 'logoFileId');

  return withTransaction(async (client) => {
    const existing = await repo.findColumnByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Column');

    const updated = await repo.updateColumn(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Column');

    if (updated.highlightColumn) {
      await repo.clearOtherHighlights(updated.sectionId, updated.id, context.adminId, client);
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_COLUMN_UPDATED,
        module: MODULE,
        entityType: COLUMN_ENTITY,
        entityId: id,
        oldValues: { name: existing.name, status: existing.status },
        newValues: { name: updated.name, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedColumn(updated);
  });
};

export const setColumnStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedComparisonColumn> => updateColumn(id, { status }, context);

export const reorderColumns = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedComparisonColumn[]> =>
  withTransaction(async (client) => {
    const section = await ensureSection(context, client);
    const current = await repo.findColumns(section.id, client);

    if (ids.length !== current.length) {
      throw new ValidationError('The order must list every column', [
        {
          field: 'ids',
          message: `Expected ${current.length} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const owned = new Set(current.map((row) => row.id));
    if (!ids.every((id) => owned.has(id))) {
      throw new ValidationError('The order names a column that is not in this grid', [
        { field: 'ids', message: 'One or more ids are unknown here', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyColumnOrder(section.id, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_COLUMNS_REORDERED,
        module: MODULE,
        entityType: COLUMN_ENTITY,
        entityId: section.id,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findColumns(section.id, client);
    return Promise.all(reordered.map(toResolvedColumn));
  });

export const removeColumn = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findColumnByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Column');

    // The cells in this column go with it; comparison_values cascades.
    await repo.removeColumn(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_COLUMN_DELETED,
        module: MODULE,
        entityType: COLUMN_ENTITY,
        entityId: id,
        oldValues: { name: existing.name },
      },
      context,
      client,
    );
  });
};

// ── categories ────────────────────────────────────────────────────────────

export const listCategories = async (): Promise<ComparisonCategory[]> => {
  const section = await repo.findSection(PAGE_KEY, SECTION_KEY);
  if (!section) return [];
  return repo.findCategories(section.id);
};

export const getCategoryById = async (id: string): Promise<ComparisonCategory> => {
  const category = await repo.findCategoryById(id);
  if (!category) throw new NotFoundError('Category');
  return category;
};

export const createCategory = async (
  input: CreateComparisonCategoryInput,
  context: RequestContext,
): Promise<ComparisonCategory> =>
  withTransaction(async (client) => {
    const section = await ensureSection(context, client);

    const existing = await repo.countCategories(section.id, client);
    if (existing >= LIMITS.MAX_COMPARISON_CATEGORIES) {
      throw new ConflictError(
        `The grid holds at most ${LIMITS.MAX_COMPARISON_CATEGORIES} bands`,
      );
    }

    const displayOrder =
      input.displayOrder ?? (await repo.nextCategoryOrder(section.id, client));
    const created = await repo.createCategory(
      section.id,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_CATEGORY_CREATED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: created.id,
        newValues: { name: created.name, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateCategory = async (
  id: string,
  patch: UpdateComparisonCategoryInput,
  context: RequestContext,
): Promise<ComparisonCategory> =>
  withTransaction(async (client) => {
    const existing = await repo.findCategoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    const updated = await repo.updateCategory(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_CATEGORY_UPDATED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: id,
        oldValues: { name: existing.name, status: existing.status },
        newValues: { name: updated.name, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setCategoryStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ComparisonCategory> => updateCategory(id, { status }, context);

export const reorderCategories = async (
  ids: string[],
  context: RequestContext,
): Promise<ComparisonCategory[]> =>
  withTransaction(async (client) => {
    const section = await ensureSection(context, client);
    const current = await repo.findCategories(section.id, client);

    if (ids.length !== current.length) {
      throw new ValidationError('The order must list every band', [
        {
          field: 'ids',
          message: `Expected ${current.length} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const owned = new Set(current.map((row) => row.id));
    if (!ids.every((id) => owned.has(id))) {
      throw new ValidationError('The order names a band that is not in this grid', [
        { field: 'ids', message: 'One or more ids are unknown here', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyCategoryOrder(section.id, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_CATEGORIES_REORDERED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: section.id,
        newValues: { order: ids },
      },
      context,
      client,
    );

    return repo.findCategories(section.id, client);
  });

export const removeCategory = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCategoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    // The rows in this band go with it, and their cells with them.
    await repo.removeCategory(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_CATEGORY_DELETED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: id,
        oldValues: { name: existing.name },
      },
      context,
      client,
    );
  });
};

// ── rows, with their cells ────────────────────────────────────────────────

/**
 * Rows are addressed through their band, so the band in the path is checked
 * rather than trusted. Without it the nesting would be decoration: any id would
 * resolve under any parent, and a screen could delete a row belonging to a band
 * the editor is not even looking at.
 */
const assertOwned = (row: ComparisonRow | null, categoryId: string): ComparisonRow => {
  if (!row || row.categoryId !== categoryId) throw new NotFoundError('Row');
  return row;
};

const withValues = async (
  row: ComparisonRow,
  client?: Parameters<typeof repo.findValuesByRow>[1],
): Promise<ResolvedComparisonRow> => ({
  ...row,
  values: await repo.findValuesByRow(row.id, client),
});

/**
 * Checks that every cell names a column of this grid.
 *
 * A cell pointing at a column from somewhere else would insert cleanly - the
 * foreign key only knows the column exists - and then never render, because the
 * site looks up cells by the columns it was given.
 */
const assertColumnsBelong = async (
  sectionId: string,
  values: Array<{ columnId: string }>,
  client: Parameters<typeof repo.findColumns>[1],
): Promise<void> => {
  if (values.length === 0) return;
  const columns = await repo.findColumns(sectionId, client);
  const owned = new Set(columns.map((column) => column.id));

  const stray = values.find((value) => !owned.has(value.columnId));
  if (stray) {
    throw new ValidationError('A value names a column that is not in this grid', [
      {
        field: 'values',
        message: `Column ${stray.columnId} does not belong to this comparison`,
        code: 'UNKNOWN_COLUMN',
      },
    ]);
  }
};

export const listRows = async (categoryId: string): Promise<ResolvedComparisonRow[]> => {
  const category = await repo.findCategoryById(categoryId);
  if (!category) throw new NotFoundError('Category');

  const rows = await repo.findRowsByCategory(categoryId);
  const values = await repo.findValuesForRows(rows.map((row) => row.id));

  const byRow = new Map<string, ComparisonValue[]>();
  for (const value of values) {
    const list = byRow.get(value.rowId) ?? [];
    list.push(value);
    byRow.set(value.rowId, list);
  }

  return rows.map((row) => ({ ...row, values: byRow.get(row.id) ?? [] }));
};

export const getRowById = async (
  categoryId: string,
  id: string,
): Promise<ResolvedComparisonRow> =>
  withValues(assertOwned(await repo.findRowById(id), categoryId));

export const createRow = async (
  categoryId: string,
  input: CreateComparisonRowInput,
  context: RequestContext,
): Promise<ResolvedComparisonRow> =>
  withTransaction(async (client) => {
    const category = await repo.findCategoryById(categoryId, client);
    if (!category) throw new NotFoundError('Category');

    const existing = await repo.countRows(categoryId, client);
    if (existing >= LIMITS.MAX_COMPARISON_ROWS) {
      throw new ConflictError(`A band holds at most ${LIMITS.MAX_COMPARISON_ROWS} rows`);
    }

    await assertColumnsBelong(category.sectionId, input.values, client);

    const displayOrder = input.displayOrder ?? (await repo.nextRowOrder(categoryId, client));
    const created = await repo.createRow(
      categoryId,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    const values = await repo.replaceValues(
      created.id,
      input.values,
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_ROW_CREATED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: created.id,
        newValues: { categoryId, parameter: created.parameter, cells: values.length },
      },
      context,
      client,
    );

    return { ...created, values };
  });

export const updateRow = async (
  categoryId: string,
  id: string,
  patch: UpdateComparisonRowInput,
  context: RequestContext,
): Promise<ResolvedComparisonRow> =>
  withTransaction(async (client) => {
    const existing = assertOwned(await repo.findRowByIdForUpdate(id, client), categoryId);
    const category = await repo.findCategoryById(categoryId, client);
    if (!category) throw new NotFoundError('Category');

    if (patch.values) {
      await assertColumnsBelong(category.sectionId, patch.values, client);
    }

    const updated = await repo.updateRow(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Row');

    /*
     * `values` absent leaves the cells alone; present replaces them wholesale.
     * That is how a cell is emptied - the column is simply left out of the
     * list the form posts.
     */
    const values = patch.values
      ? await repo.replaceValues(id, patch.values, context.adminId, client)
      : await repo.findValuesByRow(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_ROW_UPDATED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: id,
        oldValues: { parameter: existing.parameter, status: existing.status },
        newValues: { parameter: updated.parameter, status: updated.status },
      },
      context,
      client,
    );

    return { ...updated, values };
  });

export const setRowStatus = async (
  categoryId: string,
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedComparisonRow> => updateRow(categoryId, id, { status }, context);

export const reorderRows = async (
  categoryId: string,
  ids: string[],
  context: RequestContext,
): Promise<ResolvedComparisonRow[]> =>
  withTransaction(async (client) => {
    const category = await repo.findCategoryById(categoryId, client);
    if (!category) throw new NotFoundError('Category');

    const current = await repo.findRowsByCategory(categoryId, client);
    if (ids.length !== current.length) {
      throw new ValidationError('The order must list every row', [
        {
          field: 'ids',
          message: `Expected ${current.length} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const owned = new Set(current.map((row) => row.id));
    if (!ids.every((id) => owned.has(id))) {
      throw new ValidationError('The order names a row from another band', [
        { field: 'ids', message: 'One or more ids are unknown here', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyRowOrder(categoryId, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_ROWS_REORDERED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: categoryId,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const rows = await repo.findRowsByCategory(categoryId, client);
    return Promise.all(rows.map((row) => withValues(row, client)));
  });

export const removeRow = async (
  categoryId: string,
  id: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = assertOwned(await repo.findRowByIdForUpdate(id, client), categoryId);

    await repo.removeRow(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.COMPARISON_ROW_DELETED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: id,
        oldValues: { categoryId, parameter: existing.parameter },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole grid in one response.
 *
 * Cells come back keyed by column id, so the site pairs them with the columns
 * it was handed and never has to know what any column is called. Adding
 * "Microsoft Dynamics" in the panel is then a column and a cell per row, with
 * nothing to change on the site.
 *
 * Null when the copy, the columns or the bands are missing: the page then keeps
 * the grid it ships, which is a complete working one.
 */
export const getPublished = async (): Promise<PublicComparisonSection | null> => {
  const [copy, section] = await Promise.all([
    sectionCopyService.get(PAGE_KEY, SECTION_KEY),
    repo.findSection(PAGE_KEY, SECTION_KEY),
  ]);
  if (!copy || !section || section.status !== 'ACTIVE') return null;

  const [columns, categories] = await Promise.all([
    repo.findPublishedColumns(section.id),
    repo.findPublishedCategories(section.id),
  ]);
  if (columns.length === 0 || categories.length === 0) return null;

  const rows = await repo.findActiveRowsForCategories(categories.map((c) => c.id));
  const values = await repo.findValuesForRows(rows.map((r) => r.id));

  const valuesByRow = new Map<string, Record<string, string>>();
  for (const value of values) {
    /*
     * A cell is prose or a score since the grid learned to hold ratings. This
     * section is a TEXT one, so a scored cell has nothing for it to draw and is
     * skipped rather than published as an empty string.
     */
    if (value.content === null) continue;
    const cells = valuesByRow.get(value.rowId) ?? {};
    cells[value.columnId] = value.content;
    valuesByRow.set(value.rowId, cells);
  }

  const rowsByCategory = new Map<string, ComparisonRow[]>();
  for (const row of rows) {
    const list = rowsByCategory.get(row.categoryId) ?? [];
    list.push(row);
    rowsByCategory.set(row.categoryId, list);
  }

  const resolvedColumns = await Promise.all(
    columns.map(async (column) => ({
      id: column.id,
      name: column.name,
      description: column.description,
      logo: await resolveSource(column.logoUrl, column.logoFileId),
      logoAlt: column.logoAlt,
      columnType: column.columnType,
      highlight: column.highlightColumn,
    })),
  );

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    leader: { label: section.leaderLabel, description: section.leaderDescription },
    columns: resolvedColumns,
    // A band with no rows is dropped: an empty label with nothing under it
    // reads as a mistake on the page.
    categories: categories
      .map((category) => ({
        name: category.name,
        description: category.description,
        rows: (rowsByCategory.get(category.id) ?? []).map((row) => ({
          parameter: row.parameter,
          values: valuesByRow.get(row.id) ?? {},
        })),
      }))
      .filter((category) => category.rows.length > 0),
  };
};
