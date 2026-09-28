// src/modules/industry-pages/spices-agro-page/validators/capabilities-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import { SPICES_AGRO_ICON_NAMES, SpicesAgroIconName, isSpicesAgroIconName } from '../utils/icons';
import {
  CreateSpicesAgroCapabilityInput,
  ReorderSpicesAgroCapabilitiesInput,
  SpicesAgroCapabilityFilters,
  UpdateSpicesAgroCapabilityInput,
  UpsertSpicesAgroCapabilitiesPanelInput,
} from '../types/capabilities-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 300;

// ── the background panel ──────────────────────────────────────────────────

/** A full replacement. With neither source the site keeps its own background. */
export function validateUpsertSpicesAgroCapabilitiesPanel(
  body: unknown,
): UpsertSpicesAgroCapabilitiesPanelInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors spices_agro_capabilities_panel_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  v.assert();
  return { imageUrl, imageFileId };
}

// ── the capabilities ──────────────────────────────────────────────────────

/** An unknown name would render a question mark on the live page. */
function readIcon(v: Validator, required: boolean): SpicesAgroIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isSpicesAgroIconName(raw),
    'icon',
    `icon must be one of the available icons: ${SPICES_AGRO_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isSpicesAgroIconName(raw) ? raw : undefined;
}

export function validateCreateSpicesAgroCapability(
  body: unknown,
): CreateSpicesAgroCapabilityInput {
  const v = validator(body);

  const dto: CreateSpicesAgroCapabilityInput = {
    title: v.requiredString('title', { min: 2, max: TITLE_MAX }),
    description: v.requiredString('description', { min: 3, max: DESCRIPTION_MAX }),
    icon: readIcon(v, true) as SpicesAgroIconName,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateSpicesAgroCapability(
  body: unknown,
): UpdateSpicesAgroCapabilityInput {
  const v = validator(body);

  v.requireAtLeastOne(['title', 'description', 'icon', 'displayOrder', 'status']);

  const dto: UpdateSpicesAgroCapabilityInput = {
    title: v.has('title') ? v.requiredString('title', { min: 2, max: TITLE_MAX }) : undefined,
    description: v.has('description') ? v.requiredString('description', { min: 3, max: DESCRIPTION_MAX }) : undefined,
    icon: readIcon(v, false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSpicesAgroCapabilityStatus(body: unknown): {
  status: ContentStatus;
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateReorderSpicesAgroCapabilities(
  body: unknown,
): ReorderSpicesAgroCapabilitiesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_SPICES_AGRO_CAPABILITIES });

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

export function validateSpicesAgroCapabilityListQuery(query: Record<string, unknown>): {
  filters: SpicesAgroCapabilityFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SpicesAgroCapabilityFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
