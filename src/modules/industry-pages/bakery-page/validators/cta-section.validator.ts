// src/modules/industry-pages/bakery-page/validators/cta-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { ERP_ICON_NAMES, isErpIconName } from '../../../product-pages/erp-page/utils/icons';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import {
  BakeryCtaFeatureFilters,
  CreateBakeryCtaFeatureInput,
  ReorderBakeryCtaFeaturesInput,
  UpdateBakeryCtaFeatureInput,
  UpsertBakeryCtaSectionInput,
} from '../types/cta-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;
const FEATURE_LABEL_MAX = 60;

// ── the band ──────────────────────────────────────────────────────────────

export function validateUpsertBakeryCtaSection(body: unknown): UpsertBakeryCtaSectionInput {
  const v = validator(body);

  const desktopImageUrl = v.optionalString('desktopImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (desktopImageUrl) validateMediaUrl(v, 'desktopImageUrl', desktopImageUrl);
  const desktopImageFileId = v.optionalUuid('desktopImageFileId') ?? null;

  /*
   * Mirrors bakery_cta_section_single_desktop_source_check. Neither is allowed:
   * the band falls back to its light ground, which is a working design.
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

  const primaryHref = v.requiredString('primaryHref', { min: 1, max: BUTTON_HREF_MAX });
  if (primaryHref) validateLinkHref(v, 'primaryHref', primaryHref);

  const secondaryLabel = v.optionalString('secondaryLabel', { max: BUTTON_LABEL_MAX }) ?? null;
  const secondaryHref = v.optionalString('secondaryHref', { max: BUTTON_HREF_MAX }) ?? null;
  if (secondaryHref) validateLinkHref(v, 'secondaryHref', secondaryHref);

  // Mirrors bakery_cta_section_secondary_pair_check.
  v.custom(
    (secondaryLabel === null) === (secondaryHref === null),
    'secondaryLabel',
    'Give the second button both a label and a destination, or leave both empty',
    'INCOMPLETE_BUTTON',
  );

  const dto: UpsertBakeryCtaSectionInput = {
    desktopImageUrl,
    desktopImageFileId,
    mobileImageUrl,
    mobileImageFileId,
    // The first button is required: a closing band with no way to act on it is
    // the one section on the page that has nothing else to offer.
    primaryLabel: v.requiredString('primaryLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    primaryHref,
    secondaryLabel,
    secondaryHref,
  };

  v.assert();
  return dto;
}

// ── the capability marks ──────────────────────────────────────────────────

/**
 * The icon is a name from the ERP page's allowlist rather than a list of this
 * page's own: the site already maps exactly those names to components, and the
 * four marks the band ships (ShoppingCart, Boxes, Settings, BarChart3) are all
 * on it.
 */
function checkIcon(v: Validator, icon: string | undefined): void {
  if (!icon) return;
  v.custom(
    isErpIconName(icon),
    'icon',
    `icon must be one of: ${ERP_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );
}

export function validateCreateBakeryCtaFeature(body: unknown): CreateBakeryCtaFeatureInput {
  const v = validator(body);

  const icon = v.requiredString('icon', { min: 1, max: 60 });
  checkIcon(v, icon);

  const dto: CreateBakeryCtaFeatureInput = {
    icon,
    label: v.requiredString('label', { min: 2, max: FEATURE_LABEL_MAX }),
    subLabel: v.requiredString('subLabel', { min: 2, max: FEATURE_LABEL_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateBakeryCtaFeature(body: unknown): UpdateBakeryCtaFeatureInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'label', 'subLabel', 'displayOrder', 'status']);

  const icon = v.has('icon') ? v.requiredString('icon', { min: 1, max: 60 }) : undefined;
  checkIcon(v, icon);

  const dto: UpdateBakeryCtaFeatureInput = {
    icon,
    label: v.has('label')
      ? v.requiredString('label', { min: 2, max: FEATURE_LABEL_MAX })
      : undefined,
    subLabel: v.has('subLabel')
      ? v.requiredString('subLabel', { min: 2, max: FEATURE_LABEL_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateBakeryCtaFeatureStatus(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateReorderBakeryCtaFeatures(body: unknown): ReorderBakeryCtaFeaturesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_BAKERY_CTA_FEATURES });

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

export function validateBakeryCtaFeatureListQuery(query: Record<string, unknown>): {
  filters: BakeryCtaFeatureFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BakeryCtaFeatureFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
