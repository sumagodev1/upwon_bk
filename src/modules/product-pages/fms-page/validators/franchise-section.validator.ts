// src/modules/product-pages/fms-page/validators/franchise-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import { FMS_ICON_NAMES, FmsIconName, isFmsIconName } from '../utils/icons';
import {
  CreateFmsFranchiseCategoryInput,
  CreateFmsFranchiseEntryInput,
  FmsFranchiseCategoryFilters,
  ReorderInput,
  UpdateFmsFranchiseCategoryInput,
  UpdateFmsFranchiseEntryInput,
} from '../types/franchise-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const NAME_MAX = 160;
const SLUG_MAX = 80;
const TAGLINE_MAX = 120;
const DESCRIPTION_MAX = 600;
const MEDIA_URL_MAX = 1000;
const EXPLORE_LABEL_MAX = 120;
const EXPLORE_HREF_MAX = 500;
const ENTRY_TITLE_MAX = 160;
const ENTRY_DESC_MAX = 400;

/** Mirrors the two CHAR(7) checks: uppercase six-digit hex, with the hash. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would draw nothing at all on the live page - the site maps
 * names to components through a fixed lookup - so this is the one place that
 * can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, field: string, required: boolean): FmsIconName | undefined {
  if (!required && !v.has(field)) return undefined;

  const raw = required
    ? v.requiredString(field, { min: 1, max: 60 })
    : (v.optionalString(field, { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isFmsIconName(raw),
    field,
    `${field} must be one of the available icons: ${FMS_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isFmsIconName(raw) ? raw : undefined;
}

/**
 * A slug is lowercase words joined by single hyphens.
 *
 * Mirrors fms_franchise_categories_slug_format_check. Checked rather than
 * generated from the name: the site keys its selected tab on it, so it has to
 * survive a rename, which means an author owns it.
 */
function checkSlug(v: Validator, slug: string): void {
  v.custom(
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug),
    'slug',
    'slug must be lowercase letters, digits and single hyphens - like ice-cream',
    'INVALID_SLUG',
  );
}

/**
 * Normalises a colour to the uppercase form the CHECK constraints expect.
 *
 * Accepting `#e85a2a` and storing `#E85A2A` rather than refusing it: the case
 * carries no meaning, and an editor pasting a lowercase hex out of a design
 * tool should not have to retype it.
 */
function readColor(
  v: Validator,
  field: string,
  raw: string | undefined,
): string | undefined {
  if (raw === undefined) return undefined;
  v.custom(
    HEX_COLOR.test(raw),
    field,
    `${field} must be a six-digit hex colour like #E85A2A`,
    'INVALID_COLOR',
  );
  return HEX_COLOR.test(raw) ? raw.toUpperCase() : undefined;
}

