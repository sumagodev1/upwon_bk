// src/modules/home-page/validators/industries-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import { hasBalancedAccentMarkers } from '../utils/heading-markup';
import {
  CreateIndustriesEntryInput,
  IndustriesEntryFilters,
  ReorderIndustriesEntriesInput,
  UpdateIndustriesEntryInput,
} from '../types/industries-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const HEADING_MAX = 300;
const SUBTEXT_MAX = 600;
const VIDEO_URL_MAX = 1000;

/**
 * An absolute http(s) URL, or a site-relative path like '/video/intro.mp4'.
 *
 * Anything else is rejected rather than escaped: this value goes straight into
 * a `src` attribute on the public site, and the schemes worth blocking there
 * (`javascript:`, `data:`) are exactly the ones a validator can enumerate away.
 */
function validateVideoUrl(v: Validator, field: string, value: string): void {
  if (value.startsWith('/')) {
    v.custom(
      !value.startsWith('//'),
      field,
      `${field} must not be protocol-relative; give a full https:// URL instead`,
      'INVALID_VIDEO_URL',
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
    'INVALID_VIDEO_URL',
  );
}

export function validateCreateIndustriesEntry(body: unknown): CreateIndustriesEntryInput {
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

  const videoUrl = v.optionalString('videoUrl', { max: VIDEO_URL_MAX }) ?? null;
  if (videoUrl) validateVideoUrl(v, 'videoUrl', videoUrl);

  const videoFileId = v.optionalUuid('videoFileId') ?? null;

  // Mirrors home_industries_entries_single_video_source_check.
  v.custom(
    videoUrl === null || videoFileId === null,
    'videoUrl',
    'Provide either videoUrl or videoFileId, not both',
    'CONFLICTING_VIDEO_SOURCE',
  );

  // Mirrors home_industries_entries_video_required_check. The section is a
  // video showcase, so an entry without one is an empty player under a heading.
  v.custom(
    videoUrl !== null || videoFileId !== null,
    'videoFileId',
    'This section needs a video: upload one or give a video URL',
    'REQUIRED',
  );

  const dto: CreateIndustriesEntryInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: 120 }),
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    videoUrl,
    videoFileId,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateIndustriesEntry(body: unknown): UpdateIndustriesEntryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'eyebrow',
    'heading',
    'subtext',
    'videoUrl',
    'videoFileId',
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
  const videoUrl = v.has('videoUrl')
    ? (v.optionalString('videoUrl', { max: VIDEO_URL_MAX }) ?? null)
    : undefined;
  if (videoUrl) validateVideoUrl(v, 'videoUrl', videoUrl);

  const videoFileId = v.has('videoFileId') ? (v.optionalUuid('videoFileId') ?? null) : undefined;

  v.custom(
    !(videoUrl && videoFileId),
    'videoUrl',
    'Provide either videoUrl or videoFileId, not both',
    'CONFLICTING_VIDEO_SOURCE',
  );

  /*
   * Clearing both at once would leave the entry with no video, which the CHECK
   * constraint rejects. Clearing one while the other is already stored is fine
   * and is resolved in the repository, which can see the current row.
   */
  v.custom(
    !(videoUrl === null && videoFileId === null),
    'videoFileId',
    'This section needs a video: upload one or give a video URL',
    'REQUIRED',
  );

  const dto: UpdateIndustriesEntryInput = {
    eyebrow: v.optionalString('eyebrow', { min: 2, max: 120 }),
    heading,
    subtext: v.optionalString('subtext', { min: 3, max: SUBTEXT_MAX }),
    videoUrl,
    videoFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateIndustriesEntryStatus(body: unknown): {
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
 * a "move entry X to position N" endpoint can when two admins drag at once.
 */
export function validateReorderIndustriesEntries(
  body: unknown,
): ReorderIndustriesEntriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_INDUSTRIES_ENTRIES });

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

export function validateIndustriesEntryListQuery(query: Record<string, unknown>): {
  filters: IndustriesEntryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: IndustriesEntryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
