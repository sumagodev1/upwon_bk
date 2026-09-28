// src/modules/industry-pages/sweets-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { isSweetsIconName, SWEETS_ICON_NAMES } from '../utils/icons';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  SweetsTrustLogoFilters,
  SweetsTrustStatFilters,
  CreateSweetsTrustLogoInput,
  CreateSweetsTrustStatInput,
  ReorderInput,
  UpdateSweetsTrustLogoInput,
  UpdateSweetsTrustStatInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const ALT_MAX = 255;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 255;

const LOGO_IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };

// ── the customer logos ────────────────────────────────────────────────────

export function validateCreateSweetsTrustLogo(body: unknown): CreateSweetsTrustLogoInput {
  const v = validator(body);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: false, noun: 'A logo' });

  const dto: CreateSweetsTrustLogoInput = {
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

export function validateUpdateSweetsTrustLogo(body: unknown): UpdateSweetsTrustLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const image = readImagePair(v, LOGO_IMAGE, { required: true, partial: true, noun: 'A logo' });

  const dto: UpdateSweetsTrustLogoInput = {
    imageUrl: image.url,
    imageFileId: image.fileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSweetsTrustLogoListQuery(query: Record<string, unknown>): {
  filters: SweetsTrustLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SweetsTrustLogoFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the figures ───────────────────────────────────────────────────────────

/** The icon is a name from the allowlist the site can draw, not a file. */
function checkIcon(v: Validator, icon: string | undefined): void {
  if (!icon) return;
  v.custom(
    isSweetsIconName(icon),
    'icon',
    `icon must be one of: ${SWEETS_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );
}

export function validateCreateSweetsTrustStat(body: unknown): CreateSweetsTrustStatInput {
  const v = validator(body);

  const icon = v.requiredString('icon', { min: 1, max: 60 });
  checkIcon(v, icon);

  const dto: CreateSweetsTrustStatInput = {
    /*
     * A minimum of one, not two: "5x" is two characters and "8" is a
     * perfectly good figure on its own.
     */
    value: v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }),
    label: v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }),
    icon,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateSweetsTrustStat(body: unknown): UpdateSweetsTrustStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['value', 'label', 'icon', 'displayOrder', 'status']);

  const icon = v.has('icon') ? v.requiredString('icon', { min: 1, max: 60 }) : undefined;
  checkIcon(v, icon);

  const dto: UpdateSweetsTrustStatInput = {
    value: v.has('value') ? v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }) : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }) : undefined,
    icon,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSweetsTrustStatListQuery(query: Record<string, unknown>): {
  filters: SweetsTrustStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SweetsTrustStatFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export const validateSweetsTrustStatusBody = validateStatusBody;

export const validateSweetsTrustLogoReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_SWEETS_TRUST_LOGOS);

export const validateSweetsTrustStatReorder = (body: unknown): ReorderInput =>
  validateReorderIds(body, LIMITS.MAX_SWEETS_TRUST_STATS);
