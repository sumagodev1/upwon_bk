// src/modules/blog/validators/hero-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import {
  BlogHeroSlideFilters,
  CreateBlogHeroSlideInput,
  ReorderBlogHeroSlidesInput,
  UpdateBlogHeroSlideInput,
} from '../types/hero-section.types';

/**
 * The Insider hero's authoring limits, plus the home hero's eyebrow. These are
 * the same slides in the same HeroSlider, so they take the same copy.
 */
const EYEBROW_MAX = 120;
const HEADING_MAX = 300;
const SUBTEXT_MAX = 600;

/*
 * Pictures are uploads only - imageFileId (desktop) and mobileImageFileId
 * (phone). There is no URL source: an imageUrl, mobileImageUrl or imageAlt a
 * client sends is ignored like any other unknown key (the validators here
 * never refuse extra keys), so no request can put a URL on a slide.
 *
 * Removing a picture is `imageFileId: null`, and it removes the legacy
 * seeded one too: the admin panel's Blog hero adapter (blogHeroSection.ts)
 * leaves imageFileId OUT of a save that did not touch the desktop slot, so a
 * copy-only edit of the seeded slide never reaches this, and sends null only
 * when the admin pressed the slot's X. `imageUrl: null` is still read as the
 * same "remove" signal - never as a value - for a client that sends it.
 */

/**
 * The blog hero renders its headline through HeroSlider, which knows one
 * device - the em-dash split - and no accent markup, the same as the Insider
 * hero. A `**` would ship to the live site as two literal asterisks, so it is
 * refused here with a pointer to what does work.
 */
function validateHeading(v: Validator, field: string, value: string): void {
  v.custom(
    !value.includes('**'),
    field,
    `${field} does not support ** accent markers here; use an em-dash (—) to split the setup from the emphasised payoff`,
    'UNSUPPORTED_MARKUP',
  );
}

export function validateCreateBlogHeroSlide(body: unknown): CreateBlogHeroSlideInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeading(v, 'heading', heading);

  const dto: CreateBlogHeroSlideInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    imageFileId: v.optionalUuid('imageFileId') ?? null,
    mobileImageFileId: v.optionalUuid('mobileImageFileId') ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateBlogHeroSlide(body: unknown): UpdateBlogHeroSlideInput {
  const v = validator(body);

  const clearLegacyImage = (body as { imageUrl?: unknown } | null)?.imageUrl === null;

  if (!clearLegacyImage) {
    v.requireAtLeastOne([
      'eyebrow',
      'heading',
      'subtext',
      'imageFileId',
      'mobileImageFileId',
      'displayOrder',
      'status',
    ]);
  }

  const heading = v.has('heading')
    ? v.requiredString('heading', { min: 3, max: HEADING_MAX })
    : undefined;
  if (heading) validateHeading(v, 'heading', heading);

  const dto: UpdateBlogHeroSlideInput = {
    eyebrow: v.optionalString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    heading,
    subtext: v.optionalString('subtext', { min: 3, max: SUBTEXT_MAX }),
    // Absent leaves the picture alone; null removes it, seeded or uploaded.
    imageFileId: v.has('imageFileId') ? (v.optionalUuid('imageFileId') ?? null) : undefined,
    clearLegacyImage: clearLegacyImage || undefined,
    mobileImageFileId: v.has('mobileImageFileId')
      ? (v.optionalUuid('mobileImageFileId') ?? null)
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateBlogHeroSlideStatus(body: unknown): {
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
export function validateReorderBlogHeroSlides(body: unknown): ReorderBlogHeroSlidesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_BLOG_HERO_SLIDES });

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

export function validateBlogHeroSlideListQuery(query: Record<string, unknown>): {
  filters: BlogHeroSlideFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BlogHeroSlideFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
