// src/modules/product-pages/sfa-dms-page/validators/proof-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import {
  CreateSfaProofLogoInput,
  CreateSfaProofStatInput,
  ReorderInput,
  SfaProofLogoFilters,
  SfaProofStatFilters,
  UpdateSfaProofLogoInput,
  UpdateSfaProofStatInput,
  UpsertSfaProofPanelInput,
} from '../types/proof-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const PANEL_HEADING_MAX = 160;
const PANEL_BODY_MAX = 1200;
const LINK_LABEL_MAX = 120;
const LINK_HREF_MAX = 500;
const LOGOS_LABEL_MAX = 120;
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 255;

// ── the left card ─────────────────────────────────────────────────────────

export function validateUpsertSfaProofPanel(body: unknown): UpsertSfaProofPanelInput {
  const v = validator(body);

  const linkLabel = v.optionalString('linkLabel', { max: LINK_LABEL_MAX }) ?? null;
  const linkHref = v.optionalString('linkHref', { max: LINK_HREF_MAX }) ?? null;
  if (linkHref) validateLinkHref(v, 'linkHref', linkHref);

  /*
   * Mirrors sfa_proof_panel_link_pair_check. Both or neither: a label with no
   * destination is a dead link, and a destination with no label is invisible.
   */
  v.custom(
    (linkLabel === null) === (linkHref === null),
    'linkLabel',
    'Give the link both a label and a destination, or leave both empty',
    'INCOMPLETE_LINK',
  );

  const dto: UpsertSfaProofPanelInput = {
    heading: v.requiredString('heading', { min: 2, max: PANEL_HEADING_MAX }),
    bodyText: v.requiredString('bodyText', { min: 10, max: PANEL_BODY_MAX }),
    linkLabel,
    linkHref,
    logosLabel: v.optionalString('logosLabel', { max: LOGOS_LABEL_MAX }) ?? null,
  };

  v.assert();
  return dto;
}

// ── the customer logos ────────────────────────────────────────────────────

/**
 * Reads the image pair.
 *
 * On create exactly one source is required - a logo row exists only to show a
 * mark, so one with neither is an empty gap in the marquee. On update either
 * may be absent, meaning "leave it alone", but the two still cannot arrive
 * together, and the repository clears the other side when one is set.
 */
function readImagePair(
  v: Validator,
  required: boolean,
): { imageUrl: string | null | undefined; imageFileId: string | null | undefined } {
  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors sfa_proof_logos_single_image_source_check.
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

export function validateCreateSfaProofLogo(body: unknown): CreateSfaProofLogoInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, true);

  const dto: CreateSfaProofLogoInput = {
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

export function validateUpdateSfaProofLogo(body: unknown): UpdateSfaProofLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readImagePair(v, false);

  const dto: UpdateSfaProofLogoInput = {
    imageUrl,
    imageFileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSfaProofLogoListQuery(query: Record<string, unknown>): {
  filters: SfaProofLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SfaProofLogoFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the numbers ───────────────────────────────────────────────────────────

export function validateCreateSfaProofStat(body: unknown): CreateSfaProofStatInput {
  const v = validator(body);

  const dto: CreateSfaProofStatInput = {
    /*
     * A minimum of one, not two: "5x" is four characters and "8" is a
     * perfectly good figure on its own.
     */
    value: v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }),
    label: v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateSfaProofStat(body: unknown): UpdateSfaProofStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['value', 'label', 'displayOrder', 'status']);

  const dto: UpdateSfaProofStatInput = {
    value: v.has('value') ? v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }) : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSfaProofStatListQuery(query: Record<string, unknown>): {
  filters: SfaProofStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SfaProofStatFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateSfaProofStatusBody(body: unknown): { status: ContentStatus } {
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

export const validateSfaProofLogoReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_SFA_PROOF_LOGOS);

export const validateSfaProofStatReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_SFA_PROOF_STATS);
