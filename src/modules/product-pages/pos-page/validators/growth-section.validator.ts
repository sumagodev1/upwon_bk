// src/modules/product-pages/pos-page/validators/growth-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { hasBalancedAccentMarkers } from '../../../home-page/utils/heading-markup';
import { validateLinkHref } from '../utils/link';
import {
  CreatePosGrowthFeatureInput,
  CreatePosGrowthTierInput,
  PosGrowthTierFilters,
  ReorderInput,
  UpdatePosGrowthFeatureInput,
  UpdatePosGrowthTierInput,
  UpsertPosGrowthSectionInput,
} from '../types/growth-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const NAME_MAX = 40;
const SLUG_MAX = 80;
const LEAD_MAX = 120;
const TAGLINE_MAX = 200;
const SCOPE_MAX = 160;
const INHERITS_MAX = 160;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;
const FOOTNOTE_MAX = 400;
const FEATURE_LABEL_MAX = 255;

/**
 * A slug is lowercase words joined by single hyphens.
 *
 * Mirrors pos_growth_tiers_slug_format_check. Checked rather than generated
 * from the name: it is what a deep link points at, so it has to survive a
 * rename, which means an author owns it.
 */
function checkSlug(v: Validator, slug: string): void {
  v.custom(
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug),
    'slug',
    'slug must be lowercase letters, digits and single hyphens - like core',
    'INVALID_SLUG',
  );
}

/**
 * The line under the row.
 *
 * Nothing is required: the row of cards reads fine without it, so an empty
 * body is how an editor leaves it alone and an explicit null turns it off.
 */
export function validateUpsertPosGrowthSection(body: unknown): UpsertPosGrowthSectionInput {
  const v = validator(body);

  /*
   * `null` clears the line; `undefined` (absent) leaves it alone; and a
   * whitespace-only string is a clear too.
   *
   * That last case is why this is not a plain optionalString call.
   * optionalString treats a blank as a missing REQUIRED value and fails with
   * "footnote is required" - which on a field the section renders perfectly
   * well without is both wrong and confusing, and is exactly what an editor
   * gets for selecting the line and pressing delete. Collapsing it to null
   * matches what the Clear button sends, so both routes to "no line" agree.
   */
  const footnoteRaw = (body as Record<string, unknown> | null)?.footnote;
  const footnote = !v.has('footnote')
    ? undefined
    : typeof footnoteRaw === 'string' && footnoteRaw.trim() === ''
      ? null
      : (v.optionalString('footnote', { max: FOOTNOTE_MAX }) ?? null);

  /*
   * The line is drawn with an orange half, so it takes the same accent
   * grammar the headings do - and the same check, because an unclosed marker
   * would render the literal asterisks to a visitor.
   */
  if (footnote) {
    v.custom(
      hasBalancedAccentMarkers(footnote),
      'footnote',
      'footnote has an unclosed ** accent marker; wrap accented words as **like this**',
      'UNBALANCED_ACCENT_MARKER',
    );
  }

  const dto: UpsertPosGrowthSectionInput = { footnote };

  v.assert();
  return dto;
}

export function validateCreatePosGrowthTier(body: unknown): CreatePosGrowthTierInput {
  const v = validator(body);

  const slug = v.requiredString('slug', { min: 2, max: SLUG_MAX });
  if (slug) checkSlug(v, slug);

  const buttonHref = v.requiredString('buttonHref', { min: 1, max: BUTTON_HREF_MAX });
  if (buttonHref) validateLinkHref(v, 'buttonHref', buttonHref);

  const dto: CreatePosGrowthTierInput = {
    name: v.requiredString('name', { min: 1, max: NAME_MAX }),
    slug,
    lead: v.requiredString('lead', { min: 1, max: LEAD_MAX }),
    tagline: v.requiredString('tagline', { min: 3, max: TAGLINE_MAX }),
    scope: v.requiredString('scope', { min: 2, max: SCOPE_MAX }),
    /*
     * Nullable, not blank-able: the entry-level tier has no tier beneath it to
     * build on, and "no such line" is a different thing from "an empty line".
     */
    inheritsLabel: v.optionalString('inheritsLabel', { max: INHERITS_MAX }) ?? null,
    buttonLabel: v.requiredString('buttonLabel', { min: 1, max: BUTTON_LABEL_MAX }),
    buttonHref,
    isPopular: v.optionalBoolean('isPopular') ?? false,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdatePosGrowthTier(body: unknown): UpdatePosGrowthTierInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'name',
    'slug',
    'lead',
    'tagline',
    'scope',
    'inheritsLabel',
    'buttonLabel',
    'buttonHref',
    'isPopular',
    'displayOrder',
    'status',
  ]);

  const slug = v.has('slug') ? v.requiredString('slug', { min: 2, max: SLUG_MAX }) : undefined;
  if (slug) checkSlug(v, slug);

  const buttonHref = v.has('buttonHref')
    ? v.requiredString('buttonHref', { min: 1, max: BUTTON_HREF_MAX })
    : undefined;
  if (buttonHref) validateLinkHref(v, 'buttonHref', buttonHref);

  const dto: UpdatePosGrowthTierInput = {
    name: v.optionalString('name', { min: 1, max: NAME_MAX }),
    slug,
    lead: v.optionalString('lead', { min: 1, max: LEAD_MAX }),
    tagline: v.optionalString('tagline', { min: 3, max: TAGLINE_MAX }),
    scope: v.optionalString('scope', { min: 2, max: SCOPE_MAX }),
    // `null` clears the bold first tick; absent leaves it alone.
    inheritsLabel: v.has('inheritsLabel')
      ? (v.optionalString('inheritsLabel', { max: INHERITS_MAX }) ?? null)
      : undefined,
    buttonLabel: v.optionalString('buttonLabel', { min: 1, max: BUTTON_LABEL_MAX }),
    buttonHref,
    isPopular: v.optionalBoolean('isPopular'),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// -- the ticks --------------------------------------------------------------

export function validateCreatePosGrowthFeature(body: unknown): CreatePosGrowthFeatureInput {
  const v = validator(body);

  const dto: CreatePosGrowthFeatureInput = {
    label: v.requiredString('label', { min: 2, max: FEATURE_LABEL_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdatePosGrowthFeature(body: unknown): UpdatePosGrowthFeatureInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'displayOrder', 'status']);

  const dto: UpdatePosGrowthFeatureInput = {
    label: v.optionalString('label', { min: 2, max: FEATURE_LABEL_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// -- shared -----------------------------------------------------------------

export function validatePosGrowthStatusBody(body: unknown): { status: ContentStatus } {
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
export function validatePosGrowthReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', {
    max: Math.max(LIMITS.MAX_POS_GROWTH_TIERS, LIMITS.MAX_POS_GROWTH_FEATURES),
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

export function validatePosGrowthTierListQuery(query: Record<string, unknown>): {
  filters: PosGrowthTierFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: PosGrowthTierFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
