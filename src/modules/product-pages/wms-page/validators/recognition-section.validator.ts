// src/modules/product-pages/wms-page/validators/recognition-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateWmsRecognitionCardInput,
  ReorderInput,
  UpdateWmsRecognitionCardInput,
  WmsRecognitionCardFilters,
} from '../types/recognition-section.types';

/**
 * Matched against the source text, so the limits are authoring limits rather
 * than storage ones - they are the same numbers the columns carry.
 */
const TITLE_MAX = 160;
const DESCRIPTION_MAX = 240;
const IMAGE_URL_MAX = 1000;

export function validateCreateWmsRecognitionCard(body: unknown): CreateWmsRecognitionCardInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  /*
   * Mirrors wms_recognition_cards_image_required_check: exactly one source.
   * Both at once is ambiguous about which the site should draw, and neither
   * leaves a hole in a grid where every neighbouring card is a picture.
   */
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  v.custom(
    imageUrl !== null || imageFileId !== null,
    'imageUrl',
    'A card needs its illustration: give either imageUrl or imageFileId',
    'REQUIRED',
  );

  const dto: CreateWmsRecognitionCardInput = {
    title: v.requiredString('title', { min: 2, max: TITLE_MAX }),
    /*
     * Required: a card is a picture, the kind of warehouse it stands for and
     * a line saying what this page does for it. Without the line it is a
     * label floating in a box, and the grid gives it the same height as its
     * neighbours regardless.
     */
    description: v.requiredString('description', { min: 3, max: DESCRIPTION_MAX }),
    imageUrl,
    imageFileId,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateWmsRecognitionCard(body: unknown): UpdateWmsRecognitionCardInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'title',
    'description',
    'imageUrl',
    'imageFileId',
    'displayOrder',
    'status',
  ]);

  /*
   * The illustration is required by CHECK, so neither half may be cleared on
   * its own - a patch either names a replacement or leaves the pair alone.
   * Hence `requiredString` rather than the nullable read an optional image
   * would take.
   */
  const imageUrl = v.has('imageUrl')
    ? v.requiredString('imageUrl', { min: 1, max: IMAGE_URL_MAX })
    : undefined;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.has('imageFileId') ? v.requiredUuid('imageFileId') : undefined;

  v.custom(
    !(imageUrl && imageFileId),
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateWmsRecognitionCardInput = {
    title: v.optionalString('title', { min: 2, max: TITLE_MAX }),
    description: v.optionalString('description', { min: 3, max: DESCRIPTION_MAX }),
    imageUrl,
    imageFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateWmsRecognitionCardListQuery(query: Record<string, unknown>): {
  filters: WmsRecognitionCardFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: WmsRecognitionCardFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateWmsRecognitionStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates,
 * which a "move card X to position N" endpoint can when two admins drag at
 * once.
 */
export function validateWmsRecognitionCardReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_WMS_RECOGNITION_CARDS });

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
