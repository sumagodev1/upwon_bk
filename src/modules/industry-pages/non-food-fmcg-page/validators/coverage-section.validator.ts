// src/modules/industry-pages/non-food-fmcg-page/validators/coverage-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { isNonFoodFmcgIconName, NON_FOOD_FMCG_ICON_NAMES } from '../utils/icons';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  CreateNonFoodFmcgCoverageItemInput,
  NonFoodFmcgCoverageItemFilters,
  ReorderNonFoodFmcgCoverageItemsInput,
  UpsertNonFoodFmcgCoveragePanelInput,
  UpdateNonFoodFmcgCoverageItemInput,
} from '../types/coverage-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LABEL_MAX = 120;
const IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };

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

export function validateCreateNonFoodFmcgCoverageItem(body: unknown): CreateNonFoodFmcgCoverageItemInput {
  const v = validator(body);
  const icon = v.requiredString('icon', { min: 1, max: 60 });
  checkIcon(v, icon);

  const dto: CreateNonFoodFmcgCoverageItemInput = {
    icon,
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateNonFoodFmcgCoverageItem(body: unknown): UpdateNonFoodFmcgCoverageItemInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'label', 'displayOrder', 'status']);
  const icon = v.has('icon') ? v.requiredString('icon', { min: 1, max: 60 }) : undefined;
  checkIcon(v, icon);

  const dto: UpdateNonFoodFmcgCoverageItemInput = {
    icon,
    label: v.has('label')
      ? v.requiredString('label', { min: 2, max: LABEL_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export const validateNonFoodFmcgCoverageItemStatus = validateStatusBody;

export const validateReorderNonFoodFmcgCoverageItems = (body: unknown): ReorderNonFoodFmcgCoverageItemsInput =>
  validateReorderIds(body, LIMITS.MAX_NON_FOOD_FMCG_COVERAGE_ITEMS);

export function validateNonFoodFmcgCoverageItemListQuery(query: Record<string, unknown>): {
  filters: NonFoodFmcgCoverageItemFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: NonFoodFmcgCoverageItemFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the panel image ───────────────────────────────────────────────────────

export function validateUpsertNonFoodFmcgCoveragePanel(body: unknown): UpsertNonFoodFmcgCoveragePanelInput {
  const v = validator(body);
  const image = readImagePair(v, IMAGE, { required: true, partial: false, noun: 'The panel' });

  const dto: UpsertNonFoodFmcgCoveragePanelInput = {
    imageUrl: image.url ?? null,
    imageFileId: image.fileId ?? null,
    // A description a screen reader can use, not a filename.
    alt: v.requiredString('alt', { min: 5, max: 255 }),
  };

  v.assert();
  return dto;
}
