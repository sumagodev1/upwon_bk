// src/modules/industry-pages/bakery-page/validators/helps-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  BakeryHelpVisualFilters,
  CreateBakeryHelpVisualInput,
  ReorderBakeryHelpVisualsInput,
  UpdateBakeryHelpVisualInput,
} from '../types/helps-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const ALT_MAX = 255;

const IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };

export function validateCreateBakeryHelpVisual(body: unknown): CreateBakeryHelpVisualInput {
  const v = validator(body);
  const image = readImagePair(v, IMAGE, { required: true, partial: false, noun: 'A diagram' });

  const dto: CreateBakeryHelpVisualInput = {
    imageUrl: image.url ?? null,
    imageFileId: image.fileId ?? null,
    // A description a screen reader can use, not a filename.
    alt: v.requiredString('alt', { min: 5, max: ALT_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    /*
     * INACTIVE by default, unlike the other lists: one diagram is live at a
     * time, so a new one is a draft until it is switched over deliberately.
     */
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'INACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateBakeryHelpVisual(body: unknown): UpdateBakeryHelpVisualInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const image = readImagePair(v, IMAGE, { required: true, partial: true, noun: 'A diagram' });

  const dto: UpdateBakeryHelpVisualInput = {
    imageUrl: image.url,
    imageFileId: image.fileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 5, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export const validateBakeryHelpVisualStatus = validateStatusBody;

export const validateReorderBakeryHelpVisuals = (body: unknown): ReorderBakeryHelpVisualsInput =>
  validateReorderIds(body, LIMITS.MAX_BAKERY_HELP_VISUALS);

export function validateBakeryHelpVisualListQuery(query: Record<string, unknown>): {
  filters: BakeryHelpVisualFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BakeryHelpVisualFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
