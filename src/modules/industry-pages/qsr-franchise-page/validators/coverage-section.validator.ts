// src/modules/industry-pages/qsr-franchise-page/validators/coverage-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import { QSR_FRANCHISE_ICON_NAMES, QsrFranchiseIconName, isQsrFranchiseIconName } from '../utils/icons';
import {
  CreateQsrFranchiseCoverageCategoryInput,
  ReorderInput,
  QsrFranchiseCoverageCategoryFilters,
  UpdateQsrFranchiseCoverageCategoryInput,
} from '../types/coverage-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const LABEL_MAX = 120;

// ── the categories ──────────────────────────────────────────────────────────

/**
 * Reads the image pair.
 *
 * On create exactly one source is required - a format's card is its photo. On update either may be absent, meaning "leave it alone", but the two
 * still cannot arrive together, and the repository clears the other side when
 * one is set.
 */
/** An unknown name would render a question mark on the live page. */
function readIcon(v: Validator, required: boolean): QsrFranchiseIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const icon = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');

  v.custom(
    icon === '' || isQsrFranchiseIconName(icon),
    'icon',
    `icon must be one of the available icons: ${QSR_FRANCHISE_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );
  return icon as QsrFranchiseIconName;
}

function readImagePair(
  v: Validator,
  required: boolean,
): { imageUrl: string | null | undefined; imageFileId: string | null | undefined } {
  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors qsr_franchise_coverage_categories_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  if (required) {
    v.custom(
      imageUrl !== null || imageFileId !== null,
      'imageUrl',
      'A category needs a photo: give either imageUrl or imageFileId',
      'REQUIRED',
    );
    return { imageUrl, imageFileId };
  }

  return {
    imageUrl: v.has('imageUrl') ? imageUrl : undefined,
    imageFileId: v.has('imageFileId') ? imageFileId : undefined,
  };
}

export function validateCreateQsrFranchiseCoverageCategory(body: unknown): CreateQsrFranchiseCoverageCategoryInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, true);

  const dto: CreateQsrFranchiseCoverageCategoryInput = {
    imageUrl: imageUrl ?? null,
    imageFileId: imageFileId ?? null,
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    icon: readIcon(v, true) as QsrFranchiseIconName,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateQsrFranchiseCoverageCategory(body: unknown): UpdateQsrFranchiseCoverageCategoryInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'label', 'icon', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readImagePair(v, false);

  const dto: UpdateQsrFranchiseCoverageCategoryInput = {
    imageUrl,
    imageFileId,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    icon: readIcon(v, false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateQsrFranchiseCoverageCategoryListQuery(query: Record<string, unknown>): {
  filters: QsrFranchiseCoverageCategoryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: QsrFranchiseCoverageCategoryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateQsrFranchiseCoverageStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
function validateReorder(body: unknown, max: number): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max });

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

export const validateQsrFranchiseCoverageCategoryReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_QSR_FRANCHISE_COVERAGE_CATEGORIES);
