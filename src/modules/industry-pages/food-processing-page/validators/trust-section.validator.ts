// src/modules/industry-pages/food-processing-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  FoodProcessingTrustLogoFilters,
  FoodProcessingTrustStatFilters,
  CreateFoodProcessingTrustLogoInput,
  CreateFoodProcessingTrustStatInput,
  ReorderInput,
  UpdateFoodProcessingTrustLogoInput,
  UpdateFoodProcessingTrustStatInput,
  UpsertFoodProcessingTrustPanelInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const ALT_MAX = 255;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 255;

const LOGO_IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };

// ── the customer logos ────────────────────────────────────────────────────

export function validateCreateFoodProcessingTrustLogo(body: unknown): CreateFoodProcessingTrustLogoInput {
  const v = validator(body);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: false, noun: 'A logo' });

  const dto: CreateFoodProcessingTrustLogoInput = {
    imageUrl: image.url ?? null,
    imageFileId: image.fileId ?? null,
    alt: v.requiredString('alt', { min: 1, max: ALT_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateFoodProcessingTrustLogo(body: unknown): UpdateFoodProcessingTrustLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: true, noun: 'A logo' });

  const dto: UpdateFoodProcessingTrustLogoInput = {
    imageUrl: image.url,
    imageFileId: image.fileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateFoodProcessingTrustLogoListQuery(query: Record<string, unknown>): {
  filters: FoodProcessingTrustLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FoodProcessingTrustLogoFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the figures ───────────────────────────────────────────────────────────

export function validateCreateFoodProcessingTrustStat(body: unknown): CreateFoodProcessingTrustStatInput {
  const v = validator(body);

  const dto: CreateFoodProcessingTrustStatInput = {
    /*
     * A minimum of one, not two: "5x" is two characters and "8" is a
     * perfectly good figure on its own.
     */
    value: v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }),
    label: v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateFoodProcessingTrustStat(body: unknown): UpdateFoodProcessingTrustStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['value', 'label', 'displayOrder', 'status']);

  const dto: UpdateFoodProcessingTrustStatInput = {
    value: v.has('value') ? v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }) : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateFoodProcessingTrustStatListQuery(query: Record<string, unknown>): {
  filters: FoodProcessingTrustStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FoodProcessingTrustStatFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export const validateFoodProcessingTrustStatusBody = validateStatusBody;

export const validateFoodProcessingTrustLogoReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_FOOD_PROCESSING_TRUST_LOGOS);

export const validateFoodProcessingTrustStatReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_FOOD_PROCESSING_TRUST_STATS);

// ── the photo panel ───────────────────────────────────────────────────────

export function validateUpsertFoodProcessingTrustPanel(
  body: unknown,
): UpsertFoodProcessingTrustPanelInput {
  const v = validator(body);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: false, noun: 'The panel' });

  const dto: UpsertFoodProcessingTrustPanelInput = {
    imageUrl: image.url ?? null,
    imageFileId: image.fileId ?? null,
    // A description a screen reader can use, not a filename.
    alt: v.requiredString('alt', { min: 5, max: ALT_MAX }),
  };

  v.assert();
  return dto;
}
