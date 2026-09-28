// src/modules/product-pages/wms-page/validators/proof-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateWmsProofCardInput,
  CreateWmsProofSlideInput,
  ReorderInput,
  UpdateWmsProofCardInput,
  UpdateWmsProofSlideInput,
  WmsProofCardFilters,
} from '../types/proof-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LABEL_MAX = 120;
const ALT_MAX = 255;
const IMAGE_URL_MAX = 1000;

// ── the cards ─────────────────────────────────────────────────────────────

export function validateCreateWmsProofCard(body: unknown): CreateWmsProofCardInput {
  const v = validator(body);

  const dto: CreateWmsProofCardInput = {
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateWmsProofCard(body: unknown): UpdateWmsProofCardInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'displayOrder', 'status']);

  const dto: UpdateWmsProofCardInput = {
    label: v.optionalString('label', { min: 2, max: LABEL_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── the slides ────────────────────────────────────────────────────────────

export function validateCreateWmsProofSlide(body: unknown): CreateWmsProofSlideInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  /*
   * Mirrors wms_proof_slides_image_required_check: exactly one source. Both
   * at once is ambiguous about which the card should draw, and neither is a
   * blank frame in a card that is otherwise a picture.
   */
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  v.custom(
    imageUrl !== null || imageFileId !== null,
    'imageUrl',
    'A slide needs its artwork: give either imageUrl or imageFileId',
    'REQUIRED',
  );

  const dto: CreateWmsProofSlideInput = {
    imageUrl,
    imageFileId,
    /*
     * Optional, and null rather than blank: the figures are inside the
     * picture, so alt text is the only way they reach a screen reader - but a
     * card mid-edit should still be savable.
     */
    alt: v.optionalString('alt', { max: ALT_MAX }) ?? null,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateWmsProofSlide(body: unknown): UpdateWmsProofSlideInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);

  /*
   * The artwork is required by CHECK, so neither half may be cleared on its
   * own - a patch either names a replacement or leaves the pair alone. Hence
   * `requiredString` rather than the nullable read the alt text takes.
   */
  const imageUrl = v.has('imageUrl')
    ? v.requiredString('imageUrl', { min: 1, max: IMAGE_URL_MAX })
    : undefined;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.has('imageFileId') ? v.requiredUuid('imageFileId') : undefined;

  v.custom(
    !(imageUrl && imageFileId),
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateWmsProofSlideInput = {
    imageUrl,
    imageFileId,
    // `null` clears the alt text, which is a legitimate state for a purely
    // decorative repeat; absent leaves it alone.
    alt: v.has('alt') ? (v.optionalString('alt', { max: ALT_MAX }) ?? null) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateWmsProofStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 *
 * The cap is the larger of the two lists, because one validator serves both;
 * each service checks the count it actually holds.
 */
export function validateWmsProofReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', {
    max: Math.max(LIMITS.MAX_WMS_PROOF_CARDS, LIMITS.MAX_WMS_PROOF_SLIDES),
  });

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

export function validateWmsProofCardListQuery(query: Record<string, unknown>): {
  filters: WmsProofCardFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: WmsProofCardFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
