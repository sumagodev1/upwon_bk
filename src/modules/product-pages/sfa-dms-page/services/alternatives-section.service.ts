// src/modules/product-pages/sfa-dms-page/services/alternatives-section.service.ts

import { Executor, withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
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
  CreateSfaCapabilityRowInput,
  PublicSfaAlternativesSection,
  UpdateSfaCapabilityRowInput,
  UpsertSfaSummaryRowInput,
} from '../types/alternatives-section.types';

const MODULE = 'sfa_dms_page';
const SECTION_ENTITY = 'comparison_section';
const COLUMN_ENTITY = 'comparison_column';
const ROW_ENTITY = 'comparison_row';

/**
 * The SFA-DMS page's grid. The tables carry no page in their names, so the one
 * place that says which grid this module edits is here.
 */
const PAGE_KEY = 'sfa-dms';
const SECTION_KEY = 'alternatives';

/**
 * The band every row belongs to.
 *
 * This design has no bands - it is a flat list of capabilities - but a row
 * must belong to a category, so the section keeps exactly one and no screen
 * surfaces it. Created on demand, so a first-run grid needs no seeding step.
 */
const CATEGORY_NAME = 'Capabilities';

/** The closing row's shape, which is what separates it from a capability. */
const SUMMARY = 'SUMMARY' as const;

// ── the section and its one band ──────────────────────────────────────────

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

export const getSection = async (): Promise<ComparisonSection | null> =>
  repo.findSection(PAGE_KEY, SECTION_KEY);

