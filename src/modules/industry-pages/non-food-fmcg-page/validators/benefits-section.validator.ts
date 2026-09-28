// src/modules/industry-pages/non-food-fmcg-page/validators/benefits-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { isNonFoodFmcgIconName, NON_FOOD_FMCG_ICON_NAMES } from '../utils/icons';
import { validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  CreateNonFoodFmcgBenefitItemInput,
  NonFoodFmcgBenefitItemFilters,
  ReorderNonFoodFmcgBenefitItemsInput,
  UpdateNonFoodFmcgBenefitItemInput,
} from '../types/benefits-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LABEL_MAX = 120;

/** The icon is a name from the allowlist the site can draw, not a file. */
function checkIcon(v: Validator, icon: string | undefined): void {
  if (!icon) return;
  v.custom(
    isNonFoodFmcgIconName(icon),
    'icon',
    `icon must be one of: ${NON_FOOD_FMCG_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );
}

export function validateCreateNonFoodFmcgBenefitItem(body: unknown): CreateNonFoodFmcgBenefitItemInput {
  const v = validator(body);
  const icon = v.requiredString('icon', { min: 1, max: 60 });
  checkIcon(v, icon);

  const dto: CreateNonFoodFmcgBenefitItemInput = {
    icon,
    label: v.requiredString('label', { min: 3, max: LABEL_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateNonFoodFmcgBenefitItem(body: unknown): UpdateNonFoodFmcgBenefitItemInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'label', 'displayOrder', 'status']);
  const icon = v.has('icon') ? v.requiredString('icon', { min: 1, max: 60 }) : undefined;
  checkIcon(v, icon);

  const dto: UpdateNonFoodFmcgBenefitItemInput = {
    icon,
    label: v.has('label')
      ? v.requiredString('label', { min: 3, max: LABEL_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export const validateNonFoodFmcgBenefitItemStatus = validateStatusBody;

export const validateReorderNonFoodFmcgBenefitItems = (body: unknown): ReorderNonFoodFmcgBenefitItemsInput =>
  validateReorderIds(body, LIMITS.MAX_NON_FOOD_FMCG_BENEFIT_ITEMS);

export function validateNonFoodFmcgBenefitItemListQuery(query: Record<string, unknown>): {
  filters: NonFoodFmcgBenefitItemFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: NonFoodFmcgBenefitItemFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
