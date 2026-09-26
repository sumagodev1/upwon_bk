// src/modules/insider-page/validators/hero-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import { validateContentUrl } from '../../home-page/utils/content-url';
import {
  CreateInsiderHeroSlideInput,
  InsiderHeroSlideFilters,
  ReorderInsiderHeroSlidesInput,
  UpdateInsiderHeroSlideInput,
} from '../types/hero-section.types';

/** The same authoring limits as the home hero. */
const HEADING_MAX = 300;
const SUBTEXT_MAX = 600;
const IMAGE_URL_MAX = 1000;
const IMAGE_ALT_MAX = 255;

/**
 * The Insider hero renders its headline through HeroSlider, which knows one
 * device - the em-dash split - and no accent markup. A `**` typed out of habit
 * from the home hero would ship to the live site as two literal asterisks, so
 * it is refused here with a pointer to what does work.
 */
function validateHeading(v: Validator, field: string, value: string): void {
  v.custom(
    !value.includes('**'),
    field,
    `${field} does not support ** accent markers here; use an em-dash (—) to split the setup from the emphasised payoff`,
    'UNSUPPORTED_MARKUP',
  );
}

function validateImageUrl(v: Validator, field: string, value: string): void {
  validateContentUrl(v, field, value, 'INVALID_IMAGE_URL');
}

export function validateCreateInsiderHeroSlide(body: unknown): CreateInsiderHeroSlideInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeading(v, 'heading', heading);

  const imageUrl = v.nullableString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateImageUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors insider_hero_slides_single_image_source_check, as a field error
  // rather than a constraint violation.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const mobileImageUrl = v.nullableString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (mobileImageUrl) validateImageUrl(v, 'mobileImageUrl', mobileImageUrl);

  const mobileImageFileId = v.optionalUuid('mobileImageFileId') ?? null;

  v.custom(
    mobileImageUrl === null || mobileImageFileId === null,
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: CreateInsiderHeroSlideInput = {
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    imageUrl,
    imageFileId,
    imageAlt: v.nullableString('imageAlt', { max: IMAGE_ALT_MAX }) ?? null,
    mobileImageUrl,
    mobileImageFileId,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateInsiderHeroSlide(body: unknown): UpdateInsiderHeroSlideInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'heading',
    'subtext',
    'imageUrl',
    'imageFileId',
    'imageAlt',
    'mobileImageUrl',
    'mobileImageFileId',
    'displayOrder',
    'status',
  ]);

  const heading = v.has('heading')
    ? v.requiredString('heading', { min: 3, max: HEADING_MAX })
    : undefined;
  if (heading) validateHeading(v, 'heading', heading);

  // nullableString keeps the three states apart: absent leaves the value,
  // null or blank clears it, anything else sets it.
  const imageUrl = v.nullableString('imageUrl', { max: IMAGE_URL_MAX });
  if (imageUrl) validateImageUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.has('imageFileId') ? (v.optionalUuid('imageFileId') ?? null) : undefined;

  const mobileImageUrl = v.nullableString('mobileImageUrl', { max: IMAGE_URL_MAX });
  if (mobileImageUrl) validateImageUrl(v, 'mobileImageUrl', mobileImageUrl);

  const mobileImageFileId = v.has('mobileImageFileId')
    ? (v.optionalUuid('mobileImageFileId') ?? null)
    : undefined;

  // Only checkable within this patch; setting one while the other is already
  // stored is resolved by the repository clearing the other side.
  v.custom(
    !(imageUrl && imageFileId),
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  v.custom(
    !(mobileImageUrl && mobileImageFileId),
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateInsiderHeroSlideInput = {
    heading,
    subtext: v.optionalString('subtext', { min: 3, max: SUBTEXT_MAX }),
    imageUrl,
    imageFileId,
    imageAlt: v.nullableString('imageAlt', { max: IMAGE_ALT_MAX }),
    mobileImageUrl,
    mobileImageFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateInsiderHeroSlideStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * The complete id list in its new order - a whole-set rewrite, for the same
 * reasons as the home hero reorder.
 */
export function validateReorderInsiderHeroSlides(body: unknown): ReorderInsiderHeroSlidesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_INSIDER_HERO_SLIDES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one slide id', 'REQUIRED');

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

export function validateInsiderHeroSlideListQuery(query: Record<string, unknown>): {
  filters: InsiderHeroSlideFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: InsiderHeroSlideFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
