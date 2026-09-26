// src/modules/home-page/validators/hero-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import { validateContentUrl } from '../utils/content-url';
import { hasBalancedAccentMarkers } from '../utils/heading-markup';
import {
  CreateHeroSlideInput,
  HeroSlideFilters,
  ReorderHeroSlidesInput,
  UpdateHeroSlideInput,
} from '../types/hero-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const HEADING_MAX = 300;
const SUBTEXT_MAX = 600;
const IMAGE_URL_MAX = 1000;

/**
 * An absolute http(s) URL, or a site-relative path like '/images/hero.webp'.
 * The rule itself is shared with every CMS URL field - see utils/content-url.
 */
function validateImageUrl(v: Validator, field: string, value: string): void {
  validateContentUrl(v, field, value, 'INVALID_IMAGE_URL');
}

function validateHeading(v: Validator, field: string, value: string): void {
  v.custom(
    hasBalancedAccentMarkers(value),
    field,
    `${field} has an unclosed ** accent marker; wrap accented words as **like this**`,
    'UNBALANCED_ACCENT_MARKER',
  );
}

export function validateCreateHeroSlide(body: unknown): CreateHeroSlideInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeading(v, 'heading', heading);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateImageUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors home_hero_slides_single_image_source_check. Enforced here so the
  // caller gets a field error rather than a 409 from the constraint.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const mobileImageUrl = v.optionalString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (mobileImageUrl) validateImageUrl(v, 'mobileImageUrl', mobileImageUrl);

  const mobileImageFileId = v.optionalUuid('mobileImageFileId') ?? null;

  // Mirrors home_hero_slides_single_mobile_image_source_check.
  v.custom(
    mobileImageUrl === null || mobileImageFileId === null,
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: CreateHeroSlideInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: 120 }),
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    imageUrl,
    imageFileId,
    mobileImageUrl,
    mobileImageFileId,
    imageAlt: v.optionalString('imageAlt', { max: 255 }) ?? null,
    shine: v.optionalBoolean('shine') ?? false,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateHeroSlide(body: unknown): UpdateHeroSlideInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'eyebrow',
    'heading',
    'subtext',
    'imageUrl',
    'imageFileId',
    'imageAlt',
    'mobileImageUrl',
    'mobileImageFileId',
    'shine',
    'displayOrder',
    'status',
  ]);

  const heading = v.has('heading')
    ? v.requiredString('heading', { min: 3, max: HEADING_MAX })
    : undefined;
  if (heading) validateHeading(v, 'heading', heading);

  // `null` clears the field; `undefined` (absent) leaves it alone. optionalString
  // conflates the two, so the presence check has to be explicit.
  const imageUrl = v.has('imageUrl')
    ? (v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (imageUrl) validateImageUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.has('imageFileId') ? (v.optionalUuid('imageFileId') ?? null) : undefined;

  const mobileImageUrl = v.has('mobileImageUrl')
    ? (v.optionalString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (mobileImageUrl) validateImageUrl(v, 'mobileImageUrl', mobileImageUrl);

  const mobileImageFileId = v.has('mobileImageFileId')
    ? (v.optionalUuid('mobileImageFileId') ?? null)
    : undefined;

  v.custom(
    !(mobileImageUrl && mobileImageFileId),
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  // Only checkable within this patch; setting one while the other is already
  // stored is resolved in the service, which can see the current row.
  v.custom(
    !(imageUrl && imageFileId),
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateHeroSlideInput = {
    eyebrow: v.optionalString('eyebrow', { min: 2, max: 120 }),
    heading,
    subtext: v.optionalString('subtext', { min: 3, max: SUBTEXT_MAX }),
    imageUrl,
    imageFileId,
    imageAlt: v.has('imageAlt') ? (v.optionalString('imageAlt', { max: 255 }) ?? null) : undefined,
    mobileImageUrl,
    mobileImageFileId,
    shine: v.optionalBoolean('shine'),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateHeroSlideStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates, which
 * a "move slide X to position N" endpoint can when two admins drag at once.
 */
export function validateReorderHeroSlides(body: unknown): ReorderHeroSlidesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_HERO_SLIDES });

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

export function validateHeroSlideListQuery(query: Record<string, unknown>): {
  filters: HeroSlideFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: HeroSlideFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
