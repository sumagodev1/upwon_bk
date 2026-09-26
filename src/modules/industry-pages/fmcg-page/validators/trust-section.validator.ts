// src/modules/industry-pages/fmcg-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  FmcgTrustLogoFilters,
  FmcgTrustStatFilters,
  CreateFmcgTrustLogoInput,
  CreateFmcgTrustStatInput,
  ReorderInput,
  UpdateFmcgTrustLogoInput,
  UpdateFmcgTrustStatInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const ALT_MAX = 255;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 255;
const STAT_DESCRIPTION_MAX = 400;

const LOGO_IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };

// ── the customer logos ────────────────────────────────────────────────────

export function validateCreateFmcgTrustLogo(body: unknown): CreateFmcgTrustLogoInput {
  const v = validator(body);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: false, noun: 'A logo' });

  const dto: CreateFmcgTrustLogoInput = {
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

export function validateUpdateFmcgTrustLogo(body: unknown): UpdateFmcgTrustLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: true, noun: 'A logo' });

  const dto: UpdateFmcgTrustLogoInput = {
    imageUrl: image.url,
    imageFileId: image.fileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateFmcgTrustLogoListQuery(query: Record<string, unknown>): {
  filters: FmcgTrustLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FmcgTrustLogoFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the figures ───────────────────────────────────────────────────────────

export function validateCreateFmcgTrustStat(body: unknown): CreateFmcgTrustStatInput {
  const v = validator(body);

  const dto: CreateFmcgTrustStatInput = {
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

export function validateUpdateFmcgTrustStat(body: unknown): UpdateFmcgTrustStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['value', 'label', 'description', 'displayOrder', 'status']);

  const dto: UpdateFmcgTrustStatInput = {
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

export function validateFmcgTrustStatListQuery(query: Record<string, unknown>): {
  filters: FmcgTrustStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FmcgTrustStatFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export const validateFmcgTrustStatusBody = validateStatusBody;

export const validateFmcgTrustLogoReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_FMCG_TRUST_LOGOS);

export const validateFmcgTrustStatReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_FMCG_TRUST_STATS);
