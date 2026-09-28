// src/modules/industry-pages/non-food-fmcg-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  NonFoodFmcgTrustLogoFilters,
  NonFoodFmcgTrustStatFilters,
  CreateNonFoodFmcgTrustLogoInput,
  CreateNonFoodFmcgTrustStatInput,
  ReorderInput,
  UpdateNonFoodFmcgTrustLogoInput,
  UpdateNonFoodFmcgTrustStatInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const ALT_MAX = 255;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 255;
const STAT_DESCRIPTION_MAX = 400;

const LOGO_IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };

// ── the customer logos ────────────────────────────────────────────────────

export function validateCreateNonFoodFmcgTrustLogo(body: unknown): CreateNonFoodFmcgTrustLogoInput {
  const v = validator(body);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: false, noun: 'A logo' });

  const dto: CreateNonFoodFmcgTrustLogoInput = {
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

export function validateUpdateNonFoodFmcgTrustLogo(body: unknown): UpdateNonFoodFmcgTrustLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: true, noun: 'A logo' });

  const dto: UpdateNonFoodFmcgTrustLogoInput = {
    imageUrl: image.url,
    imageFileId: image.fileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateNonFoodFmcgTrustLogoListQuery(query: Record<string, unknown>): {
  filters: NonFoodFmcgTrustLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: NonFoodFmcgTrustLogoFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the figures ───────────────────────────────────────────────────────────

export function validateCreateNonFoodFmcgTrustStat(body: unknown): CreateNonFoodFmcgTrustStatInput {
  const v = validator(body);

  const dto: CreateNonFoodFmcgTrustStatInput = {
    /*
     * A minimum of one, not two: "5x" is two characters and "8" is a
     * perfectly good figure on its own.
     */
    value: v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }),
    label: v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }),
    description: v.requiredString('description', { min: 10, max: STAT_DESCRIPTION_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateNonFoodFmcgTrustStat(body: unknown): UpdateNonFoodFmcgTrustStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['value', 'label', 'description', 'displayOrder', 'status']);

  const dto: UpdateNonFoodFmcgTrustStatInput = {
    value: v.has('value') ? v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }) : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }) : undefined,
    description: v.has('description')
      ? v.requiredString('description', { min: 10, max: STAT_DESCRIPTION_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateNonFoodFmcgTrustStatListQuery(query: Record<string, unknown>): {
  filters: NonFoodFmcgTrustStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: NonFoodFmcgTrustStatFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export const validateNonFoodFmcgTrustStatusBody = validateStatusBody;

export const validateNonFoodFmcgTrustLogoReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_NON_FOOD_FMCG_TRUST_LOGOS);

export const validateNonFoodFmcgTrustStatReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_NON_FOOD_FMCG_TRUST_STATS);
