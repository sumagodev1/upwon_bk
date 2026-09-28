// src/modules/why-upwon-page/validators/hero-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import { hasBalancedAccentMarkers } from '../../home-page/utils/heading-markup';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import {
  CreateWhyUpwonHeroSlideInput,
  ReorderInput,
  UpdateWhyUpwonHeroSlideInput,
  WhyUpwonHeroSlideFilters,
} from '../types/hero-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const EYEBROW_MAX = 120;
const HEADLINE_MAX = 300;
const SUBHEAD_MAX = 600;
const IMAGE_URL_MAX = 1000;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;
const IMAGE_ALT_MAX = 300;

/**
 * The headline is authored in the tiny markup the other heroes use: a newline
 * is a line break and `**like this**` is the accent span.
 *
 * An unclosed marker saves cleanly and then renders a literal `**` on the live
 * page - a typo the author cannot see in the form - so it is caught here.
 */
function assertBalancedHeadline(v: Validator, headline: string | undefined): void {
  if (!headline) return;
  v.custom(
    hasBalancedAccentMarkers(headline),
    'headline',
    'Every ** accent marker must be closed by another **',
    'UNBALANCED_ACCENT',
  );
}

/**
 * The second button is optional, but both halves travel together.
 *
 * Mirrors why_upwon_hero_slides_secondary_pair_check: a label with no
 * destination is a dead link, and a destination with no label is invisible.
 */
function assertSecondaryPair(
  v: Validator,
  label: string | null | undefined,
  href: string | null | undefined,
): void {
  // `undefined` means "not named in this request", which is not a pair to
  // check - only a request that names one or both is judged here.
  if (label === undefined && href === undefined) return;
  v.custom(
    Boolean(label) === Boolean(href),
    'secondaryLabel',
    'Give the second button both a label and a destination, or leave both empty',
    'INCOMPLETE_BUTTON',
  );
}

export function validateCreateWhyUpwonHeroSlide(body: unknown): CreateWhyUpwonHeroSlideInput {
  const v = validator(body);

  const desktopImageUrl = v.optionalString('desktopImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (desktopImageUrl) validateMediaUrl(v, 'desktopImageUrl', desktopImageUrl);
  const desktopImageFileId = v.optionalUuid('desktopImageFileId') ?? null;

  /*
   * Mirrors why_upwon_hero_slides_single_desktop_source_check. Neither is
   * allowed: the site keeps the artwork it ships.
   */
  v.custom(
    desktopImageUrl === null || desktopImageFileId === null,
    'desktopImageUrl',
    'Provide either desktopImageUrl or desktopImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const mobileImageUrl = v.optionalString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (mobileImageUrl) validateMediaUrl(v, 'mobileImageUrl', mobileImageUrl);
  const mobileImageFileId = v.optionalUuid('mobileImageFileId') ?? null;

  v.custom(
    mobileImageUrl === null || mobileImageFileId === null,
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const headline = v.requiredString('headline', { min: 3, max: HEADLINE_MAX });
  assertBalancedHeadline(v, headline);

  const primaryHref = v.requiredString('primaryHref', { min: 1, max: BUTTON_HREF_MAX });
  if (primaryHref) validateLinkHref(v, 'primaryHref', primaryHref);

  const secondaryLabel = v.optionalString('secondaryLabel', { max: BUTTON_LABEL_MAX }) ?? null;
  const secondaryHref = v.optionalString('secondaryHref', { max: BUTTON_HREF_MAX }) ?? null;
  if (secondaryHref) validateLinkHref(v, 'secondaryHref', secondaryHref);
  assertSecondaryPair(v, secondaryLabel, secondaryHref);

  const dto: CreateWhyUpwonHeroSlideInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    headline,
    subhead: v.requiredString('subhead', { min: 10, max: SUBHEAD_MAX }),
    desktopImageUrl,
    desktopImageFileId,
    mobileImageUrl,
    mobileImageFileId,
    /*
     * Required even though the artwork is optional: whichever is shown - the
     * uploaded one or the site's own - it is the page's first content, so it
     * always needs describing.
     */
    imageAlt: v.requiredString('imageAlt', { min: 3, max: IMAGE_ALT_MAX }),
    // The first button is required: the hero is where a visitor decides where
    // to go next.
    primaryLabel: v.requiredString('primaryLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    primaryHref,
    secondaryLabel,
    secondaryHref,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateWhyUpwonHeroSlide(body: unknown): UpdateWhyUpwonHeroSlideInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'eyebrow',
    'headline',
    'subhead',
    'desktopImageUrl',
    'desktopImageFileId',
    'mobileImageUrl',
    'mobileImageFileId',
    'imageAlt',
    'primaryLabel',
    'primaryHref',
    'secondaryLabel',
    'secondaryHref',
    'displayOrder',
    'status',
  ]);

  /*
   * Every artwork half is nullable here: both crops are optional on this
   * hero, so clearing one is a real edit rather than a half-finished save.
   */
  const desktopImageUrl = v.has('desktopImageUrl')
    ? (v.optionalString('desktopImageUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (desktopImageUrl) validateMediaUrl(v, 'desktopImageUrl', desktopImageUrl);
  const desktopImageFileId = v.has('desktopImageFileId')
    ? (v.optionalUuid('desktopImageFileId') ?? null)
    : undefined;

  const mobileImageUrl = v.has('mobileImageUrl')
    ? (v.optionalString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (mobileImageUrl) validateMediaUrl(v, 'mobileImageUrl', mobileImageUrl);
  const mobileImageFileId = v.has('mobileImageFileId')
    ? (v.optionalUuid('mobileImageFileId') ?? null)
    : undefined;

  v.custom(
    !(desktopImageUrl && desktopImageFileId),
    'desktopImageUrl',
    'Provide either desktopImageUrl or desktopImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  v.custom(
    !(mobileImageUrl && mobileImageFileId),
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const headline = v.optionalString('headline', { min: 3, max: HEADLINE_MAX });
  assertBalancedHeadline(v, headline);

  const primaryHref = v.optionalString('primaryHref', { min: 1, max: BUTTON_HREF_MAX });
  if (primaryHref) validateLinkHref(v, 'primaryHref', primaryHref);

  const secondaryLabel = v.has('secondaryLabel')
    ? (v.optionalString('secondaryLabel', { max: BUTTON_LABEL_MAX }) ?? null)
    : undefined;
  const secondaryHref = v.has('secondaryHref')
    ? (v.optionalString('secondaryHref', { max: BUTTON_HREF_MAX }) ?? null)
    : undefined;
  if (secondaryHref) validateLinkHref(v, 'secondaryHref', secondaryHref);
  assertSecondaryPair(v, secondaryLabel, secondaryHref);

  const dto: UpdateWhyUpwonHeroSlideInput = {
    eyebrow: v.optionalString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    headline,
    subhead: v.optionalString('subhead', { min: 10, max: SUBHEAD_MAX }),
    desktopImageUrl,
    desktopImageFileId,
    mobileImageUrl,
    mobileImageFileId,
    imageAlt: v.optionalString('imageAlt', { min: 3, max: IMAGE_ALT_MAX }),
    primaryLabel: v.optionalString('primaryLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    primaryHref,
    secondaryLabel,
    secondaryHref,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateWhyUpwonHeroSlideListQuery(query: Record<string, unknown>): {
  filters: WhyUpwonHeroSlideFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: WhyUpwonHeroSlideFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateWhyUpwonHeroStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateWhyUpwonHeroSlideReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_WHY_UPWON_HERO_SLIDES });

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
