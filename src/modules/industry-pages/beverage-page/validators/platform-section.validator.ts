// src/modules/industry-pages/beverage-page/validators/platform-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  BEVERAGE_ICON_NAMES,
  BeverageIconName,
  isBeverageIconName,
} from '../utils/icons';
import {
  CreateBeveragePlatformWorkflowInput,
  BeveragePlatformWorkflowFilters,
  ReorderBeveragePlatformWorkflowsInput,
  UpdateBeveragePlatformWorkflowInput,
  UpsertBeveragePlatformPanelInput,
} from '../types/platform-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const LIST_LABEL_MAX = 80;
const LABEL_MAX = 120;

// ── the panel ─────────────────────────────────────────────────────────────

/**
 * A full replacement: every field is read, and an absent optional one means
 * "clear it". The image is optional - with neither source the site keeps the
 * background it ships.
 */
export function validateUpsertBeveragePlatformPanel(
  body: unknown,
): UpsertBeveragePlatformPanelInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors beverage_platform_panel_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpsertBeveragePlatformPanelInput = {
    imageUrl,
    imageFileId,
    listLabel: v.optionalString('listLabel', { max: LIST_LABEL_MAX }) || null,
  };

  v.assert();
  return dto;
}

// ── the workflows ─────────────────────────────────────────────────────────

/** An unknown name would render a question mark on the live page. */
function readIcon(v: Validator, required: boolean): BeverageIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isBeverageIconName(raw),
    'icon',
    `icon must be one of the available icons: ${BEVERAGE_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isBeverageIconName(raw) ? raw : undefined;
}

export function validateCreateBeveragePlatformWorkflow(
  body: unknown,
): CreateBeveragePlatformWorkflowInput {
  const v = validator(body);

  const dto: CreateBeveragePlatformWorkflowInput = {
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    icon: readIcon(v, true) as BeverageIconName,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateBeveragePlatformWorkflow(
  body: unknown,
): UpdateBeveragePlatformWorkflowInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'icon', 'displayOrder', 'status']);

  const dto: UpdateBeveragePlatformWorkflowInput = {
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    icon: readIcon(v, false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateBeveragePlatformWorkflowStatus(body: unknown): {
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
export function validateReorderBeveragePlatformWorkflows(
  body: unknown,
): ReorderBeveragePlatformWorkflowsInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_BEVERAGE_PLATFORM_WORKFLOWS });

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

export function validateBeveragePlatformWorkflowListQuery(query: Record<string, unknown>): {
  filters: BeveragePlatformWorkflowFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BeveragePlatformWorkflowFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
