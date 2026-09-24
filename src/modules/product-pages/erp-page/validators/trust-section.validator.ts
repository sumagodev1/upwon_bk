// src/modules/product-pages/erp-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateErpTrustEntryInput,
  ErpTrustEntryFilters,
  ReorderErpTrustEntriesInput,
  UpdateErpTrustEntryInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 120;

/**
 * The three pairing rules the CHECK constraints also enforce, hoisted here so
 * a caller gets a field error rather than a 409 from the database.
 *
 * A logo needs its brand name, a counter is both halves or neither, and an
 * entry carrying neither a logo nor a counter contributes nothing at all.
 */
function validatePairs(
  v: Validator,
  image: { url: string | null; fileId: string | null; alt: string | null },
  stat: { value: string | null; label: string | null },
): void {
  const hasImage = Boolean(image.url || image.fileId);
  v.custom(
    !hasImage || Boolean(image.alt && image.alt.trim()),
    'imageAlt',
    'A logo needs a brand name, which is also its alt text',
    'REQUIRED',
  );

  const hasValue = Boolean(stat.value && stat.value.trim());
  const hasLabel = Boolean(stat.label && stat.label.trim());
  v.custom(
    hasValue === hasLabel,
    hasValue ? 'statLabel' : 'statValue',
    'A number needs both a value and a label, or neither',
    'INCOMPLETE_STAT',
  );

  v.custom(
    hasImage || hasValue,
    'imageFileId',
    'An entry needs a logo, a number, or both',
    'EMPTY_ENTRY',
  );
}

export function validateCreateErpTrustEntry(body: unknown): CreateErpTrustEntryInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors erp_trust_entries_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const imageAlt = v.optionalString('imageAlt', { max: ALT_MAX }) ?? null;
  const statValue = v.optionalString('statValue', { max: STAT_VALUE_MAX }) ?? null;
  const statLabel = v.optionalString('statLabel', { max: STAT_LABEL_MAX }) ?? null;

  validatePairs(
    v,
    { url: imageUrl, fileId: imageFileId, alt: imageAlt },
    { value: statValue, label: statLabel },
  );

  const dto: CreateErpTrustEntryInput = {
    imageUrl,
    imageFileId,
    imageAlt,
    statValue,
    statLabel,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpTrustEntry(body: unknown): UpdateErpTrustEntryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'imageUrl',
    'imageFileId',
    'imageAlt',
    'statValue',
    'statLabel',
    'displayOrder',
    'status',
  ]);

  // `null` clears the field; `undefined` (absent) leaves it alone. optionalString
  // conflates the two, so the presence check has to be explicit.
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

  const imageAlt = v.has('imageAlt')
    ? (v.optionalString('imageAlt', { max: ALT_MAX }) ?? null)
    : undefined;
  const statValue = v.has('statValue')
    ? (v.optionalString('statValue', { max: STAT_VALUE_MAX }) ?? null)
    : undefined;
  const statLabel = v.has('statLabel')
    ? (v.optionalString('statLabel', { max: STAT_LABEL_MAX }) ?? null)
    : undefined;

  /*
   * Only checkable when the patch carries both halves of a pair. A patch that
   * sets one half against a stored other half is resolved in the service,
   * which can see the current row - and the CHECK constraints are the backstop.
   */
  if (statValue !== undefined && statLabel !== undefined) {
    const hasValue = Boolean(statValue && statValue.trim());
    const hasLabel = Boolean(statLabel && statLabel.trim());
    v.custom(
      hasValue === hasLabel,
      hasValue ? 'statLabel' : 'statValue',
      'A number needs both a value and a label, or neither',
      'INCOMPLETE_STAT',
    );
  }

  if (imageUrl !== undefined && imageFileId !== undefined && imageAlt !== undefined) {
    validatePairs(
      v,
      { url: imageUrl, fileId: imageFileId, alt: imageAlt },
      { value: statValue ?? null, label: statLabel ?? null },
    );
  }

  const dto: UpdateErpTrustEntryInput = {
    imageUrl,
    imageFileId,
    imageAlt,
    statValue,
    statLabel,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateErpTrustEntryStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateReorderErpTrustEntries(body: unknown): ReorderErpTrustEntriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_ERP_TRUST_ENTRIES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one entry id', 'REQUIRED');

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

export function validateErpTrustEntryListQuery(query: Record<string, unknown>): {
  filters: ErpTrustEntryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ErpTrustEntryFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