export function validateCreateFmsFranchiseCategory(
  body: unknown,
): CreateFmsFranchiseCategoryInput {
  const v = validator(body);

  const slug = v.requiredString('slug', { min: 2, max: SLUG_MAX });
  if (slug) checkSlug(v, slug);

  const iconUrl = v.optionalString('iconUrl', { max: MEDIA_URL_MAX }) ?? null;
  if (iconUrl) validateMediaUrl(v, 'iconUrl', iconUrl);
  const iconFileId = v.optionalUuid('iconFileId') ?? null;

  // Mirrors fms_franchise_categories_single_icon_source_check.
  v.custom(
    iconUrl === null || iconFileId === null,
    'iconUrl',
    'Provide either iconUrl or iconFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  // Mirrors fms_franchise_categories_icon_required_check.
  v.custom(
    iconUrl !== null || iconFileId !== null,
    'iconFileId',
    'A category needs a tab icon: upload one or give an image URL',
    'REQUIRED',
  );

  const imageUrl = v.optionalString('imageUrl', { max: MEDIA_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  v.custom(
    imageUrl !== null || imageFileId !== null,
    'imageFileId',
    'A category needs a panel photo: upload one or give an image URL',
    'REQUIRED',
  );

  const exploreHref = v.requiredString('exploreHref', { min: 1, max: EXPLORE_HREF_MAX });
  if (exploreHref) validateLinkHref(v, 'exploreHref', exploreHref);

  const dto: CreateFmsFranchiseCategoryInput = {
    name: v.requiredString('name', { min: 2, max: NAME_MAX }),
    slug,
    tagline: v.requiredString('tagline', { min: 2, max: TAGLINE_MAX }),
    description: v.requiredString('description', { min: 3, max: DESCRIPTION_MAX }),
    iconUrl,
    iconFileId,
    imageUrl,
    imageFileId,
    // Defaulted rather than required: every category on the page today shares
    // the brand orange, so the common case is not asking the editor at all.
    accentColor: readColor(v, 'accentColor', v.optionalString('accentColor', { max: 7 })) ?? '#E85A2A',
    surfaceColor:
      readColor(v, 'surfaceColor', v.optionalString('surfaceColor', { max: 7 })) ?? '#FBE9E2',
    exploreLabel: v.requiredString('exploreLabel', { min: 2, max: EXPLORE_LABEL_MAX }),
    exploreHref,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateFmsFranchiseCategory(
  body: unknown,
): UpdateFmsFranchiseCategoryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'name',
    'slug',
    'tagline',
    'description',
    'iconUrl',
    'iconFileId',
    'imageUrl',
    'imageFileId',
    'accentColor',
    'surfaceColor',
    'exploreLabel',
    'exploreHref',
    'displayOrder',
    'status',
  ]);

  const slug = v.has('slug') ? v.requiredString('slug', { min: 2, max: SLUG_MAX }) : undefined;
  if (slug) checkSlug(v, slug);

  // `null` clears the field; `undefined` (absent) leaves it alone.
  const iconUrl = v.has('iconUrl')
    ? (v.optionalString('iconUrl', { max: MEDIA_URL_MAX }) ?? null)
    : undefined;
  if (iconUrl) validateMediaUrl(v, 'iconUrl', iconUrl);
  const iconFileId = v.has('iconFileId') ? (v.optionalUuid('iconFileId') ?? null) : undefined;

  v.custom(
    !(iconUrl && iconFileId),
    'iconUrl',
    'Provide either iconUrl or iconFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  /*
   * Clearing both at once would leave the tab with no pictogram, which the
   * CHECK constraint rejects. Clearing one while the other is already stored
   * is fine and is resolved in the repository, which can see the current row.
   */
  v.custom(
    !(iconUrl === null && iconFileId === null),
    'iconFileId',
    'A category needs a tab icon: upload one or give an image URL',
    'REQUIRED',
  );

  const imageUrl = v.has('imageUrl')
    ? (v.optionalString('imageUrl', { max: MEDIA_URL_MAX }) ?? null)
    : undefined;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.has('imageFileId')
    ? (v.optionalUuid('imageFileId') ?? null)
    : undefined;

  v.custom(
    !(imageUrl && imageFileId),
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  v.custom(
    !(imageUrl === null && imageFileId === null),
    'imageFileId',
    'A category needs a panel photo: upload one or give an image URL',
    'REQUIRED',
  );

  const exploreHref = v.has('exploreHref')
    ? v.requiredString('exploreHref', { min: 1, max: EXPLORE_HREF_MAX })
    : undefined;
  if (exploreHref) validateLinkHref(v, 'exploreHref', exploreHref);

  const dto: UpdateFmsFranchiseCategoryInput = {
    name: v.optionalString('name', { min: 2, max: NAME_MAX }),
    slug,
    tagline: v.optionalString('tagline', { min: 2, max: TAGLINE_MAX }),
    description: v.optionalString('description', { min: 3, max: DESCRIPTION_MAX }),
    iconUrl,
    iconFileId,
    imageUrl,
    imageFileId,
    accentColor: readColor(v, 'accentColor', v.optionalString('accentColor', { max: 7 })),
    surfaceColor: readColor(v, 'surfaceColor', v.optionalString('surfaceColor', { max: 7 })),
    exploreLabel: v.optionalString('exploreLabel', { min: 2, max: EXPLORE_LABEL_MAX }),
    exploreHref,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// -- steps and benefits -----------------------------------------------------
//
// One pair of validators for both lists: a step and a benefit take the same
// three fields, and two identical copies would only drift.

export function validateCreateFmsFranchiseEntry(
  body: unknown,
): CreateFmsFranchiseEntryInput {
  const v = validator(body);

  const dto: CreateFmsFranchiseEntryInput = {
    title: v.requiredString('title', { min: 2, max: ENTRY_TITLE_MAX }),
    description: v.requiredString('description', { min: 3, max: ENTRY_DESC_MAX }),
    icon: readIcon(v, 'icon', true) as FmsIconName,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateFmsFranchiseEntry(
  body: unknown,
): UpdateFmsFranchiseEntryInput {
  const v = validator(body);

  v.requireAtLeastOne(['title', 'description', 'icon', 'displayOrder', 'status']);

  const dto: UpdateFmsFranchiseEntryInput = {
    title: v.optionalString('title', { min: 2, max: ENTRY_TITLE_MAX }),
    description: v.optionalString('description', { min: 3, max: ENTRY_DESC_MAX }),
    icon: readIcon(v, 'icon', false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// -- shared -----------------------------------------------------------------

export function validateFmsFranchiseStatusBody(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 *
 * The cap is the largest of the three lists, because one validator serves all
 * of them; each service checks the count it actually holds.
 */
export function validateFmsFranchiseReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', {
    max: Math.max(
      LIMITS.MAX_FMS_FRANCHISE_CATEGORIES,
      LIMITS.MAX_FMS_FRANCHISE_STEPS,
      LIMITS.MAX_FMS_FRANCHISE_BENEFITS,
    ),
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

export function validateFmsFranchiseCategoryListQuery(query: Record<string, unknown>): {
  filters: FmsFranchiseCategoryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FmsFranchiseCategoryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
