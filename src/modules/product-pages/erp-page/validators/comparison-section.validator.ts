// src/modules/product-pages/erp-page/validators/comparison-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  COMPARISON_COLUMN_TYPES,
  ComparisonColumnType,
  CreateComparisonCategoryInput,
  CreateComparisonColumnInput,
  CreateComparisonRowInput,
  ReorderInput,
  UpdateComparisonCategoryInput,
  UpdateComparisonColumnInput,
  UpdateComparisonRowInput,
  UpsertComparisonSectionInput,
} from '../../shared/comparison/comparison.types';

/** Matched against the source text, so the limits are authoring limits. */
const LEADER_LABEL_MAX = 160;
const LEADER_DESC_MAX = 255;
const NAME_MAX = 160;
const DESCRIPTION_MAX = 255;
const CATEGORY_DESC_MAX = 400;
const PARAMETER_MAX = 255;
const CONTENT_MAX = 400;
const LOGO_URL_MAX = 1000;
const ALT_MAX = 255;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── the section itself ────────────────────────────────────────────────────

export function validateUpsertComparisonSection(body: unknown): UpsertComparisonSectionInput {
  const v = validator(body);

  const dto: UpsertComparisonSectionInput = {
    leaderLabel: v.requiredString('leaderLabel', { min: 2, max: LEADER_LABEL_MAX }),
    leaderDescription: v.optionalString('leaderDescription', { max: LEADER_DESC_MAX }) ?? null,
  };

  v.assert();
  return dto;
}

// ── columns ───────────────────────────────────────────────────────────────

