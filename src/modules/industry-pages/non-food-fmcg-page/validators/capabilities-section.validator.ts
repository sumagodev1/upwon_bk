// src/modules/industry-pages/non-food-fmcg-page/validators/capabilities-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  CreateNonFoodFmcgCapabilityCardInput,
  NonFoodFmcgCapabilityCardFilters,
  ReorderNonFoodFmcgCapabilityCardsInput,
  UpdateNonFoodFmcgCapabilityCardInput,
} from '../types/capabilities-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 600;
const IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };

export function validateCreateNonFoodFmcgCapabilityCard(body: unknown): CreateNonFoodFmcgCapabilityCardInput {
  const v = validator(body);
  const image = readImagePair(v, IMAGE, { required: true, partial: false, noun: 'A capability' });

  const dto: CreateNonFoodFmcgCapabilityCardInput = {
    title: v.requiredString('title', { min: 3, max: TITLE_MAX }),
    description: v.requiredString('description', { min: 10, max: DESCRIPTION_MAX }),
    imageUrl: image.url ?? null,
    imageFileId: image.fileId ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateNonFoodFmcgCapabilityCard(body: unknown): UpdateNonFoodFmcgCapabilityCardInput {
  const v = validator(body);

  v.requireAtLeastOne(['title', 'description', 'imageUrl', 'imageFileId', 'displayOrder', 'status']);
  const image = readImagePair(v, IMAGE, { required: true, partial: true, noun: 'A capability' });

  const dto: UpdateNonFoodFmcgCapabilityCardInput = {
    title: v.has('title')
      ? v.requiredString('title', { min: 3, max: TITLE_MAX })
      : undefined,
    description: v.has('description')
      ? v.requiredString('description', { min: 10, max: DESCRIPTION_MAX })
      : undefined,
    imageUrl: image.url,
    imageFileId: image.fileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export const validateNonFoodFmcgCapabilityCardStatus = validateStatusBody;

export const validateReorderNonFoodFmcgCapabilityCards = (body: unknown): ReorderNonFoodFmcgCapabilityCardsInput =>
  validateReorderIds(body, LIMITS.MAX_NON_FOOD_FMCG_CAPABILITY_CARDS);

export function validateNonFoodFmcgCapabilityCardListQuery(query: Record<string, unknown>): {
  filters: NonFoodFmcgCapabilityCardFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: NonFoodFmcgCapabilityCardFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