export const upsertSection = async (
  input: { leaderLabel: string; leaderDescription: string | null },
  context: RequestContext,
): Promise<ComparisonSection> =>
  withTransaction(async (client) => {
    const existing = await repo.findSection(PAGE_KEY, SECTION_KEY, client);

    /*
     * cellType is passed only when the section is new. An ordinary edit of the
     * leader column leaves it alone, so the grid cannot be flipped to prose
     * with every stored score still in place.
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
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_SECTION_UPDATED,
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

// ── the columns ───────────────────────────────────────────────────────────

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
  input: {
    name: string;
    highlightColumn: boolean;
    displayOrder?: number;
    status: ContentStatus;
  },
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
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_COLUMN_CREATED,
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
  input: {
    name: string;
    highlightColumn: boolean;
    displayOrder?: number;
    status: ContentStatus;
  },
  context: RequestContext,
): Promise<ComparisonColumn> =>
  withTransaction(async (client) => {
    const section = await requireSection(client);
    const existing = await repo.findColumnByIdForUpdate(id, client);
    if (!existing || existing.sectionId !== section.id) throw new NotFoundError('Column');

    const updated = await repo.updateColumn(
      id,
      {
        name: input.name,
        columnType: input.highlightColumn ? 'OURS' : 'COMPETITOR',
        highlightColumn: input.highlightColumn,
        displayOrder: input.displayOrder,
        status: input.status,
      },
      context.adminId,
      client,
    );
    if (!updated) throw new NotFoundError('Column');

    if (updated.highlightColumn) {
      await repo.clearOtherHighlights(section.id, updated.id, context.adminId, client);
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_COLUMN_UPDATED,
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
    const known = new Set(columns.map((c) => c.id));
    if (ids.some((id) => !known.has(id))) {
      throw new ValidationError('The order names a column this grid does not have', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyColumnOrder(section.id, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_COLUMNS_REORDERED,
        module: MODULE,
        entityType: COLUMN_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    return repo.findColumns(section.id, client);
  });

/** Deleting a column takes its cells with it - comparison_values cascades. */
export const removeColumn = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const section = await requireSection(client);
    const existing = await repo.findColumnByIdForUpdate(id, client);
    if (!existing || existing.sectionId !== section.id) throw new NotFoundError('Column');

    await repo.removeColumn(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_COLUMN_DELETED,
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

// ── the capability rows ───────────────────────────────────────────────────

/** A row with its scores attached, keyed by column id. */
export interface ResolvedCapabilityRow extends ComparisonRow {
  ratings: Record<string, number>;
}

const attachRatings = (row: ComparisonRow, values: ComparisonValue[]): ResolvedCapabilityRow => {
  const ratings: Record<string, number> = {};
  for (const value of values) {
    if (value.rowId !== row.id || value.rating === null) continue;
    ratings[value.columnId] = value.rating;
  }
  return { ...row, ratings };
};

/** The capability rows only - the closing summary has its own endpoint. */
const capabilityRows = (rows: ComparisonRow[]): ComparisonRow[] =>
  rows.filter((row) => row.rowType !== SUMMARY);

export const listRows = async (
  _filters: { status?: ContentStatus },
  _pagination: PaginationParams,
): Promise<ResolvedCapabilityRow[]> => {
  const section = await repo.findSection(PAGE_KEY, SECTION_KEY);
  if (!section) return [];
  const categoryId = (await repo.findCategories(section.id))[0]?.id;
  if (!categoryId) return [];

  const rows = capabilityRows(await repo.findRowsByCategory(categoryId));
  const values = await repo.findValuesForRows(rows.map((r) => r.id));
  return rows.map((row) => attachRatings(row, values));
};

export const getRowById = async (id: string): Promise<ResolvedCapabilityRow> => {
  const row = await repo.findRowById(id);
  if (!row || row.rowType === SUMMARY) throw new NotFoundError('Capability');
  const values = await repo.findValuesByRow(id);
  return attachRatings(row, values);
};

export const createRow = async (
  input: CreateSfaCapabilityRowInput,
  context: RequestContext,
): Promise<ResolvedCapabilityRow> =>
  withTransaction(async (client) => {
    const section = await ensureSection(client);
    const categoryId = await ensureCategory(section.id, client);

    const existing = capabilityRows(await repo.findRowsByCategory(categoryId, client));
    if (existing.length >= LIMITS.MAX_COMPARISON_ROWS) {
      throw new ConflictError(
        `The grid holds at most ${LIMITS.MAX_COMPARISON_ROWS} capabilities before it stops being scannable`,
      );
    }

    await assertColumnsExist(
      section.id,
      input.ratings.map((r) => r.columnId),
      client,
    );

    const displayOrder = input.displayOrder ?? (await repo.nextRowOrder(categoryId, client));
    const created = await repo.createRow(
      categoryId,
      { parameter: input.parameter, status: input.status, displayOrder, values: [] },
      context.adminId,
      client,
    );

    const values = await repo.replaceValues(
      created.id,
      input.ratings.map((r) => ({ columnId: r.columnId, rating: r.rating })),
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_ROW_CREATED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: created.id,
        newValues: { parameter: created.parameter },
      },
      context,
      client,
    );

    return attachRatings(created, values);
  });

export const updateRow = async (
  id: string,
  patch: UpdateSfaCapabilityRowInput,
  context: RequestContext,
): Promise<ResolvedCapabilityRow> =>
  withTransaction(async (client) => {
    const section = await requireSection(client);
    const existing = await repo.findRowByIdForUpdate(id, client);
    if (!existing || existing.rowType === SUMMARY) throw new NotFoundError('Capability');

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
    if (!updated) throw new NotFoundError('Capability');

    let values = await repo.findValuesByRow(id, client);
    if (patch.ratings !== undefined) {
      await assertColumnsExist(
        section.id,
        patch.ratings.map((r) => r.columnId),
        client,
      );
      values = await repo.replaceValues(
        id,
        patch.ratings.map((r) => ({ columnId: r.columnId, rating: r.rating })),
        context.adminId,
        client,
      );
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_ROW_UPDATED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: id,
        oldValues: { parameter: existing.parameter, status: existing.status },
        newValues: { parameter: updated.parameter, status: updated.status },
      },
      context,
      client,
    );

    return attachRatings(updated, values);
  });

export const setRowStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedCapabilityRow> => updateRow(id, { status }, context);

export const reorderRows = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedCapabilityRow[]> =>
  withTransaction(async (client) => {
    const section = await requireSection(client);
    const categoryId = (await repo.findCategories(section.id, client))[0]?.id;
    if (!categoryId) throw new NotFoundError('Comparison grid');

    const rows = capabilityRows(await repo.findRowsByCategory(categoryId, client));

    if (ids.length !== rows.length) {
      throw new ValidationError('The order must list every capability', [
        {
          field: 'ids',
          message: `Expected ${rows.length} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }
    const known = new Set(rows.map((r) => r.id));
    if (ids.some((id) => !known.has(id))) {
      throw new ValidationError('The order names a capability this grid does not have', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyRowOrder(categoryId, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_ROWS_REORDERED,
        module: MODULE,
        entityType: ROW_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = capabilityRows(await repo.findRowsByCategory(categoryId, client));
    const values = await repo.findValuesForRows(reordered.map((r) => r.id), client);
    return reordered.map((row) => attachRatings(row, values));
  });

export const removeRow = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findRowByIdForUpdate(id, client);
    if (!existing || existing.rowType === SUMMARY) throw new NotFoundError('Capability');

    await repo.removeRow(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_ROW_DELETED,
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

/**
 * Rejects a cell naming a column this grid does not have.
 *
 * The database would let it through - comparison_values references any column -
 * so without this a typo could file a score against the ERP grid's column and
 * it would simply never render.
 */
const assertColumnsExist = async (
  sectionId: string,
  columnIds: string[],
  executor: Executor,
): Promise<void> => {
  if (columnIds.length === 0) return;
  const columns = await repo.findColumns(sectionId, executor);
  const known = new Set(columns.map((c) => c.id));
  const unknown = columnIds.filter((id) => !known.has(id));
  if (unknown.length === 0) return;

  throw new ValidationError('A score names a column this grid does not have', [
    {
      field: 'ratings',
      message: `Unknown column ids: ${unknown.join(', ')}`,
      code: 'UNKNOWN_COLUMN',
    },
  ]);
};

// ── the closing summary row ───────────────────────────────────────────────

/** The summary row with its badges attached, or null when none is authored. */
export interface ResolvedSummaryRow {
  id: string;
  parameter: string;
  cells: Record<string, { label: string; tone: 'BEST' | 'GOOD' | 'NEUTRAL' }>;
}

const toSummary = (row: ComparisonRow, values: ComparisonValue[]): ResolvedSummaryRow => {
  const cells: ResolvedSummaryRow['cells'] = {};
  for (const value of values) {
    if (value.rowId !== row.id || value.content === null || value.tone === null) continue;
    cells[value.columnId] = { label: value.content, tone: value.tone };
  }
  return { id: row.id, parameter: row.parameter, cells };
};

const findSummaryRow = async (
  executor?: Executor,
): Promise<ComparisonRow | null> => {
  const section = await repo.findSection(PAGE_KEY, SECTION_KEY, executor);
  if (!section) return null;
  const categoryId = (await repo.findCategories(section.id, executor))[0]?.id;
  if (!categoryId) return null;

  const rows = await repo.findRowsByCategory(categoryId, executor);
  return rows.find((row) => row.rowType === SUMMARY) ?? null;
};

export const getSummary = async (): Promise<ResolvedSummaryRow | null> => {
  const row = await findSummaryRow();
  if (!row) return null;
  return toSummary(row, await repo.findValuesByRow(row.id));
};

/**
 * Writes the closing row.
 *
 * One row, created on first save and replaced after: a grid has one closing
 * line, so there is nothing to list and no id for the caller to carry.
 */
export const upsertSummary = async (
  input: UpsertSfaSummaryRowInput,
  context: RequestContext,
): Promise<ResolvedSummaryRow> =>
  withTransaction(async (client) => {
    const section = await ensureSection(client);
    const categoryId = await ensureCategory(section.id, client);

    await assertColumnsExist(
      section.id,
      input.cells.map((c) => c.columnId),
      client,
    );

    let row = await findSummaryRow(client);
    if (row) {
      const updated = await repo.updateRow(
        row.id,
        { parameter: input.parameter },
        context.adminId,
        client,
      );
      if (!updated) throw new NotFoundError('Summary row');
      row = updated;
    } else {
      /*
       * Ordered last on purpose, and kept there: the closing line is drawn
       * under the capabilities whatever their order, so it takes an order
       * beyond any of them rather than joining the reorder list.
       */
      row = await repo.createRow(
        categoryId,
        {
          parameter: input.parameter,
          rowType: SUMMARY,
          status: 'ACTIVE',
          displayOrder: 9999,
          values: [],
        },
        context.adminId,
        client,
      );
    }

    const values = await repo.replaceValues(
      row.id,
      input.cells.map((c) => ({ columnId: c.columnId, content: c.label, tone: c.tone })),
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_SUMMARY_UPDATED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: row.id,
        newValues: { parameter: row.parameter },
      },
      context,
      client,
    );

    return toSummary(row, values);
  });

export const removeSummary = async (context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const row = await findSummaryRow(client);
    if (!row) throw new NotFoundError('Summary row');

    await repo.removeRow(row.id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SFA_ALTERNATIVES_SUMMARY_DELETED,
        module: MODULE,
        entityType: ROW_ENTITY,
        entityId: row.id,
        oldValues: { parameter: row.parameter },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole grid in one call: the copy, the columns, the capability rows with
 * their scores, and the closing summary.
 *
 * Flat rather than grouped - the design has no bands, so the one category is
 * unwrapped here.
 *
 * Null when the copy or the section is missing, or when the grid has no live
 * columns or no live capabilities: the page then keeps the table it ships,
 * which is a complete working one.
 */
export const getPublished = async (): Promise<PublicSfaAlternativesSection | null> => {
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

  const allRows = await repo.findActiveRowsForCategories(categories.map((c) => c.id));
  const values = await repo.findValuesForRows(allRows.map((r) => r.id));

  const rows = allRows.filter((row) => row.rowType !== SUMMARY);
  if (rows.length === 0) return null;

  const summaryRow = allRows.find((row) => row.rowType === SUMMARY) ?? null;

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
      ratings: attachRatings(row, values).ratings,
    })),
    summary: summaryRow
      ? {
          parameter: summaryRow.parameter,
          cells: toSummary(summaryRow, values).cells,
        }
      : null,
  };
};
