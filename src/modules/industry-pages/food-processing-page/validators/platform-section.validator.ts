// src/modules/industry-pages/food-processing-page/validators/platform-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { validateLinkHref } from '../utils/link';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  FoodProcessingPlatformTileFilters,
  CreateFoodProcessingPlatformTileInput,
  ReorderFoodProcessingPlatformTilesInput,
  UpdateFoodProcessingPlatformTileInput,
} from '../types/platform-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LABEL_MAX = 80;
const HREF_MAX = 500;

const TILE_ICON = { url: 'iconUrl', fileId: 'iconFileId' };

export function validateCreateFoodProcessingPlatformTile(body: unknown): CreateFoodProcessingPlatformTileInput {
  const v = validator(body);
  const icon = readImagePair(v, TILE_ICON, { required: true, partial: false, noun: 'A tile' });

  const href = v.requiredString('href', { min: 1, max: HREF_MAX });
  if (href) validateLinkHref(v, 'href', href);

  const dto: CreateFoodProcessingPlatformTileInput = {
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    href,
    iconUrl: icon.url ?? null,
    iconFileId: icon.fileId ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateFoodProcessingPlatformTile(body: unknown): UpdateFoodProcessingPlatformTileInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'href', 'iconUrl', 'iconFileId', 'displayOrder', 'status']);
  const icon = readImagePair(v, TILE_ICON, { required: true, partial: true, noun: 'A tile' });

  const href = v.has('href') ? v.requiredString('href', { min: 1, max: HREF_MAX }) : undefined;
  if (href) validateLinkHref(v, 'href', href);

  const dto: UpdateFoodProcessingPlatformTileInput = {
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    href,
    iconUrl: icon.url,
    iconFileId: icon.fileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export const validateFoodProcessingPlatformTileStatus = validateStatusBody;

export const validateReorderFoodProcessingPlatformTiles = (
  body: unknown,
): ReorderFoodProcessingPlatformTilesInput => validateReorderIds(body, LIMITS.MAX_FOOD_PROCESSING_PLATFORM_TILES);

export function validateFoodProcessingPlatformTileListQuery(query: Record<string, unknown>): {
  filters: FoodProcessingPlatformTileFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FoodProcessingPlatformTileFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
