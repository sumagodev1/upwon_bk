// src/modules/industry-pages/qsr-franchise-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateQsrFranchiseTrustLogoInput,
  CreateQsrFranchiseTrustStatInput,
  QsrFranchiseTrustLogoFilters,
  QsrFranchiseTrustStatFilters,
  ReorderInput,
  UpdateQsrFranchiseTrustLogoInput,
  UpdateQsrFranchiseTrustStatInput,
  UpsertQsrFranchiseTrustPanelInput,
} from '../types/trust-section.types';
import { QSR_FRANCHISE_ICON_NAMES, QsrFranchiseIconName, isQsrFranchiseIconName } from '../utils/icons';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const LABEL_MAX = 160;
const VALUE_MAX = 40;
const DESCRIPTION_MAX = 300;

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

  // Mirrors qsr_franchise_trust_logos_single_image_source_check.
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

export function validateCreateQsrFranchiseTrustLogo(body: unknown): CreateQsrFranchiseTrustLogoInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, true);

  const dto: CreateQsrFranchiseTrustLogoInput = {
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

export function validateUpdateQsrFranchiseTrustLogo(body: unknown): UpdateQsrFranchiseTrustLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readImagePair(v, false);

  const dto: UpdateQsrFranchiseTrustLogoInput = {
    imageUrl,
    imageFileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateQsrFranchiseTrustLogoListQuery(query: Record<string, unknown>): {
  filters: QsrFranchiseTrustLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: QsrFranchiseTrustLogoFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the stat tiles ────────────────────────────────────────────────────────

/**
 * Reads the icon. Required on create; on update absent means "leave it".
 * Checked against the allowlist, because the site can only draw names it maps.
 */
function readIcon(v: Validator, required: boolean): QsrFranchiseIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const icon = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');

  v.custom(
    icon === '' || isQsrFranchiseIconName(icon),
    'icon',
    `icon must be one of the available icons: ${QSR_FRANCHISE_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );
  return icon as QsrFranchiseIconName;
}

export function validateCreateQsrFranchiseTrustStat(body: unknown): CreateQsrFranchiseTrustStatInput {
  const v = validator(body);

  const dto: CreateQsrFranchiseTrustStatInput = {
    value: v.requiredString('value', { min: 1, max: VALUE_MAX }),
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    description: v.requiredString('description', { min: 3, max: DESCRIPTION_MAX }),
    icon: readIcon(v, true) as QsrFranchiseIconName,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateQsrFranchiseTrustStat(body: unknown): UpdateQsrFranchiseTrustStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['value', 'label', 'description', 'icon', 'displayOrder', 'status']);

  const dto: UpdateQsrFranchiseTrustStatInput = {
    value: v.has('value') ? v.requiredString('value', { min: 1, max: VALUE_MAX }) : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    description: v.has('description')
      ? v.requiredString('description', { min: 3, max: DESCRIPTION_MAX })
      : undefined,
    icon: readIcon(v, false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateQsrFranchiseTrustStatListQuery(query: Record<string, unknown>): {
  filters: QsrFranchiseTrustStatFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: QsrFranchiseTrustStatFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the photographs ───────────────────────────────────────────────────────

/** Reads one photograph's pair. Optional, but its two sources cannot both arrive. */
function readPhoto(
  v: Validator,
  urlField: string,
  fileField: string,
): { url: string | null; fileId: string | null } {
  const url = v.optionalString(urlField, { max: IMAGE_URL_MAX }) ?? null;
  if (url) validateMediaUrl(v, urlField, url);
  const fileId = v.optionalUuid(fileField) ?? null;

  // Mirrors the panel table's single-source checks.
  v.custom(
    url === null || fileId === null,
    urlField,
    `Provide either ${urlField} or ${fileField}, not both`,
    'CONFLICTING_IMAGE_SOURCE',
  );
  return { url, fileId };
}

/**
 * A full replacement. Both photographs are optional - with neither source the
 * site keeps the one it ships in that place. They are decorative, so there is
 * no description to collect.
 */
export function validateUpsertQsrFranchiseTrustPanel(
  body: unknown,
): UpsertQsrFranchiseTrustPanelInput {
  const v = validator(body);

  const small = readPhoto(v, 'smallImageUrl', 'smallImageFileId');
  const tall = readPhoto(v, 'tallImageUrl', 'tallImageFileId');

  const dto: UpsertQsrFranchiseTrustPanelInput = {
    smallImageUrl: small.url,
    smallImageFileId: small.fileId,
    tallImageUrl: tall.url,
    tallImageFileId: tall.fileId,
  };

  v.assert();
  return dto;
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateQsrFranchiseTrustStatusBody(body: unknown): { status: ContentStatus } {
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

export const validateQsrFranchiseTrustLogoReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_QSR_FRANCHISE_TRUST_LOGOS);

export const validateQsrFranchiseTrustStatReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_QSR_FRANCHISE_TRUST_STATS);
