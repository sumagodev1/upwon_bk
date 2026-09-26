// src/modules/industry-pages/dairy-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  DairyTrustLogoFilters,
  DairyTrustStatFilters,
  CreateDairyTrustLogoInput,
  CreateDairyTrustStatInput,
  ReorderInput,
  UpdateDairyTrustLogoInput,
  UpdateDairyTrustStatInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const ALT_MAX = 255;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 255;

const LOGO_IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };
const STAT_IMAGE = LOGO_IMAGE;

// ── the customer logos ────────────────────────────────────────────────────

export function validateCreateDairyTrustLogo(body: unknown): CreateDairyTrustLogoInput {
  const v = validator(body);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: false, noun: 'A logo' });

  const dto: CreateDairyTrustLogoInput = {
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

export function validateUpdateDairyTrustLogo(body: unknown): UpdateDairyTrustLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: true, noun: 'A logo' });

  const dto: UpdateDairyTrustLogoInput = {
    imageUrl: image.url,
    imageFileId: image.fileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateDairyTrustLogoListQuery(query: Record<string, unknown>): {
  filters: DairyTrustLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: DairyTrustLogoFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the figures ───────────────────────────────────────────────────────────

export function validateCreateDairyTrustStat(body: unknown): CreateDairyTrustStatInput {
  const v = validator(body);
  const image = readImagePair(v, STAT_IMAGE, { required: true, partial: false, noun: 'A figure' });

  const dto: CreateDairyTrustStatInput = {
    /*
     * A minimum of one, not two: "5x" is two characters and "8" is a
     * perfectly good figure on its own.
     */
    value: v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }),
    label: v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }),
    imageUrl: image.url ?? null,
    imageFileId: image.fileId ?? null,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateDairyTrustStat(body: unknown): UpdateDairyTrustStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['value', 'label', 'imageUrl', 'imageFileId', 'displayOrder', 'status']);
  const image = readImagePair(v, STAT_IMAGE, { required: true, partial: true, noun: 'A figure' });

  const dto: UpdateDairyTrustStatInput = {
    value: v.has('value') ? v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }) : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }) : undefined,
    imageUrl: image.url,
    imageFileId: image.fileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateDairyTrustStatListQuery(query: Record<string, unknown>): {
  filters: DairyTrustStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: DairyTrustStatFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export const validateDairyTrustStatusBody = validateStatusBody;

export const validateDairyTrustLogoReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_DAIRY_TRUST_LOGOS);

export const validateDairyTrustStatReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_DAIRY_TRUST_STATS);
