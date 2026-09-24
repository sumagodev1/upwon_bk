// src/modules/product-pages/fms-page/validators/proof-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import { FMS_ICON_NAMES, FmsIconName, isFmsIconName } from '../utils/icons';
import {
  CreateFmsProofLogoInput,
  CreateFmsProofStatInput,
  FmsProofLogoFilters,
  FmsProofStatFilters,
  ReorderInput,
  UpdateFmsProofLogoInput,
  UpdateFmsProofStatInput,
} from '../types/proof-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const LABEL_MAX = 160;
const SUBTEXT_MAX = 160;
const VALUE_MAX = 40;

/** Mirrors fms_proof_stats_accent_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

// ── the brand wall ────────────────────────────────────────────────────────

/**
 * Reads the image pair.
 *
 * On create exactly one source is required - a logo row exists only to show a
 * mark, so one with neither is an empty card in the wall. On update either may
 * be absent, meaning "leave it alone", but the two still cannot arrive
 * together, and the repository clears the other side when one is set.
 */
function readImagePair(
  v: Validator,
  required: boolean,
): { imageUrl: string | null | undefined; imageFileId: string | null | undefined } {
  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors fms_proof_logos_single_image_source_check.
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

  /*
   * On update, an absent key means "unchanged" rather than "clear": clearing
   * both would leave a row the table's image-required check rejects anyway.
   */
  return {
    imageUrl: v.has('imageUrl') ? imageUrl : undefined,
    imageFileId: v.has('imageFileId') ? imageFileId : undefined,
  };
}

export function validateCreateFmsProofLogo(body: unknown): CreateFmsProofLogoInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, true);

  const dto: CreateFmsProofLogoInput = {
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

export function validateUpdateFmsProofLogo(body: unknown): UpdateFmsProofLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readImagePair(v, false);

  const dto: UpdateFmsProofLogoInput = {
    imageUrl,
    imageFileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateFmsProofLogoListQuery(query: Record<string, unknown>): {
  filters: FmsProofLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FmsProofLogoFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the numbers ───────────────────────────────────────────────────────────

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render a question mark on the live page - the site maps
 * names to components through a fixed lookup - so this is the one place that
 * can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, required: boolean): FmsIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isFmsIconName(raw),
    'icon',
    `icon must be one of the available icons: ${FMS_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isFmsIconName(raw) ? raw : undefined;
}

/**
 * Reads the accent colour.
 *
 * Six hex digits with a leading hash, because that is what the site
 * interpolates into a style attribute and what it slices apart to derive the
 * icon tint. A named colour or an rgba() string would pass straight through the
 * first use and break the second.
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
    'accentColor must be a six-digit hex colour, like #1D6FE0',
    'INVALID_COLOR',
  );

  return HEX_COLOR.test(raw) ? raw : undefined;
}

export function validateCreateFmsProofStat(body: unknown): CreateFmsProofStatInput {
  const v = validator(body);

  const dto: CreateFmsProofStatInput = {
    icon: readIcon(v, true) as FmsIconName,
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    /*
     * Required, unlike a decorative line elsewhere: it is where the figure
     * comes from, and a number on this strip without its source is exactly the
     * inflated claim the section's own copy says it is not making.
     */
    subtext: v.requiredString('subtext', { min: 2, max: SUBTEXT_MAX }),
    /*
     * A minimum of one, not two: "16" is two characters and "8" is a perfectly
     * good figure on its own.
     */
    value: v.requiredString('value', { min: 1, max: VALUE_MAX }),
    accentColor: readAccentColor(v, true) as string,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateFmsProofStat(body: unknown): UpdateFmsProofStatInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'icon',
    'label',
    'subtext',
    'value',
    'accentColor',
    'displayOrder',
    'status',
  ]);

  const dto: UpdateFmsProofStatInput = {
    icon: readIcon(v, false),
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    subtext: v.has('subtext')
      ? v.requiredString('subtext', { min: 2, max: SUBTEXT_MAX })
      : undefined,
    value: v.has('value') ? v.requiredString('value', { min: 1, max: VALUE_MAX }) : undefined,
    accentColor: readAccentColor(v, false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateFmsProofStatListQuery(query: Record<string, unknown>): {
  filters: FmsProofStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FmsProofStatFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateFmsProofStatusBody(body: unknown): { status: ContentStatus } {
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

export const validateFmsProofLogoReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_FMS_PROOF_LOGOS);

export const validateFmsProofStatReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_FMS_PROOF_STATS);
