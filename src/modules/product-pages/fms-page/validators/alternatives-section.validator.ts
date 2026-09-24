// src/modules/product-pages/fms-page/validators/alternatives-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { validator, Validator } from '../../../../core/utils/validation';
import {
  CreateFmsAlternativeRowInput,
  CreateFmsAlternativesColumnInput,
  FmsAlternativeCell,
  ReorderInput,
  UpdateFmsAlternativeRowInput,
  UpdateFmsAlternativesColumnInput,
  UpsertFmsAlternativesSectionInput,
} from '../types/alternatives-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LEADER_LABEL_MAX = 80;
const LEADER_DESCRIPTION_MAX = 300;
const COLUMN_NAME_MAX = 80;
const PARAMETER_MAX = 160;
const CELL_CONTENT_MAX = 400;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Reads the cells a row is submitted with.
 *
 * Cells are not addressed on their own: a row without them is a blank line in
 * the grid, so the whole line arrives together and replaces what was stored.
 * A column left out is cleared, which is how a cell is emptied.
 *
 * Validated by hand rather than through a field helper because the shape is an
 * array of objects, which the validator has no reader for.
 */
function readCells(v: Validator, body: unknown, required: boolean): FmsAlternativeCell[] {
  const raw = (body as { cells?: unknown } | null)?.cells;

  if (raw === undefined) {
    v.custom(!required, 'cells', 'cells is required', 'REQUIRED');
    return [];
  }

  if (!Array.isArray(raw)) {
    v.custom(false, 'cells', 'cells must be an array', 'INVALID_TYPE');
    return [];
  }

  v.custom(
    raw.length <= LIMITS.MAX_COMPARISON_COLUMNS,
    'cells',
    `A row has at most ${LIMITS.MAX_COMPARISON_COLUMNS} cells - one per column`,
    'TOO_MANY',
  );

  const cells: FmsAlternativeCell[] = [];
  const seen = new Set<string>();

  raw.forEach((entry, index) => {
    const cell = entry as { columnId?: unknown; content?: unknown } | null;
    const at = `cells[${index}]`;

    const columnId = typeof cell?.columnId === 'string' ? cell.columnId : '';
    v.custom(UUID_RE.test(columnId), `${at}.columnId`, 'columnId must be a UUID', 'INVALID_UUID');

    // One cell per column: two would race to be the stored value.
    v.custom(
      !seen.has(columnId),
      `${at}.columnId`,
      'Each column may appear only once in a row',
      'DUPLICATE_COLUMN',
    );
    seen.add(columnId);

    const content = typeof cell?.content === 'string' ? cell.content.trim() : '';
    /*
     * Blank is rejected rather than stored: an empty cell is expressed by
     * leaving the column out of the list, and storing '' would put an empty
     * bullet on the live grid.
     */
    v.custom(
      content.length > 0,
      `${at}.content`,
      'content is required - leave the column out to empty the cell',
      'REQUIRED',
    );
    v.custom(
      content.length <= CELL_CONTENT_MAX,
      `${at}.content`,
      `content must be ${CELL_CONTENT_MAX} characters or fewer`,
      'TOO_LONG',
    );

    if (UUID_RE.test(columnId) && content) cells.push({ columnId, content });
  });

  return cells;
}

/** The leader column - the header over the criteria, and its optional note. */
export function validateUpsertFmsAlternativesSection(
  body: unknown,
): UpsertFmsAlternativesSectionInput {
  const v = validator(body);

  const dto: UpsertFmsAlternativesSectionInput = {
    leaderLabel: v.requiredString('leaderLabel', { min: 1, max: LEADER_LABEL_MAX }),
    leaderDescription:
      v.optionalString('leaderDescription', { max: LEADER_DESCRIPTION_MAX }) ?? null,
  };

  v.assert();
  return dto;
}

export function validateCreateFmsAlternativesColumn(
  body: unknown,
): CreateFmsAlternativesColumnInput {
  const v = validator(body);

  const dto: CreateFmsAlternativesColumnInput = {
    name: v.requiredString('name', { min: 1, max: COLUMN_NAME_MAX }),
    highlightColumn: v.optionalBoolean('highlightColumn') ?? false,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateFmsAlternativesColumn(
  body: unknown,
): UpdateFmsAlternativesColumnInput {
  const v = validator(body);

  v.requireAtLeastOne(['name', 'highlightColumn', 'displayOrder', 'status']);

  const dto: UpdateFmsAlternativesColumnInput = {
    name: v.optionalString('name', { min: 1, max: COLUMN_NAME_MAX }),
    highlightColumn: v.optionalBoolean('highlightColumn'),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateCreateFmsAlternativeRow(body: unknown): CreateFmsAlternativeRowInput {
  const v = validator(body);

  const dto: CreateFmsAlternativeRowInput = {
    parameter: v.requiredString('parameter', { min: 2, max: PARAMETER_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
    cells: readCells(v, body, false),
  };

  v.assert();
  return dto;
}

export function validateUpdateFmsAlternativeRow(body: unknown): UpdateFmsAlternativeRowInput {
  const v = validator(body);

  v.requireAtLeastOne(['parameter', 'displayOrder', 'status', 'cells']);

  const hasCells = (body as { cells?: unknown } | null)?.cells !== undefined;

  const dto: UpdateFmsAlternativeRowInput = {
    parameter: v.optionalString('parameter', { min: 2, max: PARAMETER_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
    // Absent leaves the cells alone; present replaces every one of them.
    cells: hasCells ? readCells(v, body, false) : undefined,
  };

  v.assert();
  return dto;
}

export function validateFmsAlternativesStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 *
 * The cap is the larger of the two lists, because one validator serves both
 * columns and rows; each service checks the count it actually holds.
 */
export function validateFmsAlternativesReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', {
    max: Math.max(LIMITS.MAX_COMPARISON_COLUMNS, LIMITS.MAX_COMPARISON_ROWS),
  });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one id', 'REQUIRED');

  // uuidArray dedupes silently, which would turn a duplicated id into a
  // partial reorder. Compare against the raw length to catch it.
  const raw = (body as { ids?: unknown } | null)?.ids;
  v.custom(
    !Array.isArray(raw) || raw.length === ids.length,
    'ids',
    'ids must not contain duplicates',
    'DUPLICATE_IDS',
  );

  v.assert();
  return { ids };
}
