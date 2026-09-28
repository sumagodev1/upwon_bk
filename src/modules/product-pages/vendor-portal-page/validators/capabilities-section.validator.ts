// src/modules/product-pages/vendor-portal-page/validators/capabilities-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateVmsCapabilityCardInput,
  ReorderInput,
  UpdateVmsCapabilityCardInput,
  VmsCapabilityCardFilters,
} from '../types/capabilities-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const TITLE_MAX = 160;
const DESCRIPTION_MAX = 400;
const IMAGE_ALT_MAX = 255;
const IMAGE_URL_MAX = 1000;

export function validateCreateVmsCapabilityCard(body: unknown): CreateVmsCapabilityCardInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  /*
   * Mirrors vms_capability_cards_image_required_check: exactly one source.
   * Both at once is ambiguous about which the site should draw, and neither
   * leaves an empty frame in a carousel where every card is a screenshot.
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
    'A card needs its screenshot: give either imageUrl or imageFileId',
    'REQUIRED',
  );

  const dto: CreateVmsCapabilityCardInput = {
    title: v.requiredString('title', { min: 2, max: TITLE_MAX }),
    description: v.requiredString('description', { min: 10, max: DESCRIPTION_MAX }),
    imageUrl,
    imageFileId,
    /*
     * Optional, and null rather than blank: the title sits under the
     * screenshot, so the picture is usually decorative and an empty alt is
     * the correct markup for it.
     */
    imageAlt: v.optionalString('imageAlt', { max: IMAGE_ALT_MAX }) ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateVmsCapabilityCard(body: unknown): UpdateVmsCapabilityCardInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'title',
    'description',
    'imageUrl',
    'imageFileId',
    'imageAlt',
    'displayOrder',
    'status',
  ]);

  /*
   * The screenshot is required by CHECK, so neither half may be cleared on
   * its own - a patch either names a replacement or leaves the pair alone.
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

  const dto: UpdateVmsCapabilityCardInput = {
    title: v.optionalString('title', { min: 2, max: TITLE_MAX }),
    description: v.optionalString('description', { min: 10, max: DESCRIPTION_MAX }),
    imageUrl,
    imageFileId,
    // `null` clears the alt text, which is legitimate for a decorative
    // screenshot; absent leaves it alone.
    imageAlt: v.has('imageAlt')
      ? (v.optionalString('imageAlt', { max: IMAGE_ALT_MAX }) ?? null)
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateVmsCapabilityCardListQuery(query: Record<string, unknown>): {
  filters: VmsCapabilityCardFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: VmsCapabilityCardFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateVmsCapabilityStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates -
 * which matters more here than elsewhere, because the card's number on the
 * page is its position in this list.
 */
export function validateVmsCapabilityCardReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_VMS_CAPABILITY_CARDS });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one card id', 'REQUIRED');

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
