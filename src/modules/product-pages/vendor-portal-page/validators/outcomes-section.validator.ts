// src/modules/product-pages/vendor-portal-page/validators/outcomes-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import {
  CreateVmsOutcomeVideoInput,
  ReorderInput,
  UpdateVmsOutcomeVideoInput,
  VmsOutcomeVideoFilters,
} from '../types/outcomes-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LABEL_MAX = 120;
const BADGE_MAX = 120;
const DURATION_MAX = 20;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 1200;
const HREF_MAX = 500;
const MEDIA_URL_MAX = 1000;

/**
 * Both halves of the button, or neither.
 *
 * Mirrors vms_outcome_videos_button_pair_check: a label with no destination
 * is a dead link, and a destination with no label is invisible.
 */
function assertButtonPair(
  v: Validator,
  label: string | null | undefined,
  href: string | null | undefined,
): void {
  // `undefined` means "not named in this request", which is not a pair to
  // check - only a request that names one or both is judged here.
  if (label === undefined && href === undefined) return;

  const hasLabel = Boolean(label);
  const hasHref = Boolean(href);
  v.custom(
    hasLabel === hasHref,
    'buttonLabel',
    'The button needs both a label and a destination, or neither',
    'INCOMPLETE_PAIR',
  );
}

export function validateCreateVmsOutcomeVideo(body: unknown): CreateVmsOutcomeVideoInput {
  const v = validator(body);

  const videoUrl = v.optionalString('videoUrl', { max: MEDIA_URL_MAX }) ?? null;
  if (videoUrl) validateMediaUrl(v, 'videoUrl', videoUrl);
  const videoFileId = v.optionalUuid('videoFileId') ?? null;

  const posterUrl = v.optionalString('posterUrl', { max: MEDIA_URL_MAX }) ?? null;
  if (posterUrl) validateMediaUrl(v, 'posterUrl', posterUrl);
  const posterFileId = v.optionalUuid('posterFileId') ?? null;

  // Mirrors the two single-source CHECKs: a slot holds a path or an upload,
  // never both, because the site would have to guess which to draw.
  v.custom(
    videoUrl === null || videoFileId === null,
    'videoUrl',
    'Provide either videoUrl or videoFileId, not both',
    'CONFLICTING_VIDEO_SOURCE',
  );
  v.custom(
    posterUrl === null || posterFileId === null,
    'posterUrl',
    'Provide either posterUrl or posterFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const buttonLabel = v.optionalString('buttonLabel', { max: LABEL_MAX }) ?? null;
  const buttonHref = v.optionalString('buttonHref', { max: HREF_MAX }) ?? null;
  if (buttonHref) validateLinkHref(v, 'buttonHref', buttonHref);
  assertButtonPair(v, buttonLabel, buttonHref);

  const dto: CreateVmsOutcomeVideoInput = {
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    badge: v.requiredString('badge', { min: 2, max: BADGE_MAX }),
    /*
     * Free text rather than a parsed duration: it is printed beside the pill
     * exactly as typed, and "2:15" is not a number. Optional, because a tab
     * is usable without it.
     */
    duration: v.optionalString('duration', { max: DURATION_MAX }) ?? null,
    title: v.requiredString('title', { min: 2, max: TITLE_MAX }),
    description: v.requiredString('description', { min: 10, max: DESCRIPTION_MAX }),
    buttonLabel,
    buttonHref,
    /*
     * The film is optional. The three entries shipped today share one
     * placeholder clip that belongs to the site, and a row that could not be
     * saved without a real film would stop an editor writing the copy first.
     */
    videoUrl,
    videoFileId,
    posterUrl,
    posterFileId,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateVmsOutcomeVideo(body: unknown): UpdateVmsOutcomeVideoInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'label',
    'badge',
    'duration',
    'title',
    'description',
    'buttonLabel',
    'buttonHref',
    'videoUrl',
    'videoFileId',
    'posterUrl',
    'posterFileId',
    'displayOrder',
    'status',
  ]);

  /*
   * Every media half is nullable here, unlike on a card built around its
   * picture: an entry with no film is a legitimate state, so clearing one is
   * a real edit rather than a half-finished save.
   */
  const videoUrl = v.has('videoUrl')
    ? (v.optionalString('videoUrl', { max: MEDIA_URL_MAX }) ?? null)
    : undefined;
  if (videoUrl) validateMediaUrl(v, 'videoUrl', videoUrl);
  const videoFileId = v.has('videoFileId') ? (v.optionalUuid('videoFileId') ?? null) : undefined;

  const posterUrl = v.has('posterUrl')
    ? (v.optionalString('posterUrl', { max: MEDIA_URL_MAX }) ?? null)
    : undefined;
  if (posterUrl) validateMediaUrl(v, 'posterUrl', posterUrl);
  const posterFileId = v.has('posterFileId')
    ? (v.optionalUuid('posterFileId') ?? null)
    : undefined;

  v.custom(
    !(videoUrl && videoFileId),
    'videoUrl',
    'Provide either videoUrl or videoFileId, not both',
    'CONFLICTING_VIDEO_SOURCE',
  );
  v.custom(
    !(posterUrl && posterFileId),
    'posterUrl',
    'Provide either posterUrl or posterFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const buttonLabel = v.has('buttonLabel')
    ? (v.optionalString('buttonLabel', { max: LABEL_MAX }) ?? null)
    : undefined;
  const buttonHref = v.has('buttonHref')
    ? (v.optionalString('buttonHref', { max: HREF_MAX }) ?? null)
    : undefined;
  if (buttonHref) validateLinkHref(v, 'buttonHref', buttonHref);
  assertButtonPair(v, buttonLabel, buttonHref);

  const dto: UpdateVmsOutcomeVideoInput = {
    label: v.optionalString('label', { min: 2, max: LABEL_MAX }),
    badge: v.optionalString('badge', { min: 2, max: BADGE_MAX }),
    duration: v.has('duration')
      ? (v.optionalString('duration', { max: DURATION_MAX }) ?? null)
      : undefined,
    title: v.optionalString('title', { min: 2, max: TITLE_MAX }),
    description: v.optionalString('description', { min: 10, max: DESCRIPTION_MAX }),
    buttonLabel,
    buttonHref,
    videoUrl,
    videoFileId,
    posterUrl,
    posterFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateVmsOutcomeVideoListQuery(query: Record<string, unknown>): {
  filters: VmsOutcomeVideoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: VmsOutcomeVideoFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateVmsOutcomeStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateVmsOutcomeVideoReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_VMS_OUTCOME_VIDEOS });

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
