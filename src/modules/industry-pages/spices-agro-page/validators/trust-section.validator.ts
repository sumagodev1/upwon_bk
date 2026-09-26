// src/modules/industry-pages/spices-agro-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateSpicesAgroTrustLogoInput,
  ReorderInput,
  SpicesAgroTrustLogoFilters,
  UpdateSpicesAgroTrustLogoInput,
  UpsertSpicesAgroTrustPanelInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const IMAGE_ALT_MAX = 300;

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

  // Mirrors spices_agro_trust_logos_single_image_source_check.
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

export function validateCreateSpicesAgroTrustLogo(body: unknown): CreateSpicesAgroTrustLogoInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, true);

  const dto: CreateSpicesAgroTrustLogoInput = {
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

export function validateUpdateSpicesAgroTrustLogo(body: unknown): UpdateSpicesAgroTrustLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readImagePair(v, false);

  const dto: UpdateSpicesAgroTrustLogoInput = {
    imageUrl,
    imageFileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSpicesAgroTrustLogoListQuery(query: Record<string, unknown>): {
  filters: SpicesAgroTrustLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SpicesAgroTrustLogoFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the product panel ─────────────────────────────────────────────────────

/**
 * A full replacement. The image is optional - with neither source the site
 * keeps the screenshot it ships - but its description is not, because the
 * screenshot carries information rather than decoration.
 */
export function validateUpsertSpicesAgroTrustPanel(body: unknown): UpsertSpicesAgroTrustPanelInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors spices_agro_trust_panel_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpsertSpicesAgroTrustPanelInput = {
    imageUrl,
    imageFileId,
    imageAlt: v.requiredString('imageAlt', { min: 3, max: IMAGE_ALT_MAX }),
  };

  v.assert();
  return dto;
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateSpicesAgroTrustStatusBody(body: unknown): { status: ContentStatus } {
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

export const validateSpicesAgroTrustLogoReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_SPICES_AGRO_TRUST_LOGOS);
