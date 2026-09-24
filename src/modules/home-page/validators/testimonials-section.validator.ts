// src/modules/home-page/validators/testimonials-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import {
  CreateTestimonialEntryInput,
  ReorderTestimonialEntriesInput,
  TestimonialEntryFilters,
  UpdateTestimonialEntryInput,
} from '../types/testimonials-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const MEDIA_URL_MAX = 1000;
const QUOTE_MAX = 400;
const CLIENT_NAME_MAX = 160;
const CLIENT_POSITION_MAX = 200;

/**
 * An absolute http(s) URL, or a site-relative path like '/videos/story.mp4'.
 *
 * Anything else is rejected rather than escaped: this value goes straight into
 * a `src` attribute on the public site, and the schemes worth blocking there
 * (`javascript:`, `data:`) are exactly the ones a validator can enumerate away.
 */
function validateMediaUrl(v: Validator, field: string, value: string): void {
  if (value.startsWith('/')) {
    v.custom(
      !value.startsWith('//'),
      field,
      `${field} must not be protocol-relative; give a full https:// URL instead`,
      'INVALID_MEDIA_URL',
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
    'INVALID_MEDIA_URL',
  );
}

export function validateCreateTestimonialEntry(body: unknown): CreateTestimonialEntryInput {
  const v = validator(body);

  const posterUrl = v.optionalString('posterUrl', { max: MEDIA_URL_MAX }) ?? null;
  if (posterUrl) validateMediaUrl(v, 'posterUrl', posterUrl);

  const posterFileId = v.optionalUuid('posterFileId') ?? null;

  // Mirrors home_testimonial_entries_single_poster_source_check.
  v.custom(
    posterUrl === null || posterFileId === null,
    'posterUrl',
    'Provide either posterUrl or posterFileId, not both',
    'CONFLICTING_MEDIA_SOURCE',
  );

  // Mirrors home_testimonial_entries_poster_required_check. The still is what
  // the marquee draws, so a card without one cannot appear at all.
  v.custom(
    posterUrl !== null || posterFileId !== null,
    'posterFileId',
    'A testimonial needs a poster image: upload one or give an image URL',
    'REQUIRED',
  );

  const videoUrl = v.optionalString('videoUrl', { max: MEDIA_URL_MAX }) ?? null;
  if (videoUrl) validateMediaUrl(v, 'videoUrl', videoUrl);

  const videoFileId = v.optionalUuid('videoFileId') ?? null;

  // Mirrors home_testimonial_entries_single_video_source_check. Unlike the
  // poster, neither is required - a card with no clip loses its play button.
  v.custom(
    videoUrl === null || videoFileId === null,
    'videoUrl',
    'Provide either videoUrl or videoFileId, not both',
    'CONFLICTING_MEDIA_SOURCE',
  );

  const dto: CreateTestimonialEntryInput = {
    posterUrl,
    posterFileId,
    videoUrl,
    videoFileId,
    quote: v.requiredString('quote', { min: 3, max: QUOTE_MAX }),
    clientName: v.requiredString('clientName', { min: 2, max: CLIENT_NAME_MAX }),
    clientPosition: v.requiredString('clientPosition', { min: 2, max: CLIENT_POSITION_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateTestimonialEntry(body: unknown): UpdateTestimonialEntryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'posterUrl',
    'posterFileId',
    'videoUrl',
    'videoFileId',
    'quote',
    'clientName',
    'clientPosition',
    'displayOrder',
    'status',
  ]);

  // `null` clears the field; `undefined` (absent) leaves it alone. optionalString
  // conflates the two, so the presence check has to be explicit.
  const posterUrl = v.has('posterUrl')
    ? (v.optionalString('posterUrl', { max: MEDIA_URL_MAX }) ?? null)
    : undefined;
  if (posterUrl) validateMediaUrl(v, 'posterUrl', posterUrl);

  const posterFileId = v.has('posterFileId')
    ? (v.optionalUuid('posterFileId') ?? null)
    : undefined;

  v.custom(
    !(posterUrl && posterFileId),
    'posterUrl',
    'Provide either posterUrl or posterFileId, not both',
    'CONFLICTING_MEDIA_SOURCE',
  );

  /*
   * Clearing both at once would leave the card with no still, which the CHECK
   * constraint rejects. Clearing one while the other is already stored is fine
   * and is resolved in the repository, which can see the current row.
   */
  v.custom(
    !(posterUrl === null && posterFileId === null),
    'posterFileId',
    'A testimonial needs a poster image: upload one or give an image URL',
    'REQUIRED',
  );

  const videoUrl = v.has('videoUrl')
    ? (v.optionalString('videoUrl', { max: MEDIA_URL_MAX }) ?? null)
    : undefined;
  if (videoUrl) validateMediaUrl(v, 'videoUrl', videoUrl);

  const videoFileId = v.has('videoFileId')
    ? (v.optionalUuid('videoFileId') ?? null)
    : undefined;

  v.custom(
    !(videoUrl && videoFileId),
    'videoUrl',
    'Provide either videoUrl or videoFileId, not both',
    'CONFLICTING_MEDIA_SOURCE',
  );

  const dto: UpdateTestimonialEntryInput = {
    posterUrl,
    posterFileId,
    videoUrl,
    videoFileId,
    quote: v.optionalString('quote', { min: 3, max: QUOTE_MAX }),
    clientName: v.optionalString('clientName', { min: 2, max: CLIENT_NAME_MAX }),
    clientPosition: v.optionalString('clientPosition', { min: 2, max: CLIENT_POSITION_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateTestimonialEntryStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
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
export function validateReorderTestimonialEntries(
  body: unknown,
): ReorderTestimonialEntriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_TESTIMONIAL_ENTRIES });

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

export function validateTestimonialEntryListQuery(query: Record<string, unknown>): {
  filters: TestimonialEntryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: TestimonialEntryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
