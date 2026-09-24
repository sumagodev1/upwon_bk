// src/modules/product-pages/sfa-dms-page/validators/alternatives-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import {
  COMPARISON_TONES,
  ComparisonTone,
} from '../../shared/comparison/comparison.types';
import {
  CreateSfaCapabilityRowInput,
  SfaRatingCellInput,
  SfaSummaryCellInput,
  UpdateSfaCapabilityRowInput,
  UpsertSfaSummaryRowInput,
} from '../types/alternatives-section.types';
import { ReorderInput } from '../types/proof-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const PARAMETER_MAX = 255;
const LEADER_LABEL_MAX = 160;
const LEADER_DESCRIPTION_MAX = 255;
const COLUMN_NAME_MAX = 160;
const SUMMARY_LABEL_MAX = 40;

/** The grid draws five stars, and zero is the dash. */
const RATING_MIN = 0;
const RATING_MAX = 5;

// ── the leader column ─────────────────────────────────────────────────────

export function validateUpsertSfaAlternativesSection(body: unknown): {
  leaderLabel: string;
  leaderDescription: string | null;
} {
  const v = validator(body);

  const dto = {
    leaderLabel: v.requiredString('leaderLabel', { min: 2, max: LEADER_LABEL_MAX }),
    leaderDescription:
      v.optionalString('leaderDescription', { max: LEADER_DESCRIPTION_MAX }) ?? null,
  };

  v.assert();
  return dto;
}

// ── the columns ───────────────────────────────────────────────────────────

