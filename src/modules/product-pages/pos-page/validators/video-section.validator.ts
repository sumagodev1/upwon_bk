// src/modules/product-pages/pos-page/validators/video-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreatePosVideoEntryInput,
  PosVideoEntryFilters,
  ReorderInput,
  UpdatePosVideoEntryInput,
} from '../types/video-section.types';

/** Matched against the source text, so the limit is an authoring limit. */
const VIDEO_URL_MAX = 1000;

export function validateCreatePosVideoEntry(body: unknown): CreatePosVideoEntryInput {
  const v = validator(body);

  const videoUrl = v.optionalString('videoUrl', { max: VIDEO_URL_MAX }) ?? null;
  if (videoUrl) validateMediaUrl(v, 'videoUrl', videoUrl);

  const videoFileId = v.optionalUuid('videoFileId') ?? null;

  // Mirrors pos_video_entries_single_video_source_check.
  v.custom(
    videoUrl === null || videoFileId === null,
    'videoUrl',
    'Provide either videoUrl or videoFileId, not both',
    'CONFLICTING_VIDEO_SOURCE',
  );

  /*
   * Mirrors pos_video_entries_video_required_check. The section is a video
   * showcase, so an entry without one is an empty player under a heading that
   * promises a video.
   */
  v.custom(
    videoUrl !== null || videoFileId !== null,
    'videoFileId',
    'This section needs a video: upload one or give a video URL',
    'REQUIRED',
  );

  const dto: CreatePosVideoEntryInput = {
    videoUrl,
    videoFileId,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdatePosVideoEntry(body: unknown): UpdatePosVideoEntryInput {
  const v = validator(body);

  v.requireAtLeastOne(['videoUrl', 'videoFileId', 'displayOrder', 'status']);

  /*
   * `null` clears the field; `undefined` (absent) leaves it alone.
   * optionalString conflates the two, so the presence check has to be explicit.
   */
  const videoUrl = v.has('videoUrl')
    ? (v.optionalString('videoUrl', { max: VIDEO_URL_MAX }) ?? null)
    : undefined;
  if (videoUrl) validateMediaUrl(v, 'videoUrl', videoUrl);

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

  const dto: UpdatePosVideoEntryInput = {
    videoUrl,
    videoFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validatePosVideoEntryStatus(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validatePosVideoEntryReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_POS_VIDEO_ENTRIES });

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

export function validatePosVideoEntryListQuery(query: Record<string, unknown>): {
  filters: PosVideoEntryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: PosVideoEntryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
