// src/modules/industry-pages/bakery-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  BakeryTrustLogoFilters,
  BakeryTrustStatFilters,
  CreateBakeryTrustLogoInput,
  CreateBakeryTrustStatInput,
  ReorderInput,
  UpdateBakeryTrustLogoInput,
  UpdateBakeryTrustStatInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const ALT_MAX = 255;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 255;

const LOGO_IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };
const STAT_ICON = { url: 'iconUrl', fileId: 'iconFileId' };

// ── the customer logos ────────────────────────────────────────────────────

export function validateCreateBakeryTrustLogo(body: unknown): CreateBakeryTrustLogoInput {
  const v = validator(body);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: false, noun: 'A logo' });

  const dto: CreateBakeryTrustLogoInput = {
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

export function validateUpdateBakeryTrustLogo(body: unknown): UpdateBakeryTrustLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: true, noun: 'A logo' });

  const dto: UpdateBakeryTrustLogoInput = {
    imageUrl: image.url,
    imageFileId: image.fileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateBakeryTrustLogoListQuery(query: Record<string, unknown>): {
  filters: BakeryTrustLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BakeryTrustLogoFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the figures ───────────────────────────────────────────────────────────

export function validateCreateBakeryTrustStat(body: unknown): CreateBakeryTrustStatInput {
  const v = validator(body);
  // Optional: a figure without its illustration still reads as a figure.
  const icon = readImagePair(v, STAT_ICON, { required: false, partial: false, noun: 'A figure' });

  const dto: CreateBakeryTrustStatInput = {
    /*
     * A minimum of one, not two: "5x" is two characters and "8" is a
     * perfectly good figure on its own.
     */
    value: v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }),
    label: v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }),
    iconUrl: icon.url ?? null,
    iconFileId: icon.fileId ?? null,
    isFeatured: v.optionalBoolean('isFeatured') ?? false,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateBakeryTrustStat(body: unknown): UpdateBakeryTrustStatInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'value',
    'label',
    'iconUrl',
    'iconFileId',
    'isFeatured',
    'displayOrder',
    'status',
  ]);
  const icon = readImagePair(v, STAT_ICON, { required: false, partial: true, noun: 'A figure' });

  const dto: UpdateBakeryTrustStatInput = {
    value: v.has('value') ? v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }) : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }) : undefined,
    iconUrl: icon.url,
    iconFileId: icon.fileId,
    isFeatured: v.optionalBoolean('isFeatured'),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateBakeryTrustStatListQuery(query: Record<string, unknown>): {
  filters: BakeryTrustStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BakeryTrustStatFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export const validateBakeryTrustStatusBody = validateStatusBody;

export const validateBakeryTrustLogoReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_BAKERY_TRUST_LOGOS);

export const validateBakeryTrustStatReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_BAKERY_TRUST_STATS);
