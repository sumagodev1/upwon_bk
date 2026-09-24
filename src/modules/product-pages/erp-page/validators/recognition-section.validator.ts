// src/modules/product-pages/erp-page/validators/recognition-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import { ERP_ICON_NAMES, ErpIconName, isErpIconName } from '../utils/icons';
import {
  CreateErpIndustryBenefitInput,
  CreateErpIndustryFeatureInput,
  CreateErpIndustryInput,
  ErpIndustryFilters,
  ReorderInput,
  UpdateErpIndustryBenefitInput,
  UpdateErpIndustryFeatureInput,
  UpdateErpIndustryInput,
} from '../types/recognition-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const NAME_MAX = 160;
const SLUG_MAX = 80;
const SHORT_DESC_MAX = 400;
const ERP_TITLE_MAX = 200;
const ERP_DESC_MAX = 600;
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const FEATURE_TITLE_MAX = 160;
const FEATURE_DESC_MAX = 600;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render nothing at all on the live page - the site maps
 * names to components through a fixed lookup - so this is the one place that
 * can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, field: string, required: boolean): ErpIconName | undefined {
  if (!required && !v.has(field)) return undefined;

  const raw = required
    ? v.requiredString(field, { min: 1, max: 60 })
    : (v.optionalString(field, { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isErpIconName(raw),
    field,
    `${field} must be one of the available icons: ${ERP_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isErpIconName(raw) ? raw : undefined;
}

/**
 * A slug is lowercase words joined by single hyphens.
 *
 * Mirrors erp_industries_slug_format_check. Checked rather than generated from
 * the name: it is what deep links point at, so it has to survive a rename,
 * which means an author owns it.
 */
function checkSlug(v: Validator, slug: string): void {
  v.custom(
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug),
    'slug',
    'slug must be lowercase letters, digits and single hyphens - like spices-condiments',
    'INVALID_SLUG',
  );
}

export function validateCreateErpIndustry(body: unknown): CreateErpIndustryInput {
  const v = validator(body);

  const slug = v.requiredString('slug', { min: 2, max: SLUG_MAX });
  if (slug) checkSlug(v, slug);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors erp_industries_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  // Mirrors erp_industries_image_required_check.
  v.custom(
    imageUrl !== null || imageFileId !== null,
    'imageFileId',
    'An industry needs a photo: upload one or give an image URL',
    'REQUIRED',
  );

  const dashboardUrl = v.optionalString('dashboardUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (dashboardUrl) validateMediaUrl(v, 'dashboardUrl', dashboardUrl);
  const dashboardFileId = v.optionalUuid('dashboardFileId') ?? null;

  v.custom(
    dashboardUrl === null || dashboardFileId === null,
    'dashboardUrl',
    'Provide either dashboardUrl or dashboardFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: CreateErpIndustryInput = {
    name: v.requiredString('name', { min: 2, max: NAME_MAX }),
    slug,
    icon: readIcon(v, 'icon', true) as ErpIconName,
    shortDescription: v.requiredString('shortDescription', { min: 3, max: SHORT_DESC_MAX }),
    erpTitle: v.requiredString('erpTitle', { min: 3, max: ERP_TITLE_MAX }),
    erpDescription: v.requiredString('erpDescription', { min: 3, max: ERP_DESC_MAX }),
    imageUrl,
    imageFileId,
    imageAlt: v.optionalString('imageAlt', { max: ALT_MAX }) ?? null,
    dashboardUrl,
    dashboardFileId,
    dashboardAlt: v.optionalString('dashboardAlt', { max: ALT_MAX }) ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpIndustry(body: unknown): UpdateErpIndustryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'name',
    'slug',
    'icon',
    'shortDescription',
    'erpTitle',
    'erpDescription',
    'imageUrl',
    'imageFileId',
    'imageAlt',
    'dashboardUrl',
    'dashboardFileId',
    'dashboardAlt',
    'displayOrder',
    'status',
  ]);

  const slug = v.has('slug') ? v.requiredString('slug', { min: 2, max: SLUG_MAX }) : undefined;
  if (slug) checkSlug(v, slug);

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
  /*
   * Clearing both at once would leave the industry with no photo, which the
   * CHECK constraint rejects. Clearing one while the other is already stored
   * is fine and is resolved in the repository, which can see the current row.
   */
  v.custom(
    !(imageUrl === null && imageFileId === null),
    'imageFileId',
    'An industry needs a photo: upload one or give an image URL',
    'REQUIRED',
  );

  const dashboardUrl = v.has('dashboardUrl')
    ? (v.optionalString('dashboardUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (dashboardUrl) validateMediaUrl(v, 'dashboardUrl', dashboardUrl);
  const dashboardFileId = v.has('dashboardFileId')
    ? (v.optionalUuid('dashboardFileId') ?? null)
    : undefined;

  v.custom(
    !(dashboardUrl && dashboardFileId),
    'dashboardUrl',
    'Provide either dashboardUrl or dashboardFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateErpIndustryInput = {
    name: v.optionalString('name', { min: 2, max: NAME_MAX }),
    slug,
    icon: readIcon(v, 'icon', false),
    shortDescription: v.optionalString('shortDescription', { min: 3, max: SHORT_DESC_MAX }),
    erpTitle: v.optionalString('erpTitle', { min: 3, max: ERP_TITLE_MAX }),
    erpDescription: v.optionalString('erpDescription', { min: 3, max: ERP_DESC_MAX }),
    imageUrl,
    imageFileId,
    imageAlt: v.has('imageAlt') ? (v.optionalString('imageAlt', { max: ALT_MAX }) ?? null) : undefined,
    dashboardUrl,
    dashboardFileId,
    dashboardAlt: v.has('dashboardAlt')
      ? (v.optionalString('dashboardAlt', { max: ALT_MAX }) ?? null)
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── features ──────────────────────────────────────────────────────────────

export function validateCreateErpIndustryFeature(
  body: unknown,
): CreateErpIndustryFeatureInput {
  const v = validator(body);

  const dto: CreateErpIndustryFeatureInput = {
    title: v.requiredString('title', { min: 2, max: FEATURE_TITLE_MAX }),
    description: v.requiredString('description', { min: 3, max: FEATURE_DESC_MAX }),
    icon: readIcon(v, 'icon', true) as ErpIconName,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpIndustryFeature(
  body: unknown,
): UpdateErpIndustryFeatureInput {
  const v = validator(body);

  v.requireAtLeastOne(['title', 'description', 'icon', 'displayOrder', 'status']);

  const dto: UpdateErpIndustryFeatureInput = {
    title: v.optionalString('title', { min: 2, max: FEATURE_TITLE_MAX }),
    description: v.optionalString('description', { min: 3, max: FEATURE_DESC_MAX }),
    icon: readIcon(v, 'icon', false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── benefits ──────────────────────────────────────────────────────────────

export function validateCreateErpIndustryBenefit(
  body: unknown,
): CreateErpIndustryBenefitInput {
  const v = validator(body);

  const dto: CreateErpIndustryBenefitInput = {
    title: v.requiredString('title', { min: 2, max: FEATURE_TITLE_MAX }),
    icon: readIcon(v, 'icon', true) as ErpIconName,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpIndustryBenefit(
  body: unknown,
): UpdateErpIndustryBenefitInput {
  const v = validator(body);

  v.requireAtLeastOne(['title', 'icon', 'displayOrder', 'status']);

  const dto: UpdateErpIndustryBenefitInput = {
    title: v.optionalString('title', { min: 2, max: FEATURE_TITLE_MAX }),
    icon: readIcon(v, 'icon', false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateErpStatusBody(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
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
export function validateErpReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', {
    max: Math.max(
      LIMITS.MAX_ERP_INDUSTRIES,
      LIMITS.MAX_ERP_INDUSTRY_FEATURES,
      LIMITS.MAX_ERP_INDUSTRY_BENEFITS,
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

export function validateErpIndustryListQuery(query: Record<string, unknown>): {
  filters: ErpIndustryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ErpIndustryFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