function readColumnType(
  v: Validator,
  required: boolean,
): ComparisonColumnType | undefined {
  if (!required && !v.has('columnType')) return undefined;
  const raw = required
    ? (v.optionalString('columnType', { max: 20 }) ?? 'COMPETITOR')
    : (v.optionalString('columnType', { max: 20 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    (COMPARISON_COLUMN_TYPES as readonly string[]).includes(raw),
    'columnType',
    `columnType must be one of: ${COMPARISON_COLUMN_TYPES.join(', ')}`,
    'INVALID_COLUMN_TYPE',
  );

  return (COMPARISON_COLUMN_TYPES as readonly string[]).includes(raw)
    ? (raw as ComparisonColumnType)
    : undefined;
}

export function validateCreateComparisonColumn(body: unknown): CreateComparisonColumnInput {
  const v = validator(body);

  const logoUrl = v.optionalString('logoUrl', { max: LOGO_URL_MAX }) ?? null;
  if (logoUrl) validateMediaUrl(v, 'logoUrl', logoUrl);
  const logoFileId = v.optionalUuid('logoFileId') ?? null;

  // Mirrors comparison_columns_single_logo_source_check. Neither is allowed:
  // the header is text today and reads perfectly without a wordmark.
  v.custom(
    logoUrl === null || logoFileId === null,
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: CreateComparisonColumnInput = {
    name: v.requiredString('name', { min: 1, max: NAME_MAX }),
    description: v.optionalString('description', { max: DESCRIPTION_MAX }) ?? null,
    logoUrl,
    logoFileId,
    logoAlt: v.optionalString('logoAlt', { max: ALT_MAX }) ?? null,
    columnType: readColumnType(v, true) ?? 'COMPETITOR',
    highlightColumn: v.optionalBoolean('highlightColumn') ?? false,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateComparisonColumn(body: unknown): UpdateComparisonColumnInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'name',
    'description',
    'logoUrl',
    'logoFileId',
    'logoAlt',
    'columnType',
    'highlightColumn',
    'displayOrder',
    'status',
  ]);

  // `null` clears the field; `undefined` (absent) leaves it alone.
  const logoUrl = v.has('logoUrl')
    ? (v.optionalString('logoUrl', { max: LOGO_URL_MAX }) ?? null)
    : undefined;
  if (logoUrl) validateMediaUrl(v, 'logoUrl', logoUrl);
  const logoFileId = v.has('logoFileId') ? (v.optionalUuid('logoFileId') ?? null) : undefined;

  v.custom(
    !(logoUrl && logoFileId),
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateComparisonColumnInput = {
    name: v.has('name') ? v.requiredString('name', { min: 1, max: NAME_MAX }) : undefined,
    description: v.has('description')
      ? (v.optionalString('description', { max: DESCRIPTION_MAX }) ?? null)
      : undefined,
    logoUrl,
    logoFileId,
    logoAlt: v.has('logoAlt')
      ? (v.optionalString('logoAlt', { max: ALT_MAX }) ?? null)
      : undefined,
    columnType: readColumnType(v, false),
    highlightColumn: v.has('highlightColumn')
      ? (v.optionalBoolean('highlightColumn') ?? false)
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── categories ────────────────────────────────────────────────────────────

export function validateCreateComparisonCategory(body: unknown): CreateComparisonCategoryInput {
  const v = validator(body);

  const dto: CreateComparisonCategoryInput = {
    name: v.requiredString('name', { min: 2, max: NAME_MAX }),
    description: v.optionalString('description', { max: CATEGORY_DESC_MAX }) ?? null,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateComparisonCategory(body: unknown): UpdateComparisonCategoryInput {
  const v = validator(body);

  v.requireAtLeastOne(['name', 'description', 'displayOrder', 'status']);

  const dto: UpdateComparisonCategoryInput = {
    name: v.has('name') ? v.requiredString('name', { min: 2, max: NAME_MAX }) : undefined,
    description: v.has('description')
      ? (v.optionalString('description', { max: CATEGORY_DESC_MAX }) ?? null)
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── rows, with their cells ────────────────────────────────────────────────

/**
 * Reads the cells posted with a row.
 *
 * A cell is `{ columnId, content }`. The columns themselves are checked in the
 * service, which can see which ones belong to this grid - here the shape and
 * the limits are checked, and a column named twice is rejected, because two
 * answers for the same question is a mistake rather than a merge.
 */
function readValues(
  v: Validator,
  body: unknown,
  required: boolean,
): Array<{ columnId: string; content: string }> | undefined {
  const raw = (body as { values?: unknown } | null)?.values;

  if (raw === undefined) {
    if (required) {
      v.custom(false, 'values', 'values is required', 'REQUIRED');
      return [];
    }
    return undefined;
  }

  if (!Array.isArray(raw)) {
    v.custom(false, 'values', 'values must be an array of { columnId, content }', 'INVALID_TYPE');
    return [];
  }

  if (raw.length > LIMITS.MAX_COMPARISON_COLUMNS) {
    v.custom(
      false,
      'values',
      `values may name at most ${LIMITS.MAX_COMPARISON_COLUMNS} columns`,
      'TOO_MANY',
    );
    return [];
  }

  const seen = new Set<string>();
  const cells: Array<{ columnId: string; content: string }> = [];

  raw.forEach((entry, index) => {
    const cell = entry as { columnId?: unknown; content?: unknown } | null;
    const columnId = typeof cell?.columnId === 'string' ? cell.columnId.trim() : '';
    const content = typeof cell?.content === 'string' ? cell.content.trim() : '';

    if (!UUID_PATTERN.test(columnId)) {
      v.custom(false, `values[${index}].columnId`, 'columnId must be a UUID', 'INVALID_UUID');
      return;
    }
    if (seen.has(columnId)) {
      v.custom(
        false,
        `values[${index}].columnId`,
        'Each column may appear only once',
        'DUPLICATE_COLUMN',
      );
      return;
    }
    seen.add(columnId);

    // An empty cell is how a column is left blank, so it is dropped rather
    // than stored - the CHECK would reject it, and a blank row is legitimate.
    if (!content) return;

    if (content.length > CONTENT_MAX) {
      v.custom(
        false,
        `values[${index}].content`,
        `content must be ${CONTENT_MAX} characters or fewer (currently ${content.length})`,
        'TOO_LONG',
      );
      return;
    }

    cells.push({ columnId, content });
  });

  return cells;
}

export function validateCreateComparisonRow(body: unknown): CreateComparisonRowInput {
  const v = validator(body);

  const dto: CreateComparisonRowInput = {
    parameter: v.requiredString('parameter', { min: 2, max: PARAMETER_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
    values: readValues(v, body, false) ?? [],
  };

  v.assert();
  return dto;
}

export function validateUpdateComparisonRow(body: unknown): UpdateComparisonRowInput {
  const v = validator(body);

  v.requireAtLeastOne(['parameter', 'displayOrder', 'status', 'values']);

  const dto: UpdateComparisonRowInput = {
    parameter: v.has('parameter')
      ? v.requiredString('parameter', { min: 2, max: PARAMETER_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
    values: readValues(v, body, false),
  };

  v.assert();
  return dto;
}

// ── shared ────────────────────────────────────────────────────────────────

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 *
 * The cap is the largest of the three lists, because one validator serves all
 * of them; each service checks the count it actually holds.
 */
export function validateComparisonReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', {
    max: Math.max(
      LIMITS.MAX_COMPARISON_COLUMNS,
      LIMITS.MAX_COMPARISON_CATEGORIES,
      LIMITS.MAX_COMPARISON_ROWS,
    ),
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