export function validateSfaAlternativesColumn(body: unknown): {
  name: string;
  highlightColumn: boolean;
  displayOrder?: number;
  status: ContentStatus;
} {
  const v = validator(body);

  const dto = {
    name: v.requiredString('name', { min: 1, max: COLUMN_NAME_MAX }),
    /*
     * Which column is ours, drawn in orange. Exactly one is highlighted at a
     * time; the service clears the others rather than refusing the save, so
     * switching which product the grid favours is one edit rather than two.
     */
    highlightColumn: v.optionalBoolean('highlightColumn') ?? false,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

// ── the capability rows ───────────────────────────────────────────────────

/**
 * Reads the per-column scores.
 *
 * A column left out is a column with no cell, which the grid draws as the dash
 * - the same as an explicit zero. Both are allowed, because "we did not rate
 * this" and "this is not available" are the same claim to a reader and forcing
 * a number for every column would be busywork on a grid that grows a column at
 * a time.
 */
function readRatings(
  v: Validator,
  body: unknown,
  required: boolean,
): SfaRatingCellInput[] | undefined {
  const raw = (body as { ratings?: unknown } | null)?.ratings;

  if (raw === undefined || raw === null) {
    if (required) {
      v.custom(false, 'ratings', 'ratings is required', 'REQUIRED');
      return [];
    }
    return undefined;
  }

  if (!Array.isArray(raw)) {
    v.custom(false, 'ratings', 'ratings must be an array of { columnId, rating }', 'INVALID_TYPE');
    return [];
  }
  if (raw.length > LIMITS.MAX_COMPARISON_COLUMNS) {
    v.custom(
      false,
      'ratings',
      `ratings must not name more than ${LIMITS.MAX_COMPARISON_COLUMNS} columns`,
      'TOO_MANY',
    );
    return [];
  }

  const cells: SfaRatingCellInput[] = [];
  const seen = new Set<string>();

  raw.forEach((entry, index) => {
    const cell = entry as { columnId?: unknown; rating?: unknown } | null;
    const columnId = typeof cell?.columnId === 'string' ? cell.columnId.trim() : '';

    if (!columnId) {
      v.custom(false, `ratings[${index}].columnId`, 'columnId is required', 'REQUIRED');
      return;
    }
    if (seen.has(columnId)) {
      v.custom(
        false,
        `ratings[${index}].columnId`,
        'the same column is scored twice',
        'DUPLICATE_COLUMN',
      );
      return;
    }
    seen.add(columnId);

    const rating = cell?.rating;
    if (
      typeof rating !== 'number' ||
      !Number.isInteger(rating) ||
      rating < RATING_MIN ||
      rating > RATING_MAX
    ) {
      v.custom(
        false,
        `ratings[${index}].rating`,
        `rating must be a whole number from ${RATING_MIN} to ${RATING_MAX}`,
        'INVALID_RATING',
      );
      return;
    }

    cells.push({ columnId, rating });
  });

  return cells;
}

export function validateCreateSfaCapabilityRow(body: unknown): CreateSfaCapabilityRowInput {
  const v = validator(body);

  const dto: CreateSfaCapabilityRowInput = {
    parameter: v.requiredString('parameter', { min: 2, max: PARAMETER_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
    ratings: readRatings(v, body, false) ?? [],
  };

  v.assert();
  return dto;
}

export function validateUpdateSfaCapabilityRow(body: unknown): UpdateSfaCapabilityRowInput {
  const v = validator(body);

  v.requireAtLeastOne(['parameter', 'ratings', 'displayOrder', 'status']);

  const dto: UpdateSfaCapabilityRowInput = {
    parameter: v.has('parameter')
      ? v.requiredString('parameter', { min: 2, max: PARAMETER_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
    ratings: readRatings(v, body, false),
  };

  v.assert();
  return dto;
}

// ── the closing summary row ───────────────────────────────────────────────

export function validateUpsertSfaSummaryRow(body: unknown): UpsertSfaSummaryRowInput {
  const v = validator(body);

  const parameter = v.requiredString('parameter', { min: 2, max: PARAMETER_MAX });

  const raw = (body as { cells?: unknown } | null)?.cells;
  const cells: SfaSummaryCellInput[] = [];

  if (raw !== undefined && raw !== null) {
    if (!Array.isArray(raw)) {
      v.custom(false, 'cells', 'cells must be an array of { columnId, label, tone }', 'INVALID_TYPE');
    } else if (raw.length > LIMITS.MAX_COMPARISON_COLUMNS) {
      v.custom(
        false,
        'cells',
        `cells must not name more than ${LIMITS.MAX_COMPARISON_COLUMNS} columns`,
        'TOO_MANY',
      );
    } else {
      const seen = new Set<string>();
      raw.forEach((entry, index) => {
        const cell = entry as
          | { columnId?: unknown; label?: unknown; tone?: unknown }
          | null;
        const columnId = typeof cell?.columnId === 'string' ? cell.columnId.trim() : '';
        const label = typeof cell?.label === 'string' ? cell.label.trim() : '';
        const tone = typeof cell?.tone === 'string' ? cell.tone.trim() : '';

        if (!columnId) {
          v.custom(false, `cells[${index}].columnId`, 'columnId is required', 'REQUIRED');
          return;
        }
        if (seen.has(columnId)) {
          v.custom(
            false,
            `cells[${index}].columnId`,
            'the same column is filled twice',
            'DUPLICATE_COLUMN',
          );
          return;
        }
        seen.add(columnId);

        // A column left out is a column with no badge, which the grid draws as
        // a dash. An empty label is the same intent, so it is dropped rather
        // than saved as a blank badge.
        if (!label) return;

        if (label.length > SUMMARY_LABEL_MAX) {
          v.custom(
            false,
            `cells[${index}].label`,
            `label must be ${SUMMARY_LABEL_MAX} characters or fewer (currently ${label.length})`,
            'TOO_LONG',
          );
          return;
        }
        if (!(COMPARISON_TONES as readonly string[]).includes(tone)) {
          v.custom(
            false,
            `cells[${index}].tone`,
            `tone must be one of: ${COMPARISON_TONES.join(', ')}`,
            'INVALID_TONE',
          );
          return;
        }

        cells.push({ columnId, label, tone: tone as ComparisonTone });
      });
    }
  }

  v.assert();
  return { parameter, cells };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateSfaAlternativesStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

export function validateSfaAlternativesListQuery(query: Record<string, unknown>): {
  filters: { status?: ContentStatus };
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
function validateReorder(body: unknown, max: number): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max });

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

export const validateSfaAlternativesColumnReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_COMPARISON_COLUMNS);

export const validateSfaCapabilityRowReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_COMPARISON_ROWS);
