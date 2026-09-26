// src/modules/industry-pages/beverage-page/validators/coverage-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { BEVERAGE_ICON_NAMES, BeverageIconName, isBeverageIconName } from '../utils/icons';
import {
  BeverageCoverageCategoryFilters,
  CreateBeverageCoverageCategoryInput,
  ReorderBeverageCoverageCategoriesInput,
  UpdateBeverageCoverageCategoryInput,
} from '../types/coverage-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LABEL_MAX = 120;
const DETAIL_MAX = 300;

/** An unknown name would render a question mark on the live page. */
function readIcon(v: Validator, required: boolean): BeverageIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isBeverageIconName(raw),
    'icon',
    `icon must be one of the available icons: ${BEVERAGE_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isBeverageIconName(raw) ? raw : undefined;
}

export function validateCreateBeverageCoverageCategory(
  body: unknown,
): CreateBeverageCoverageCategoryInput {
  const v = validator(body);

  const dto: CreateBeverageCoverageCategoryInput = {
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    detail: v.requiredString('detail', { min: 3, max: DETAIL_MAX }),
    icon: readIcon(v, true) as BeverageIconName,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateBeverageCoverageCategory(
  body: unknown,
): UpdateBeverageCoverageCategoryInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'detail', 'icon', 'displayOrder', 'status']);

  const dto: UpdateBeverageCoverageCategoryInput = {
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    detail: v.has('detail') ? v.requiredString('detail', { min: 3, max: DETAIL_MAX }) : undefined,
    icon: readIcon(v, false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateBeverageCoverageCategoryStatus(body: unknown): {
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
 */
export function validateReorderBeverageCoverageCategories(
  body: unknown,
): ReorderBeverageCoverageCategoriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_BEVERAGE_COVERAGE_CATEGORIES });

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

export function validateBeverageCoverageCategoryListQuery(query: Record<string, unknown>): {
  filters: BeverageCoverageCategoryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BeverageCoverageCategoryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
