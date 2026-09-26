// src/modules/product-pages/hreasy-page/validators/alternatives-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { validator, Validator } from '../../../../core/utils/validation';
import {
  CreateHreasyAlternativeRowInput,
  CreateHreasyAlternativesColumnInput,
  HreasyAlternativeCell,
  ReorderInput,
  UpdateHreasyAlternativeRowInput,
  UpdateHreasyAlternativesColumnInput,
  UpsertHreasyAlternativesSectionInput,
} from '../types/alternatives-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LEADER_LABEL_MAX = 80;
const LEADER_DESCRIPTION_MAX = 300;
const COLUMN_NAME_MAX = 80;
const COLUMN_DESCRIPTION_MAX = 160;
const PARAMETER_MAX = 160;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Reads the cells a row is submitted with.
 *
 * Cells are not addressed on their own: a row without them is a blank line in
 * the grid, so the whole line arrives together and replaces what was stored.
 * A column left out is cleared, which is how a cell is emptied.
 *
 * Validated by hand rather than through a field helper because the shape is
 * an array of objects, which the validator has no reader for.
 */
function readCells(v: Validator, body: unknown, required: boolean): HreasyAlternativeCell[] {
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

  const cells: HreasyAlternativeCell[] = [];
  const seen = new Set<string>();

  raw.forEach((entry, index) => {
    const cell = entry as { columnId?: unknown; flag?: unknown } | null;
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

    /*
     * A boolean, and nothing else. `false` is a real answer - the cross - so
     * it cannot be treated as missing; anything that is not a boolean is a
     * malformed cell rather than an empty one.
     *
     * An empty cell is expressed by leaving the column out of the list, the
     * same as on the grids that hold prose.
     */
    const flag = cell?.flag;
    v.custom(
      typeof flag === 'boolean',
      `${at}.flag`,
      'flag must be true (a tick) or false (a cross) - leave the column out to empty the cell',
      'REQUIRED',
    );

    if (UUID_RE.test(columnId) && typeof flag === 'boolean') {
      cells.push({ columnId, flag });
    }
  });

  return cells;
}

/** The leader column - the header over the criteria, and its optional note. */
export function validateUpsertHreasyAlternativesSection(
  body: unknown,
): UpsertHreasyAlternativesSectionInput {
  const v = validator(body);

  const dto: UpsertHreasyAlternativesSectionInput = {
    leaderLabel: v.requiredString('leaderLabel', { min: 1, max: LEADER_LABEL_MAX }),
    leaderDescription:
      v.optionalString('leaderDescription', { max: LEADER_DESCRIPTION_MAX }) ?? null,
  };

  v.assert();
  return dto;
}

export function validateCreateHreasyAlternativesColumn(
  body: unknown,
): CreateHreasyAlternativesColumnInput {
  const v = validator(body);

  const dto: CreateHreasyAlternativesColumnInput = {
    name: v.requiredString('name', { min: 1, max: COLUMN_NAME_MAX }),
    description: v.optionalString('description', { max: COLUMN_DESCRIPTION_MAX }) ?? null,
    highlightColumn: v.optionalBoolean('highlightColumn') ?? false,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateHreasyAlternativesColumn(
  body: unknown,
): UpdateHreasyAlternativesColumnInput {
  const v = validator(body);

  v.requireAtLeastOne(['name', 'description', 'highlightColumn', 'displayOrder', 'status']);

  const dto: UpdateHreasyAlternativesColumnInput = {
    name: v.optionalString('name', { min: 1, max: COLUMN_NAME_MAX }),
    // `null` clears the small line under the name; absent leaves it alone.
    description: v.has('description')
      ? (v.optionalString('description', { max: COLUMN_DESCRIPTION_MAX }) ?? null)
      : undefined,
    highlightColumn: v.optionalBoolean('highlightColumn'),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateCreateHreasyAlternativeRow(
  body: unknown,
): CreateHreasyAlternativeRowInput {
  const v = validator(body);

  const dto: CreateHreasyAlternativeRowInput = {
    parameter: v.requiredString('parameter', { min: 2, max: PARAMETER_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
    cells: readCells(v, body, false),
  };

  v.assert();
  return dto;
}

export function validateUpdateHreasyAlternativeRow(
  body: unknown,
): UpdateHreasyAlternativeRowInput {
  const v = validator(body);

  v.requireAtLeastOne(['parameter', 'displayOrder', 'status', 'cells']);

  const hasCells = (body as { cells?: unknown } | null)?.cells !== undefined;

  const dto: UpdateHreasyAlternativeRowInput = {
    parameter: v.optionalString('parameter', { min: 2, max: PARAMETER_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
    // Absent leaves the cells alone; present replaces every one of them.
    cells: hasCells ? readCells(v, body, false) : undefined,
  };

  v.assert();
  return dto;
}

export function validateHreasyAlternativesStatusBody(body: unknown): {
  status: ContentStatus;
} {
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
export function validateHreasyAlternativesReorder(body: unknown): ReorderInput {
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
