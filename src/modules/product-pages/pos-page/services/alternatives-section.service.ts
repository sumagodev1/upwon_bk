// src/modules/product-pages/pos-page/services/alternatives-section.service.ts

import { Executor, withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { RequestContext } from '../../../../core/types/common.types';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../../shared/comparison/comparison.repository';
import {
  ComparisonColumn,
  ComparisonRow,
  ComparisonSection,
  ComparisonValue,
} from '../../shared/comparison/comparison.types';
import {
  CreatePosAlternativeRowInput,
  CreatePosAlternativesColumnInput,
  PublicPosAlternativesSection,
  ResolvedPosAlternativeRow,
  UpdatePosAlternativeRowInput,
  UpdatePosAlternativesColumnInput,
  UpsertPosAlternativesSectionInput,
} from '../types/alternatives-section.types';

const MODULE = 'pos_page';
const SECTION_ENTITY = 'comparison_section';
const COLUMN_ENTITY = 'comparison_column';
const ROW_ENTITY = 'comparison_row';

/**
 * The POS page's grid. The shared tables carry no page in their names, so the
 * one place that says which grid this module edits is here.
 */
const PAGE_KEY = 'pos';
const SECTION_KEY = 'alternatives';

/**
 * The band every row belongs to.
 *
 * This design has no bands - it is a flat list of criteria - but a row must
 * belong to a category, so the section keeps exactly one and no screen
 * surfaces it. Created on demand, so a first-run grid needs no seeding step.
 */
const CATEGORY_NAME = 'Criteria';

// -- the section and its one band -------------------------------------------

const requireSection = async (executor?: Executor): Promise<ComparisonSection> => {
  const section = await repo.findSection(PAGE_KEY, SECTION_KEY, executor);
  if (!section) throw new NotFoundError('Comparison grid');
  return section;
};

/**
 * The section, created on first use.
 *
 * Every write needs somewhere to hang off, and asking an administrator to
 * create the container before the first column would be a step with no
 * meaning - the grid is the section.
 */
const ensureSection = async (executor: Executor): Promise<ComparisonSection> => {
  const existing = await repo.findSection(PAGE_KEY, SECTION_KEY, executor);
  if (existing) return existing;

  return repo.upsertSection(
    PAGE_KEY,
    SECTION_KEY,
    { leaderLabel: 'Capability', leaderDescription: null, cellType: 'RATING' },
    null,
    executor,
  );
};

const ensureCategory = async (sectionId: string, executor: Executor): Promise<string> => {
  const existing = await repo.findCategories(sectionId, executor);
  if (existing.length > 0) return existing[0].id;

  const created = await repo.createCategory(
    sectionId,
    { name: CATEGORY_NAME, description: null, status: 'ACTIVE' as const, displayOrder: 0 },
    null,
    executor,
  );
  return created.id;
};

/** Cells as the screens read them: prose against a column, ignoring blanks. */
const attachCells = (
  row: ComparisonRow,
  values: ComparisonValue[],
): ResolvedPosAlternativeRow => ({
  ...row,
  cells: values
    .filter((value) => value.rowId === row.id)
    .map((value) => ({
      columnId: value.columnId,
      content: value.content,
      rating: value.rating,
    })),
});

/**
 * Refuses a cell aimed at a column this grid does not have.
 *
 * Without it a row could store prose against a column id from another page's
 * grid, which would be invisible everywhere and impossible to clear.
 */
const assertColumnsExist = async (
  sectionId: string,
  columnIds: string[],
  executor: Executor,
): Promise<void> => {
  if (columnIds.length === 0) return;

  const columns = await repo.findColumns(sectionId, executor);
  const known = new Set(columns.map((column) => column.id));
  const unknown = columnIds.filter((id) => !known.has(id));

  if (unknown.length > 0) {
    throw new ValidationError('One or more cells name a column this grid does not have', [
      {
        field: 'cells',
        message: `Unknown column ids: ${unknown.join(', ')}`,
        code: 'UNKNOWN_COLUMN',
      },
    ]);
  }
};

export const getSection = async (): Promise<ComparisonSection | null> =>
  repo.findSection(PAGE_KEY, SECTION_KEY);

export const upsertSection = async (
  input: UpsertPosAlternativesSectionInput,
  context: RequestContext,
): Promise<ComparisonSection> =>
  withTransaction(async (client) => {
    const existing = await repo.findSection(PAGE_KEY, SECTION_KEY, client);

    /*
     * cellType is passed only when the section is new. An ordinary edit of the
     * leader column leaves it alone, so the grid cannot be flipped to scores
     * with every stored sentence still in place.
     */
    const saved = await repo.upsertSection(
      PAGE_KEY,
      SECTION_KEY,
      { ...input, ...(existing ? {} : { cellType: 'RATING' as const }) },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_ALTERNATIVES_SECTION_UPDATED,
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

// -- the columns ------------------------------------------------------------

export const listColumns = async (): Promise<ComparisonColumn[]> => {
  const section = await repo.findSection(PAGE_KEY, SECTION_KEY);
  if (!section) return [];
  return repo.findColumns(section.id);
};

export const getColumnById = async (id: string): Promise<ComparisonColumn> => {
  const section = await requireSection();
  const column = await repo.findColumnById(id);
  if (!column || column.sectionId !== section.id) throw new NotFoundError('Column');
  return column;
};

export const createColumn = async (
  input: CreatePosAlternativesColumnInput,
  context: RequestContext,
): Promise<ComparisonColumn> =>
  withTransaction(async (client) => {
    const section = await ensureSection(client);

    const existing = await repo.countColumns(section.id, client);
    if (existing >= LIMITS.MAX_COMPARISON_COLUMNS) {
      throw new ConflictError(
        `The grid holds at most ${LIMITS.MAX_COMPARISON_COLUMNS} columns before it stops fitting a phone`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextColumnOrder(section.id, client));
    const created = await repo.createColumn(
      section.id,
      {
        name: input.name,
        description: null,
        logoUrl: null,
        logoFileId: null,
        logoAlt: null,
        columnType: input.highlightColumn ? 'OURS' : 'COMPETITOR',
        highlightColumn: input.highlightColumn,
        displayOrder,
        status: input.status,
      },
      context.adminId,
      client,
    );

    // Exactly one column is ours, so highlighting a new one clears the rest.
    if (created.highlightColumn) {
      await repo.clearOtherHighlights(section.id, created.id, context.adminId, client);
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_ALTERNATIVES_COLUMN_CREATED,
        module: MODULE,
        entityType: COLUMN_ENTITY,
        entityId: created.id,
        newValues: { name: created.name, highlight: created.highlightColumn },
      },
      context,
      client,
    );

    return created;
  });

export const updateColumn = async (
  id: string,
  patch: UpdatePosAlternativesColumnInput,
  context: RequestContext,
): Promise<ComparisonColumn> =>
  withTransaction(async (client) => {
    const section = await requireSection(client);
    const existing = await repo.findColumnByIdForUpdate(id, client);
    if (!existing || existing.sectionId !== section.id) throw new NotFoundError('Column');

    const updated = await repo.updateColumn(
      id,
      {
        name: patch.name,
        displayOrder: patch.displayOrder,
        status: patch.status,
        ...(patch.highlightColumn === undefined
          ? {}
          : {
              highlightColumn: patch.highlightColumn,
              // The editorial type follows the highlight, as it does on create.
              columnType: patch.highlightColumn ? ('OURS' as const) : ('COMPETITOR' as const),
            }),
      },
      context.adminId,
      client,
    );
    if (!updated) throw new NotFoundError('Column');

    if (patch.highlightColumn === true) {
      await repo.clearOtherHighlights(section.id, id, context.adminId, client);
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_ALTERNATIVES_COLUMN_UPDATED,
        module: MODULE,
        entityType: COLUMN_ENTITY,
        entityId: id,
        oldValues: { name: existing.name, highlight: existing.highlightColumn },
        newValues: { name: updated.name, highlight: updated.highlightColumn },
      },
      context,
      client,
    );

    return updated;
  });

export const setColumnStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ComparisonColumn> => updateColumn(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorderColumns = async (
  ids: string[],
  context: RequestContext,
): Promise<ComparisonColumn[]> =>
  withTransaction(async (client) => {
    const section = await requireSection(client);
    const columns = await repo.findColumns(section.id, client);

    if (ids.length !== columns.length) {
      throw new ValidationError('The order must list every column', [
        {
          field: 'ids',
          message: `Expected ${columns.length} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }
    const known = new Set(columns.map((column) => column.id));
    if (ids.some((id) => !known.has(id))) {
      throw new ValidationError('The order names a column this grid does not have', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyColumnOrder(section.id, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_ALTERNATIVES_COLUMNS_REORDERED,
        module: MODULE,
        entityType: COLUMN_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    return repo.findColumns(section.id, client);
  });

/** Deleting a column takes its cells with it - the value rows cascade. */
export const removeColumn = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const section = await requireSection(client);
    const existing = await repo.findColumnByIdForUpdate(id, client);
    if (!existing || existing.sectionId !== section.id) throw new NotFoundError('Column');

    await repo.removeColumn(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_ALTERNATIVES_COLUMN_DELETED,
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

// -- the rows ---------------------------------------------------------------

export const listRows = async (): Promise<ResolvedPosAlternativeRow[]> => {
  const section = await repo.findSection(PAGE_KEY, SECTION_KEY);
  if (!section) return [];
  const categoryId = (await repo.findCategories(section.id))[0]?.id;
  if (!categoryId) return [];

  const rows = await repo.findRowsByCategory(categoryId);
  const values = await repo.findValuesForRows(rows.map((row) => row.id));
  return rows.map((row) => attachCells(row, values));
};

export const getRowById = async (id: string): Promise<ResolvedPosAlternativeRow> => {
  const section = await requireSection();
  const row = await repo.findRowById(id);
  if (!row) throw new NotFoundError('Row');

  // The row's category has to belong to this grid, or an id from another
  // page's comparison would resolve here.
  const categories = await repo.findCategories(section.id);
  if (!categories.some((category) => category.id === row.categoryId)) {
    throw new NotFoundError('Row');
  }

  return attachCells(row, await repo.findValuesByRow(id));
};

export const createRow = async (
  input: CreatePosAlternativeRowInput,
  context: RequestContext,
): Promise<ResolvedPosAlternativeRow> =>
  withTransaction(async (client) => {
    const section = await ensureSection(client);
    const categoryId = await ensureCategory(section.id, client);

    const existing = await repo.findRowsByCategory(categoryId, client);
    if (existing.length >= LIMITS.MAX_COMPARISON_ROWS) {
      throw new ConflictError(
        `The grid holds at most ${LIMITS.MAX_COMPARISON_ROWS} rows before it stops being scannable`,
      );
    }

    await assertColumnsExist(
      section.id,
      input.cells.map((cell) => cell.columnId),
      client,
    );

    const displayOrder = input.displayOrder ?? (await repo.nextRowOrder(categoryId, client));
    const created = await repo.createRow(
      categoryId,
      {
        parameter: input.parameter,
        rowType: input.rowType,
        status: input.status,
        displayOrder,
        values: [],
      },
      context.adminId,
      client,
    );

    const values = await repo.replaceValues(
      created.id,
      input.cells.map((cell) => ({
        columnId: cell.columnId,
        content: cell.content,
        rating: cell.rating,
      })),
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_ALTERNATIVES_ROW_CREATED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: created.id,
        newValues: { parameter: created.parameter },
      },
      context,
      client,
    );

    return attachCells(created, values);
  });

export const updateRow = async (
  id: string,
  patch: UpdatePosAlternativeRowInput,
  context: RequestContext,
): Promise<ResolvedPosAlternativeRow> =>
  withTransaction(async (client) => {
    const section = await requireSection(client);
    const existing = await repo.findRowByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Row');

    const categories = await repo.findCategories(section.id, client);
    if (!categories.some((category) => category.id === existing.categoryId)) {
      throw new NotFoundError('Row');
    }

    const updated = await repo.updateRow(
      id,
      {
        parameter: patch.parameter,
        displayOrder: patch.displayOrder,
        status: patch.status,
      },
      context.adminId,
      client,
    );
    if (!updated) throw new NotFoundError('Row');

    let values = await repo.findValuesByRow(id, client);
    if (patch.cells !== undefined) {
      await assertColumnsExist(
        section.id,
        patch.cells.map((cell) => cell.columnId),
        client,
      );
      values = await repo.replaceValues(
        id,
        patch.cells.map((cell) => ({
          columnId: cell.columnId,
          content: cell.content,
          rating: cell.rating,
        })),
        context.adminId,
        client,
      );
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_ALTERNATIVES_ROW_UPDATED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: id,
        oldValues: { parameter: existing.parameter, status: existing.status },
        newValues: { parameter: updated.parameter, status: updated.status },
      },
      context,
      client,
    );

    return attachCells(updated, values);
  });

export const setRowStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedPosAlternativeRow> => updateRow(id, { status }, context);

export const reorderRows = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedPosAlternativeRow[]> =>
  withTransaction(async (client) => {
    const section = await requireSection(client);
    const categoryId = (await repo.findCategories(section.id, client))[0]?.id;
    if (!categoryId) throw new NotFoundError('Comparison grid');

    const rows = await repo.findRowsByCategory(categoryId, client);

    if (ids.length !== rows.length) {
      throw new ValidationError('The order must list every row', [
        {
          field: 'ids',
          message: `Expected ${rows.length} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }
    const known = new Set(rows.map((row) => row.id));
    if (ids.some((id) => !known.has(id))) {
      throw new ValidationError('The order names a row this grid does not have', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyRowOrder(categoryId, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_ALTERNATIVES_ROWS_REORDERED,
        module: MODULE,
        entityType: ROW_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findRowsByCategory(categoryId, client);
    const values = await repo.findValuesForRows(
      reordered.map((row) => row.id),
      client,
    );
    return reordered.map((row) => attachCells(row, values));
  });

export const removeRow = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const section = await requireSection(client);
    const existing = await repo.findRowByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Row');

    const categories = await repo.findCategories(section.id, client);
    if (!categories.some((category) => category.id === existing.categoryId)) {
      throw new NotFoundError('Row');
    }

    await repo.removeRow(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_ALTERNATIVES_ROW_DELETED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: id,
        oldValues: { parameter: existing.parameter },
      },
      context,
      client,
    );
  });
};

// -- the website-facing read ------------------------------------------------

/**
 * The whole grid in one call: the copy, the columns, and the rows with their
 * prose.
 *
 * Flat rather than grouped - the design has no bands, so the one category is
 * unwrapped here.
 *
 * Null when the copy or the section is missing, or when the grid has no live
 * columns or no live rows: the page then keeps the table it ships, which is a
 * complete working one.
 */
export const getPublished = async (): Promise<PublicPosAlternativesSection | null> => {
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
  if (rows.length === 0) return null;

  const values = await repo.findValuesForRows(rows.map((row) => row.id));

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    leaderLabel: section.leaderLabel,
    columns: columns.map((column) => ({
      id: column.id,
      name: column.name,
      highlight: column.highlightColumn,
    })),
    rows: rows.map((row) => ({
      parameter: row.parameter,
      // Keyed by column id so the site pairs cells to headers without knowing
      // what any column is called. A blank cell is absent rather than ''.
      cells: Object.fromEntries(
        values
          .filter((value) => value.rowId === row.id)
          .map((value) => [
            value.columnId,
            { content: value.content, rating: value.rating },
          ]),
      ),
      rowType: row.rowType,
    })),
  };
};
