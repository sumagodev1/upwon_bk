// src/modules/industry-pages/engineering-manufacturing-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  ENGINEERING_ICON_NAMES,
  EngineeringIconName,
  isEngineeringIconName,
} from '../utils/icons';
import {
  CreateEngineeringTrustCardInput,
  CreateEngineeringTrustLogoInput,
  EngineeringTrustCardFilters,
  EngineeringTrustLogoFilters,
  ReorderInput,
  TrustFigure,
  UpdateEngineeringTrustCardInput,
  UpdateEngineeringTrustLogoInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const LABEL_MAX = 160;
const VALUE_MAX = 40;

/** Mirrors engineering_trust_cards_*_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

// ── the logo marquee ──────────────────────────────────────────────────────

/**
 * Reads the image pair.
 *
 * On create exactly one source is required - a logo row exists only to show a
 * mark. On update either may be absent, meaning "leave it alone", but the two
 * still cannot arrive together, and the repository clears the other side when
 * one is set.
 */
function readImagePair(
  v: Validator,
  required: boolean,
): { imageUrl: string | null | undefined; imageFileId: string | null | undefined } {
  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors engineering_trust_logos_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  if (required) {
    v.custom(
      imageUrl !== null || imageFileId !== null,
      'imageUrl',
      'A logo needs an image: give either imageUrl or imageFileId',
      'REQUIRED',
    );
    return { imageUrl, imageFileId };
  }

  return {
    imageUrl: v.has('imageUrl') ? imageUrl : undefined,
    imageFileId: v.has('imageFileId') ? imageFileId : undefined,
  };
}

export function validateCreateEngineeringTrustLogo(body: unknown): CreateEngineeringTrustLogoInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, true);

  const dto: CreateEngineeringTrustLogoInput = {
    imageUrl: imageUrl ?? null,
    imageFileId: imageFileId ?? null,
    alt: v.requiredString('alt', { min: 1, max: ALT_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateEngineeringTrustLogo(body: unknown): UpdateEngineeringTrustLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readImagePair(v, false);

  const dto: UpdateEngineeringTrustLogoInput = {
    imageUrl,
    imageFileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateEngineeringTrustLogoListQuery(query: Record<string, unknown>): {
  filters: EngineeringTrustLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: EngineeringTrustLogoFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the figure cards ──────────────────────────────────────────────────────

/**
 * Reads an icon name and checks it against the allowlist - an unknown name
 * would render a question mark on the live page.
 */
function readIcon(v: Validator, required: boolean): EngineeringIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isEngineeringIconName(raw),
    'icon',
    `icon must be one of the available icons: ${ENGINEERING_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isEngineeringIconName(raw) ? raw : undefined;
}

/** Six hex digits with a leading hash - what the site puts in a style attribute. */
function readColor(
  v: Validator,
  field: 'accentColor' | 'tintColor',
  required: boolean,
): string | undefined {
  if (!required && !v.has(field)) return undefined;

  const raw = required
    ? v.requiredString(field, { min: 7, max: 7 })
    : (v.optionalString(field, { max: 7 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    HEX_COLOR.test(raw),
    field,
    `${field} must be a six-digit hex colour, like #2F6FED`,
    'INVALID_COLOR',
  );

  return HEX_COLOR.test(raw) ? raw : undefined;
}

/**
 * Reads the second figure from its two flattened fields.
 *
 * Both halves or neither - a number with nothing under it, or a label with no
 * number, is what the table's pair check rejects. On an update `undefined`
 * means the patch left it alone, where `null` means clear it.
 */
function readAlternate(v: Validator, required: boolean): TrustFigure | null | undefined {
  if (!v.has('altValue') && !v.has('altLabel')) return required ? null : undefined;

  const value = v.optionalString('altValue', { max: VALUE_MAX }) ?? null;
  const label = v.optionalString('altLabel', { max: LABEL_MAX }) ?? null;

  if (value === null && label === null) return null;

  v.custom(
    value !== null && label !== null,
    value === null ? 'altValue' : 'altLabel',
    'The second figure needs both a number and a label, or neither',
    'INCOMPLETE_FIGURE',
  );

  return value !== null && label !== null ? { value, label } : null;
}

export function validateCreateEngineeringTrustCard(body: unknown): CreateEngineeringTrustCardInput {
  const v = validator(body);

  const dto: CreateEngineeringTrustCardInput = {
    icon: readIcon(v, true) as EngineeringIconName,
    accentColor: readColor(v, 'accentColor', true) as string,
    tintColor: readColor(v, 'tintColor', true) as string,
    value: v.requiredString('value', { min: 1, max: VALUE_MAX }),
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    alternate: readAlternate(v, true) ?? null,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateEngineeringTrustCard(body: unknown): UpdateEngineeringTrustCardInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'icon',
    'accentColor',
    'tintColor',
    'value',
    'label',
    'altValue',
    'altLabel',
    'displayOrder',
    'status',
  ]);

  const dto: UpdateEngineeringTrustCardInput = {
    icon: readIcon(v, false),
    accentColor: readColor(v, 'accentColor', false),
    tintColor: readColor(v, 'tintColor', false),
    value: v.has('value') ? v.requiredString('value', { min: 1, max: VALUE_MAX }) : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    alternate: readAlternate(v, false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateEngineeringTrustCardListQuery(query: Record<string, unknown>): {
  filters: EngineeringTrustCardFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: EngineeringTrustCardFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateEngineeringTrustStatusBody(body: unknown): { status: ContentStatus } {
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

export const validateEngineeringTrustLogoReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_ENGINEERING_TRUST_LOGOS);

export const validateEngineeringTrustCardReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_ENGINEERING_TRUST_CARDS);
