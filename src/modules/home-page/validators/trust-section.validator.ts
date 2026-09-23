// src/modules/home-page/validators/trust-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import { hasBalancedAccentMarkers } from '../utils/heading-markup';
import {
  CreateTrustEntryInput,
  ReorderTrustEntriesInput,
  TrustEntryFilters,
  UpdateTrustEntryInput,
} from '../types/trust-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const HEADING_MAX = 300;
const SUBTEXT_MAX = 600;
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 120;

/**
 * An absolute http(s) URL, or a site-relative path like '/images/logo.webp'.
 *
 * Anything else is rejected rather than escaped: this value goes straight into
 * an `src` attribute on the public site, and the schemes worth blocking there
 * (`javascript:`, `data:`) are exactly the ones a validator can enumerate away.
 */
function validateImageUrl(v: Validator, field: string, value: string): void {
  if (value.startsWith('/')) {
    v.custom(
      !value.startsWith('//'),
      field,
      `${field} must not be protocol-relative; give a full https:// URL instead`,
      'INVALID_IMAGE_URL',
    );
    return;
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }

  v.custom(
    parsed !== null && (parsed.protocol === 'https:' || parsed.protocol === 'http:'),
    field,
    `${field} must be an https:// URL or a site-relative path starting with '/'`,
    'INVALID_IMAGE_URL',
  );
}

/**
 * The two pairing rules the CHECK constraints also enforce, hoisted here so a
 * caller gets a field error rather than a 409 from the database.
 *
 * A logo needs its brand name, and a counter is both halves or neither - one
 * alone renders as a dangling number or a floating label.
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
    'A stat needs both a value and a label, or neither',
    'INCOMPLETE_STAT',
  );
}

export function validateCreateTrustEntry(body: unknown): CreateTrustEntryInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) {
    v.custom(
      hasBalancedAccentMarkers(heading),
      'heading',
      'heading has an unclosed ** accent marker; wrap accented words as **like this**',
      'UNBALANCED_ACCENT_MARKER',
    );
  }

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateImageUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors home_trust_entries_single_image_source_check.
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

  const dto: CreateTrustEntryInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: 120 }),
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
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

export function validateUpdateTrustEntry(body: unknown): UpdateTrustEntryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'eyebrow',
    'heading',
    'subtext',
    'imageUrl',
    'imageFileId',
    'imageAlt',
    'statValue',
    'statLabel',
    'displayOrder',
    'status',
  ]);

  const heading = v.has('heading')
    ? v.requiredString('heading', { min: 3, max: HEADING_MAX })
    : undefined;
  if (heading) {
    v.custom(
      hasBalancedAccentMarkers(heading),
      'heading',
      'heading has an unclosed ** accent marker; wrap accented words as **like this**',
      'UNBALANCED_ACCENT_MARKER',
    );
  }

  // `null` clears the field; `undefined` (absent) leaves it alone. optionalString
  // conflates the two, so the presence check has to be explicit.
  const imageUrl = v.has('imageUrl')
    ? (v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (imageUrl) validateImageUrl(v, 'imageUrl', imageUrl);

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
   * which can see the current row - and the CHECK constraint is the backstop.
   */
  if (imageAlt !== undefined || imageUrl !== undefined || imageFileId !== undefined) {
    if (imageUrl !== undefined && imageFileId !== undefined && imageAlt !== undefined) {
      validatePairs(
        v,
        { url: imageUrl, fileId: imageFileId, alt: imageAlt },
        { value: statValue ?? null, label: statLabel ?? null },
      );
    }
  }
  if (statValue !== undefined && statLabel !== undefined) {
    const hasValue = Boolean(statValue && statValue.trim());
    const hasLabel = Boolean(statLabel && statLabel.trim());
    v.custom(
      hasValue === hasLabel,
      hasValue ? 'statLabel' : 'statValue',
      'A stat needs both a value and a label, or neither',
      'INCOMPLETE_STAT',
    );
  }

  const dto: UpdateTrustEntryInput = {
    eyebrow: v.optionalString('eyebrow', { min: 2, max: 120 }),
    heading,
    subtext: v.optionalString('subtext', { min: 3, max: SUBTEXT_MAX }),
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

export function validateTrustEntryStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates, which
 * a "move entry X to position N" endpoint can when two admins drag at once.
 */
export function validateReorderTrustEntries(body: unknown): ReorderTrustEntriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_TRUST_ENTRIES });

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

export function validateTrustEntryListQuery(query: Record<string, unknown>): {
  filters: TrustEntryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: TrustEntryFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
