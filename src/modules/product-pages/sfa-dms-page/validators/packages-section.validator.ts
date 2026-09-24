// src/modules/product-pages/sfa-dms-page/validators/packages-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateLinkHref } from '../utils/link';
import { SFA_ICON_NAMES, SfaIconName, isSfaIconName } from '../utils/icons';
import {
  CreateSfaPackageCardInput,
  CreateSfaPackageFeatureInput,
  SfaPackageCardFilters,
  SfaPackageFeatureFilters,
  UpdateSfaPackageCardInput,
  UpdateSfaPackageFeatureInput,
} from '../types/packages-section.types';
import { ReorderInput } from '../types/proof-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const STAGE_LABEL_MAX = 40;
const TITLE_MAX = 120;
const SUBTITLE_MAX = 160;
const DESCRIPTION_MAX = 600;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;
const FEATURES_LABEL_MAX = 120;
const FEATURE_LABEL_MAX = 255;

/** Mirrors sfa_package_cards_accent_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render a question mark on the live page - the site
 * maps names to components through a fixed lookup - so this is the one place
 * that can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, required: boolean): SfaIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isSfaIconName(raw),
    'icon',
    `icon must be one of the available icons: ${SFA_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isSfaIconName(raw) ? raw : undefined;
}

/**
 * Reads the accent colour.
 *
 * Six hex digits with a leading hash, because that is what the site
 * interpolates into a style attribute and what it slices apart to derive the
 * icon tint. A named colour or an rgba() string would pass straight through
 * the first use and break the second.
 */
function readAccentColor(v: Validator, required: boolean): string | undefined {
  if (!required && !v.has('accentColor')) return undefined;

  const raw = required
    ? v.requiredString('accentColor', { min: 7, max: 7 })
    : (v.optionalString('accentColor', { max: 7 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    HEX_COLOR.test(raw),
    'accentColor',
    'accentColor must be a six-digit hex colour, like #22A45D',
    'INVALID_COLOR',
  );

  return HEX_COLOR.test(raw) ? raw : undefined;
}

// ── the cards ─────────────────────────────────────────────────────────────

export function validateCreateSfaPackageCard(body: unknown): CreateSfaPackageCardInput {
  const v = validator(body);

  const buttonHref = v.requiredString('buttonHref', { min: 1, max: BUTTON_HREF_MAX });
  if (buttonHref) validateLinkHref(v, 'buttonHref', buttonHref);

  const dto: CreateSfaPackageCardInput = {
    icon: readIcon(v, true) as SfaIconName,
    stageLabel: v.requiredString('stageLabel', { min: 1, max: STAGE_LABEL_MAX }),
    title: v.requiredString('title', { min: 1, max: TITLE_MAX }),
    subtitle: v.requiredString('subtitle', { min: 2, max: SUBTITLE_MAX }),
    description: v.requiredString('description', { min: 10, max: DESCRIPTION_MAX }),
    accentColor: readAccentColor(v, true) as string,
    /*
     * The button is required, unlike the optional buttons elsewhere: these are
     * offer cards, and one with no way to act on it is a dead end.
     */
    buttonLabel: v.requiredString('buttonLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    buttonHref,
    featuresLabel: v.requiredString('featuresLabel', { min: 2, max: FEATURES_LABEL_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateSfaPackageCard(body: unknown): UpdateSfaPackageCardInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'icon',
    'stageLabel',
    'title',
    'subtitle',
    'description',
    'accentColor',
    'buttonLabel',
    'buttonHref',
    'featuresLabel',
    'displayOrder',
    'status',
  ]);

  const buttonHref = v.has('buttonHref')
    ? v.requiredString('buttonHref', { min: 1, max: BUTTON_HREF_MAX })
    : undefined;
  if (buttonHref) validateLinkHref(v, 'buttonHref', buttonHref);

  const dto: UpdateSfaPackageCardInput = {
    icon: readIcon(v, false),
    stageLabel: v.has('stageLabel')
      ? v.requiredString('stageLabel', { min: 1, max: STAGE_LABEL_MAX })
      : undefined,
    title: v.has('title') ? v.requiredString('title', { min: 1, max: TITLE_MAX }) : undefined,
    subtitle: v.has('subtitle')
      ? v.requiredString('subtitle', { min: 2, max: SUBTITLE_MAX })
      : undefined,
    description: v.has('description')
      ? v.requiredString('description', { min: 10, max: DESCRIPTION_MAX })
      : undefined,
    accentColor: readAccentColor(v, false),
    buttonLabel: v.has('buttonLabel')
      ? v.requiredString('buttonLabel', { min: 2, max: BUTTON_LABEL_MAX })
      : undefined,
    buttonHref,
    featuresLabel: v.has('featuresLabel')
      ? v.requiredString('featuresLabel', { min: 2, max: FEATURES_LABEL_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSfaPackageCardListQuery(query: Record<string, unknown>): {
  filters: SfaPackageCardFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SfaPackageCardFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the ticks ─────────────────────────────────────────────────────────────

export function validateCreateSfaPackageFeature(body: unknown): CreateSfaPackageFeatureInput {
  const v = validator(body);

  const dto: CreateSfaPackageFeatureInput = {
    label: v.requiredString('label', { min: 2, max: FEATURE_LABEL_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateSfaPackageFeature(body: unknown): UpdateSfaPackageFeatureInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'displayOrder', 'status']);

  const dto: UpdateSfaPackageFeatureInput = {
    label: v.has('label')
      ? v.requiredString('label', { min: 2, max: FEATURE_LABEL_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSfaPackageFeatureListQuery(query: Record<string, unknown>): {
  filters: SfaPackageFeatureFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SfaPackageFeatureFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateSfaPackageStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
function validateReorder(body: unknown, max: number): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max });

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

export const validateSfaPackageCardReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_SFA_PACKAGE_CARDS);

export const validateSfaPackageFeatureReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_SFA_PACKAGE_FEATURES);
