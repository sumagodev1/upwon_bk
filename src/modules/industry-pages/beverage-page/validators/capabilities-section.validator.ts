// src/modules/industry-pages/beverage-page/validators/capabilities-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  BeverageCapabilityFilters,
  CreateBeverageCapabilityInput,
  ReorderBeverageCapabilitiesInput,
  UpdateBeverageCapabilityInput,
  UpsertBeverageCapabilitiesPanelInput,
} from '../types/capabilities-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 400;

/**
 * Reads an image pair. Optional throughout, but the two sources cannot arrive
 * together. On update an absent key means "leave it alone".
 */
function readImagePair(
  v: Validator,
  isUpdate: boolean,
): { imageUrl: string | null | undefined; imageFileId: string | null | undefined } {
  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  if (!isUpdate) return { imageUrl, imageFileId };
  return {
    imageUrl: v.has('imageUrl') ? imageUrl : undefined,
    imageFileId: v.has('imageFileId') ? imageFileId : undefined,
  };
}

// ── the background panel ──────────────────────────────────────────────────

/** A full replacement. With neither source the site keeps its own background. */
export function validateUpsertBeverageCapabilitiesPanel(
  body: unknown,
): UpsertBeverageCapabilitiesPanelInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, false);
  v.assert();
  return { imageUrl: imageUrl ?? null, imageFileId: imageFileId ?? null };
}

// ── the capabilities ──────────────────────────────────────────────────────

export function validateCreateBeverageCapability(body: unknown): CreateBeverageCapabilityInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, false);

  const dto: CreateBeverageCapabilityInput = {
    title: v.requiredString('title', { min: 3, max: TITLE_MAX }),
    description: v.requiredString('description', { min: 3, max: DESCRIPTION_MAX }),
    imageUrl: imageUrl ?? null,
    imageFileId: imageFileId ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateBeverageCapability(body: unknown): UpdateBeverageCapabilityInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'title',
    'description',
    'imageUrl',
    'imageFileId',
    'displayOrder',
    'status',
  ]);
  const { imageUrl, imageFileId } = readImagePair(v, true);

  const dto: UpdateBeverageCapabilityInput = {
    title: v.has('title') ? v.requiredString('title', { min: 3, max: TITLE_MAX }) : undefined,
    description: v.has('description')
      ? v.requiredString('description', { min: 3, max: DESCRIPTION_MAX })
      : undefined,
    imageUrl,
    imageFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateBeverageCapabilityStatus(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateReorderBeverageCapabilities(
  body: unknown,
): ReorderBeverageCapabilitiesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_BEVERAGE_CAPABILITIES });

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

export function validateBeverageCapabilityListQuery(query: Record<string, unknown>): {
  filters: BeverageCapabilityFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BeverageCapabilityFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
