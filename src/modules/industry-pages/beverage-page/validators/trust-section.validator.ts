// src/modules/industry-pages/beverage-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  BeverageTrustLogoFilters,
  BeverageTrustStatFilters,
  CreateBeverageTrustLogoInput,
  CreateBeverageTrustStatInput,
  ReorderInput,
  UpdateBeverageTrustLogoInput,
  UpdateBeverageTrustStatInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const LABEL_MAX = 160;
const VALUE_MAX = 40;

// ── the logo marquee ──────────────────────────────────────────────────────

/**
 * Reads the image pair.
 *
 * On create exactly one source is required - a logo row exists only to show a
 * mark. On update either may be absent, meaning "leave it alone", but the two
 * still cannot arrive together, and the repository clears the other side when
 * one is set.
 */
function readImagePair(
  v: Validator,
  required: boolean,
): { imageUrl: string | null | undefined; imageFileId: string | null | undefined } {
  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors beverage_trust_logos_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  if (required) {
    v.custom(
      imageUrl !== null || imageFileId !== null,
      'imageUrl',
      'A logo needs an image: give either imageUrl or imageFileId',
      'REQUIRED',
    );
    return { imageUrl, imageFileId };
  }

  return {
    imageUrl: v.has('imageUrl') ? imageUrl : undefined,
    imageFileId: v.has('imageFileId') ? imageFileId : undefined,
  };
}

export function validateCreateBeverageTrustLogo(body: unknown): CreateBeverageTrustLogoInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, true);

  const dto: CreateBeverageTrustLogoInput = {
    imageUrl: imageUrl ?? null,
    imageFileId: imageFileId ?? null,
    alt: v.requiredString('alt', { min: 1, max: ALT_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateBeverageTrustLogo(body: unknown): UpdateBeverageTrustLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readImagePair(v, false);

  const dto: UpdateBeverageTrustLogoInput = {
    imageUrl,
    imageFileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateBeverageTrustLogoListQuery(query: Record<string, unknown>): {
  filters: BeverageTrustLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BeverageTrustLogoFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the stats ─────────────────────────────────────────────────────────────

/**
 * Reads the photo pair. Optional throughout - a stat without a photo sits on
 * the card's dark ground - but the two sources cannot arrive together.
 */
function readPhotoPair(
  v: Validator,
  isUpdate: boolean,
): { imageUrl: string | null | undefined; imageFileId: string | null | undefined } {
  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors beverage_trust_stats_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  if (!isUpdate) return { imageUrl, imageFileId };
  return {
    imageUrl: v.has('imageUrl') ? imageUrl : undefined,
    imageFileId: v.has('imageFileId') ? imageFileId : undefined,
  };
}

export function validateCreateBeverageTrustStat(body: unknown): CreateBeverageTrustStatInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readPhotoPair(v, false);

  const dto: CreateBeverageTrustStatInput = {
    value: v.requiredString('value', { min: 1, max: VALUE_MAX }),
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    imageUrl: imageUrl ?? null,
    imageFileId: imageFileId ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateBeverageTrustStat(body: unknown): UpdateBeverageTrustStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['value', 'label', 'imageUrl', 'imageFileId', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readPhotoPair(v, true);

  const dto: UpdateBeverageTrustStatInput = {
    value: v.has('value') ? v.requiredString('value', { min: 1, max: VALUE_MAX }) : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    imageUrl,
    imageFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateBeverageTrustStatListQuery(query: Record<string, unknown>): {
  filters: BeverageTrustStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BeverageTrustStatFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateBeverageTrustStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
function validateReorder(body: unknown, max: number): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one id', 'REQUIRED');

  // uuidArray dedupes silently, which would turn a duplicated id into a
  // partial reorder. Compare against the raw length to catch it.
  const raw = (body as { ids?: unknown } | null)?.ids;
  v.custom(
    !Array.isArray(raw) || raw.length === ids.length,
    'ids',
    'ids must not contain duplicates',
    'DUPLICATE_IDS',
  );

  v.assert();
  return { ids };
}

export const validateBeverageTrustLogoReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_BEVERAGE_TRUST_LOGOS);

export const validateBeverageTrustStatReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_BEVERAGE_TRUST_STATS);
