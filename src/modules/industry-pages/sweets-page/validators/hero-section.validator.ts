// src/modules/industry-pages/sweets-page/validators/hero-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { hasBalancedAccentMarkers } from '../../../home-page/utils/heading-markup';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import {
  CreateSweetsHeroSlideInput,
  SweetsHeroSlideFilters,
  ReorderSweetsHeroSlidesInput,
  SlideCta,
  UpdateSweetsHeroSlideInput,
} from '../types/hero-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const HEADLINE_MAX = 300;
const SUBHEAD_MAX = 600;
const MICRO_TRUST_MAX = 300;
const IMAGE_URL_MAX = 1000;
const CTA_LABEL_MAX = 120;
const CTA_HREF_MAX = 500;

/**
 * Reads one button from its two flattened fields.
 *
 * A label with no target renders as a dead button and a target with no label
 * renders as nothing at all, so the pair is all-or-nothing - which is also
 * what the CHECK constraints enforce. On an update `undefined` means the patch
 * left the button alone, where `null` means clear it.
 */
function readCta(
  v: Validator,
  prefix: 'cta' | 'secondaryCta',
  required: boolean,
): SlideCta | null | undefined {
  const labelField = `${prefix}Label`;
  const hrefField = `${prefix}Href`;
  if (!v.has(labelField) && !v.has(hrefField)) return required ? null : undefined;

  const label = v.optionalString(labelField, { max: CTA_LABEL_MAX }) ?? null;
  const href = v.optionalString(hrefField, { max: CTA_HREF_MAX }) ?? null;

  if (label === null && href === null) return null;

  v.custom(
    label !== null && href !== null,
    label === null ? labelField : hrefField,
    'A button needs both a label and a link, or neither',
    'INCOMPLETE_CTA',
  );

  if (href) validateLinkHref(v, hrefField, href);
  return label !== null && href !== null ? { label, href } : null;
}

function checkHeadline(v: Validator, headline: string): void {
  v.custom(
    hasBalancedAccentMarkers(headline),
    'headline',
    'headline has an unclosed ** accent marker; wrap accented words as **like this**',
    'UNBALANCED_ACCENT_MARKER',
  );
}

export function validateCreateSweetsHeroSlide(body: unknown): CreateSweetsHeroSlideInput {
  const v = validator(body);

  const headline = v.requiredString('headline', { min: 3, max: HEADLINE_MAX });
  if (headline) checkHeadline(v, headline);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors sweets_hero_slides_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  /*
   * The phone crop, on the same rule and optional throughout: a slide without
   * one falls back to the desktop image, which is what every slide does today.
   */
  const mobileImageUrl = v.optionalString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (mobileImageUrl) validateMediaUrl(v, 'mobileImageUrl', mobileImageUrl);
  const mobileImageFileId = v.optionalUuid('mobileImageFileId') ?? null;

  v.custom(
    mobileImageUrl === null || mobileImageFileId === null,
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: CreateSweetsHeroSlideInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: 120 }),
    headline,
    subhead: v.requiredString('subhead', { min: 3, max: SUBHEAD_MAX }),
    microTrust: v.optionalString('microTrust', { max: MICRO_TRUST_MAX }) ?? null,
    cta: readCta(v, 'cta', true) ?? null,
    secondaryCta: readCta(v, 'secondaryCta', true) ?? null,
    imageUrl,
    imageFileId,
    mobileImageUrl,
    mobileImageFileId,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateSweetsHeroSlide(body: unknown): UpdateSweetsHeroSlideInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'eyebrow',
    'headline',
    'subhead',
    'microTrust',
    'ctaLabel',
    'ctaHref',
    'secondaryCtaLabel',
    'secondaryCtaHref',
    'imageUrl',
    'imageFileId',
    'mobileImageUrl',
    'mobileImageFileId',
    'displayOrder',
    'status',
  ]);

  const headline = v.has('headline')
    ? v.requiredString('headline', { min: 3, max: HEADLINE_MAX })
    : undefined;
  if (headline) checkHeadline(v, headline);

  // `null` clears the field; `undefined` (absent) leaves it alone.
  const imageUrl = v.has('imageUrl')
    ? (v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.has('imageFileId') ? (v.optionalUuid('imageFileId') ?? null) : undefined;

  v.custom(
    !(imageUrl && imageFileId),
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  // `null` clears the mobile crop, which is a legitimate state - the slide
  // then falls back to its desktop image on phones.
  const mobileImageUrl = v.has('mobileImageUrl')
    ? (v.optionalString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (mobileImageUrl) validateMediaUrl(v, 'mobileImageUrl', mobileImageUrl);
  const mobileImageFileId = v.has('mobileImageFileId')
    ? (v.optionalUuid('mobileImageFileId') ?? null)
    : undefined;

  v.custom(
    !(mobileImageUrl && mobileImageFileId),
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateSweetsHeroSlideInput = {
    eyebrow: v.optionalString('eyebrow', { min: 2, max: 120 }),
    headline,
    subhead: v.optionalString('subhead', { min: 3, max: SUBHEAD_MAX }),
    microTrust: v.has('microTrust')
      ? (v.optionalString('microTrust', { max: MICRO_TRUST_MAX }) ?? null)
      : undefined,
    cta: readCta(v, 'cta', false),
    secondaryCta: readCta(v, 'secondaryCta', false),
    imageUrl,
    imageFileId,
    mobileImageUrl,
    mobileImageFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSweetsHeroSlideStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
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
export function validateReorderSweetsHeroSlides(body: unknown): ReorderSweetsHeroSlidesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_SWEETS_HERO_SLIDES });

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

export function validateSweetsHeroSlideListQuery(query: Record<string, unknown>): {
  filters: SweetsHeroSlideFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SweetsHeroSlideFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
