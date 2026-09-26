// src/modules/product-pages/pos-page/validators/recognition-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { POS_ICON_NAMES, PosIconName, isPosIconName } from '../utils/icons';
import {
  CreatePosRecognitionCategoryInput,
  PosRecognitionCategoryFilters,
  ReorderInput,
  UpdatePosRecognitionCategoryInput,
} from '../types/recognition-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const TITLE_MAX = 160;
const DESCRIPTION_MAX = 240;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render a question mark on the live page - the site
 * maps names to components through a fixed lookup - so this is the one place
 * that can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, required: boolean): PosIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isPosIconName(raw),
    'icon',
    `icon must be one of the available icons: ${POS_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isPosIconName(raw) ? raw : undefined;
}

export function validateCreatePosRecognitionCategory(
  body: unknown,
): CreatePosRecognitionCategoryInput {
  const v = validator(body);

  const dto: CreatePosRecognitionCategoryInput = {
    icon: readIcon(v, true) as PosIconName,
    title: v.requiredString('title', { min: 2, max: TITLE_MAX }),
    /*
     * Required: a card is an icon, a name and a line saying what this page
     * does for that counter. Without the line it is a label floating in a box,
     * and the grid gives it the same height as its neighbours regardless.
     */
    description: v.requiredString('description', { min: 2, max: DESCRIPTION_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdatePosRecognitionCategory(
  body: unknown,
): UpdatePosRecognitionCategoryInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'title', 'description', 'displayOrder', 'status']);

  const dto: UpdatePosRecognitionCategoryInput = {
    icon: readIcon(v, false),
    title: v.has('title') ? v.requiredString('title', { min: 2, max: TITLE_MAX }) : undefined,
    description: v.has('description')
      ? v.requiredString('description', { min: 2, max: DESCRIPTION_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validatePosRecognitionCategoryListQuery(query: Record<string, unknown>): {
  filters: PosRecognitionCategoryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: PosRecognitionCategoryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validatePosRecognitionStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validatePosRecognitionCategoryReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_POS_RECOGNITION_CATEGORIES });

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
