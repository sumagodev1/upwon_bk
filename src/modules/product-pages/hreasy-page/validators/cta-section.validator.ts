// src/modules/product-pages/hreasy-page/validators/cta-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import { HREASY_ICON_NAMES, HreasyIconName, isHreasyIconName } from '../utils/icons';
import {
  CreateHreasyCtaTrustItemInput,
  HreasyCtaTrustItemFilters,
  ReorderInput,
  UpdateHreasyCtaTrustItemInput,
  UpsertHreasyCtaSectionInput,
} from '../types/cta-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;
const TRUST_LINE_MAX = 120;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render a question mark on the live page - the site
 * maps names to components through a fixed lookup - so this is the one place
 * that can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, field: string, required: boolean): HreasyIconName | null {
  if (!required && !v.has(field)) return null;

  const raw = required
    ? v.requiredString(field, { min: 1, max: 60 })
    : (v.optionalString(field, { max: 60 }) ?? '');
  if (!raw) return null;

  v.custom(
    isHreasyIconName(raw),
    field,
    `${field} must be one of the available icons: ${HREASY_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isHreasyIconName(raw) ? raw : null;
}

// ── the band ──────────────────────────────────────────────────────────────

export function validateUpsertHreasyCtaSection(body: unknown): UpsertHreasyCtaSectionInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  /*
   * Mirrors hreasy_cta_section_single_image_source_check. Neither is allowed:
   * the band falls back to its white ground, which is a working design.
   */
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const primaryHref = v.requiredString('primaryHref', { min: 1, max: BUTTON_HREF_MAX });
  if (primaryHref) validateLinkHref(v, 'primaryHref', primaryHref);

  const secondaryLabel = v.optionalString('secondaryLabel', { max: BUTTON_LABEL_MAX }) ?? null;
  const secondaryHref = v.optionalString('secondaryHref', { max: BUTTON_HREF_MAX }) ?? null;
  if (secondaryHref) validateLinkHref(v, 'secondaryHref', secondaryHref);
  const secondaryIcon = readIcon(v, 'secondaryIcon', false);

  /*
   * Mirrors hreasy_cta_section_secondary_trio_check. The second button is
   * optional - the band reads fine with one - but a partial one is either a
   * dead link, an invisible destination, or a button with no glyph in a row
   * where every other button has one.
   */
  const secondaryParts = [secondaryLabel, secondaryHref, secondaryIcon].filter(
    (part) => part !== null,
  ).length;
  v.custom(
    secondaryParts === 0 || secondaryParts === 3,
    'secondaryLabel',
    'Give the second button a label, a destination and an icon, or leave all three empty',
    'INCOMPLETE_BUTTON',
  );

  const dto: UpsertHreasyCtaSectionInput = {
    imageUrl,
    imageFileId,
    // The first button is required: a closing band with no way to act on it is
    // the one section on the page that has nothing else to offer.
    primaryLabel: v.requiredString('primaryLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    primaryHref,
    primaryIcon: readIcon(v, 'primaryIcon', true) as HreasyIconName,
    secondaryLabel,
    secondaryHref,
    secondaryIcon,
  };

  v.assert();
  return dto;
}

// ── the trust strip ───────────────────────────────────────────────────────

export function validateCreateHreasyCtaTrustItem(
  body: unknown,
): CreateHreasyCtaTrustItemInput {
  const v = validator(body);

  const dto: CreateHreasyCtaTrustItemInput = {
    icon: readIcon(v, 'icon', true) as HreasyIconName,
    /*
     * Both lines are required. The strip draws them one above the other in
     * the same block, so an item with one line sits a half-height short of
     * the three beside it.
     */
    lineOne: v.requiredString('lineOne', { min: 2, max: TRUST_LINE_MAX }),
    lineTwo: v.requiredString('lineTwo', { min: 2, max: TRUST_LINE_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateHreasyCtaTrustItem(
  body: unknown,
): UpdateHreasyCtaTrustItemInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'lineOne', 'lineTwo', 'displayOrder', 'status']);

  const dto: UpdateHreasyCtaTrustItemInput = {
    icon: v.has('icon') ? (readIcon(v, 'icon', false) ?? undefined) : undefined,
    lineOne: v.has('lineOne')
      ? v.requiredString('lineOne', { min: 2, max: TRUST_LINE_MAX })
      : undefined,
    lineTwo: v.has('lineTwo')
      ? v.requiredString('lineTwo', { min: 2, max: TRUST_LINE_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateHreasyCtaTrustItemListQuery(query: Record<string, unknown>): {
  filters: HreasyCtaTrustItemFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: HreasyCtaTrustItemFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateHreasyCtaStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateHreasyCtaTrustItemReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_HREASY_CTA_TRUST_ITEMS });

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
