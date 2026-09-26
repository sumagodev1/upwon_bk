// src/modules/industry-pages/engineering-manufacturing-page/validators/platform-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  ENGINEERING_ICON_NAMES,
  EngineeringIconName,
  isEngineeringIconName,
} from '../utils/icons';
import {
  CreateEngineeringPlatformWorkflowInput,
  EngineeringPlatformWorkflowFilters,
  ReorderEngineeringPlatformWorkflowsInput,
  UpdateEngineeringPlatformWorkflowInput,
  UpsertEngineeringPlatformPanelInput,
} from '../types/platform-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const IMAGE_ALT_MAX = 300;
const LIST_LABEL_MAX = 80;
const LABEL_MAX = 120;

/** Mirrors engineering_platform_workflows_*_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

// ── the centre panel ──────────────────────────────────────────────────────

/**
 * A full replacement: every field is read, and an absent optional one means
 * "clear it". The image is optional - with neither source the site keeps the
 * illustration it ships.
 */
export function validateUpsertEngineeringPlatformPanel(
  body: unknown,
): UpsertEngineeringPlatformPanelInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors engineering_platform_panel_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpsertEngineeringPlatformPanelInput = {
    imageUrl,
    imageFileId,
    imageAlt: v.requiredString('imageAlt', { min: 3, max: IMAGE_ALT_MAX }),
    listLabel: v.optionalString('listLabel', { max: LIST_LABEL_MAX }) || null,
  };

  v.assert();
  return dto;
}

// ── the workflows ─────────────────────────────────────────────────────────

/** An unknown name would render a question mark on the live page. */
function readIcon(v: Validator, required: boolean): EngineeringIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isEngineeringIconName(raw),
    'icon',
    `icon must be one of the available icons: ${ENGINEERING_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isEngineeringIconName(raw) ? raw : undefined;
}

/** Six hex digits with a leading hash - what the site puts in a style attribute. */
function readColor(
  v: Validator,
  field: 'accentColor' | 'tintColor',
  required: boolean,
): string | undefined {
  if (!required && !v.has(field)) return undefined;

  const raw = required
    ? v.requiredString(field, { min: 7, max: 7 })
    : (v.optionalString(field, { max: 7 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    HEX_COLOR.test(raw),
    field,
    `${field} must be a six-digit hex colour, like #2F6FED`,
    'INVALID_COLOR',
  );

  return HEX_COLOR.test(raw) ? raw : undefined;
}

export function validateCreateEngineeringPlatformWorkflow(
  body: unknown,
): CreateEngineeringPlatformWorkflowInput {
  const v = validator(body);

  const dto: CreateEngineeringPlatformWorkflowInput = {
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    icon: readIcon(v, true) as EngineeringIconName,
    accentColor: readColor(v, 'accentColor', true) as string,
    tintColor: readColor(v, 'tintColor', true) as string,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateEngineeringPlatformWorkflow(
  body: unknown,
): UpdateEngineeringPlatformWorkflowInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'icon', 'accentColor', 'tintColor', 'displayOrder', 'status']);

  const dto: UpdateEngineeringPlatformWorkflowInput = {
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    icon: readIcon(v, false),
    accentColor: readColor(v, 'accentColor', false),
    tintColor: readColor(v, 'tintColor', false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateEngineeringPlatformWorkflowStatus(body: unknown): {
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
export function validateReorderEngineeringPlatformWorkflows(
  body: unknown,
): ReorderEngineeringPlatformWorkflowsInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_ENGINEERING_PLATFORM_WORKFLOWS });

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

export function validateEngineeringPlatformWorkflowListQuery(query: Record<string, unknown>): {
  filters: EngineeringPlatformWorkflowFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: EngineeringPlatformWorkflowFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
