// src/modules/home-page/validators/values-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import { hasBalancedAccentMarkers } from '../utils/heading-markup';
import {
  CreateValuesEntryInput,
  ReorderValuesEntriesInput,
  UpdateValuesEntryInput,
  ValuesEntryFilters,
} from '../types/values-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const HEADING_MAX = 300;
const SUBTEXT_MAX = 600;
const IMAGE_URL_MAX = 1000;
const CARD_TITLE_MAX = 160;
const CARD_BODY_MAX = 600;

/**
 * An absolute http(s) URL, or a site-relative path like '/images/card.webp'.
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

export function validateCreateValuesEntry(body: unknown): CreateValuesEntryInput {
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

  // Mirrors home_values_entries_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  // Mirrors home_values_entries_image_required_check. The card is a photo
  // above its copy, so one without an image is a gap in an even grid.
  v.custom(
    imageUrl !== null || imageFileId !== null,
    'imageFileId',
    'A card needs an image: upload one or give an image URL',
    'REQUIRED',
  );

  const dto: CreateValuesEntryInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: 120 }),
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    imageUrl,
    imageFileId,
    cardTitle: v.requiredString('cardTitle', { min: 2, max: CARD_TITLE_MAX }),
    cardBody: v.requiredString('cardBody', { min: 3, max: CARD_BODY_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateValuesEntry(body: unknown): UpdateValuesEntryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'eyebrow',
    'heading',
    'subtext',
    'imageUrl',
    'imageFileId',
    'cardTitle',
    'cardBody',
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

  /*
   * Clearing both at once would leave the card with no image, which the CHECK
   * constraint rejects. Clearing one while the other is already stored is fine
   * and is resolved in the repository, which can see the current row.
   */
  v.custom(
    !(imageUrl === null && imageFileId === null),
    'imageFileId',
    'A card needs an image: upload one or give an image URL',
    'REQUIRED',
  );

  const dto: UpdateValuesEntryInput = {
    eyebrow: v.optionalString('eyebrow', { min: 2, max: 120 }),
    heading,
    subtext: v.optionalString('subtext', { min: 3, max: SUBTEXT_MAX }),
    imageUrl,
    imageFileId,
    cardTitle: v.optionalString('cardTitle', { min: 2, max: CARD_TITLE_MAX }),
    cardBody: v.optionalString('cardBody', { min: 3, max: CARD_BODY_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateValuesEntryStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates, which
 * a "move card X to position N" endpoint can when two admins drag at once.
 */
export function validateReorderValuesEntries(body: unknown): ReorderValuesEntriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_VALUES_ENTRIES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one card id', 'REQUIRED');

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

export function validateValuesEntryListQuery(query: Record<string, unknown>): {
  filters: ValuesEntryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ValuesEntryFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
