// src/modules/industry-pages/engineering-manufacturing-page/validators/coverage-section.validator.ts

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
  CreateEngineeringCoverageCategoryInput,
  EngineeringCoverageCategoryFilters,
  ReorderEngineeringCoverageCategoriesInput,
  UpdateEngineeringCoverageCategoryInput,
  UpsertEngineeringCoveragePanelInput,
} from '../types/coverage-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const LABEL_MAX = 120;

// ── the background panel ──────────────────────────────────────────────────

/**
 * A full replacement. The image is optional - with neither source the site
 * keeps the illustration it ships.
 */
export function validateUpsertEngineeringCoveragePanel(
  body: unknown,
): UpsertEngineeringCoveragePanelInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors engineering_coverage_panel_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  v.assert();
  return { imageUrl, imageFileId };
}

// ── the categories ────────────────────────────────────────────────────────

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

export function validateCreateEngineeringCoverageCategory(
  body: unknown,
): CreateEngineeringCoverageCategoryInput {
  const v = validator(body);

  const dto: CreateEngineeringCoverageCategoryInput = {
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    icon: readIcon(v, true) as EngineeringIconName,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateEngineeringCoverageCategory(
  body: unknown,
): UpdateEngineeringCoverageCategoryInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'icon', 'displayOrder', 'status']);

  const dto: UpdateEngineeringCoverageCategoryInput = {
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    icon: readIcon(v, false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateEngineeringCoverageCategoryStatus(body: unknown): {
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
export function validateReorderEngineeringCoverageCategories(
  body: unknown,
): ReorderEngineeringCoverageCategoriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_ENGINEERING_COVERAGE_CATEGORIES });

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

export function validateEngineeringCoverageCategoryListQuery(query: Record<string, unknown>): {
  filters: EngineeringCoverageCategoryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: EngineeringCoverageCategoryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
