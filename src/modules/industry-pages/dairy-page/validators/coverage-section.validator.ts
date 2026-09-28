// src/modules/industry-pages/dairy-page/validators/coverage-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  CreateDairyCoverageItemInput,
  DairyCoverageItemFilters,
  ReorderDairyCoverageItemsInput,
  UpdateDairyCoverageItemInput,
} from '../types/coverage-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LABEL_MAX = 120;
const IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };

export function validateCreateDairyCoverageItem(body: unknown): CreateDairyCoverageItemInput {
  const v = validator(body);
  const image = readImagePair(v, IMAGE, { required: true, partial: false, noun: 'A category' });

  const dto: CreateDairyCoverageItemInput = {
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    imageUrl: image.url ?? null,
    imageFileId: image.fileId ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateDairyCoverageItem(body: unknown): UpdateDairyCoverageItemInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'imageUrl', 'imageFileId', 'displayOrder', 'status']);
  const image = readImagePair(v, IMAGE, { required: true, partial: true, noun: 'A category' });

  const dto: UpdateDairyCoverageItemInput = {
    label: v.has('label')
      ? v.requiredString('label', { min: 2, max: LABEL_MAX })
      : undefined,
    imageUrl: image.url,
    imageFileId: image.fileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export const validateDairyCoverageItemStatus = validateStatusBody;

export const validateReorderDairyCoverageItems = (body: unknown): ReorderDairyCoverageItemsInput =>
  validateReorderIds(body, LIMITS.MAX_DAIRY_COVERAGE_ITEMS);

export function validateDairyCoverageItemListQuery(query: Record<string, unknown>): {
  filters: DairyCoverageItemFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: DairyCoverageItemFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
