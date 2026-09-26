// src/modules/product-pages/pos-page/validators/proof-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import { POS_ICON_NAMES, PosIconName, isPosIconName } from '../utils/icons';
import {
  CreatePosProofLogoInput,
  CreatePosProofStatInput,
  PosProofLogoFilters,
  PosProofStatFilters,
  ReorderInput,
  UpdatePosProofLogoInput,
  UpdatePosProofStatInput,
} from '../types/proof-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const LABEL_MAX = 160;
const VALUE_MAX = 40;

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

  // Mirrors pos_proof_logos_single_image_source_check.
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

export function validateCreatePosProofLogo(body: unknown): CreatePosProofLogoInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, true);

  const dto: CreatePosProofLogoInput = {
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

export function validateUpdatePosProofLogo(body: unknown): UpdatePosProofLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readImagePair(v, false);

  const dto: UpdatePosProofLogoInput = {
    imageUrl,
    imageFileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validatePosProofLogoListQuery(query: Record<string, unknown>): {
  filters: PosProofLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: PosProofLogoFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the numbers ───────────────────────────────────────────────────────────

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render a question mark on the live page - the site
 * maps names to components through a fixed lookup - so this is the one place
 * that can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, required: boolean): PosIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isPosIconName(raw),
    'icon',
    `icon must be one of the available icons: ${POS_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isPosIconName(raw) ? raw : undefined;
}

export function validateCreatePosProofStat(body: unknown): CreatePosProofStatInput {
  const v = validator(body);

  const dto: CreatePosProofStatInput = {
    icon: readIcon(v, true) as PosIconName,
    /*
     * A minimum of one, not two: "48%" is three characters and "8" is a
     * perfectly good figure on its own.
     */
    value: v.requiredString('value', { min: 1, max: VALUE_MAX }),
    /*
     * Required, and this is the field that carries the source: the row has no
     * second line, so "6,000+" with no label is a number on a page claiming
     * not to make unsourced claims.
     */
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdatePosProofStat(body: unknown): UpdatePosProofStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'value', 'label', 'displayOrder', 'status']);

  const dto: UpdatePosProofStatInput = {
    icon: readIcon(v, false),
    value: v.has('value') ? v.requiredString('value', { min: 1, max: VALUE_MAX }) : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validatePosProofStatListQuery(query: Record<string, unknown>): {
  filters: PosProofStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: PosProofStatFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validatePosProofStatusBody(body: unknown): { status: ContentStatus } {
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

export const validatePosProofLogoReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_POS_PROOF_LOGOS);

export const validatePosProofStatReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_POS_PROOF_STATS);
