// src/modules/industry-pages/qsr-franchise-page/validators/platform-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  QSR_FRANCHISE_ICON_NAMES,
  QsrFranchiseIconName,
  isQsrFranchiseIconName,
} from '../utils/icons';
import {
  CreateQsrFranchisePlatformWorkflowInput,
  QsrFranchisePlatformWorkflowFilters,
  ReorderQsrFranchisePlatformWorkflowsInput,
  UpdateQsrFranchisePlatformWorkflowInput,
  UpsertQsrFranchisePlatformPanelInput,
} from '../types/platform-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const LIST_LABEL_MAX = 80;
const IMAGE_ALT_MAX = 300;
const CLOSING_TITLE_MAX = 120;
const CLOSING_SUBTEXT_MAX = 160;
const LABEL_MAX = 120;

// ── the panel ─────────────────────────────────────────────────────────────

/**
 * A full replacement: every field is read, and an absent optional one means
 * "clear it". The image is optional - with neither source the site keeps the
 * artwork it ships - but its description is not, because the artwork carries
 * information rather than decoration.
 */
export function validateUpsertQsrFranchisePlatformPanel(
  body: unknown,
): UpsertQsrFranchisePlatformPanelInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors qsr_franchise_platform_panel_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpsertQsrFranchisePlatformPanelInput = {
    imageUrl,
    imageFileId,
    imageAlt: v.requiredString('imageAlt', { min: 3, max: IMAGE_ALT_MAX }),
    listLabel: v.optionalString('listLabel', { max: LIST_LABEL_MAX }) || null,
    closingTitle: v.optionalString('closingTitle', { max: CLOSING_TITLE_MAX }) || null,
    closingSubtext: v.optionalString('closingSubtext', { max: CLOSING_SUBTEXT_MAX }) || null,
  };

  v.assert();
  return dto;
}

// ── the workflows ─────────────────────────────────────────────────────────

/** An unknown name would render a question mark on the live page. */
function readIcon(v: Validator, required: boolean): QsrFranchiseIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isQsrFranchiseIconName(raw),
    'icon',
    `icon must be one of the available icons: ${QSR_FRANCHISE_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isQsrFranchiseIconName(raw) ? raw : undefined;
}

export function validateCreateQsrFranchisePlatformWorkflow(
  body: unknown,
): CreateQsrFranchisePlatformWorkflowInput {
  const v = validator(body);

  const dto: CreateQsrFranchisePlatformWorkflowInput = {
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    icon: readIcon(v, true) as QsrFranchiseIconName,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateQsrFranchisePlatformWorkflow(
  body: unknown,
): UpdateQsrFranchisePlatformWorkflowInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'icon', 'displayOrder', 'status']);

  const dto: UpdateQsrFranchisePlatformWorkflowInput = {
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    icon: readIcon(v, false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateQsrFranchisePlatformWorkflowStatus(body: unknown): {
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
export function validateReorderQsrFranchisePlatformWorkflows(
  body: unknown,
): ReorderQsrFranchisePlatformWorkflowsInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_QSR_FRANCHISE_PLATFORM_WORKFLOWS });

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

export function validateQsrFranchisePlatformWorkflowListQuery(query: Record<string, unknown>): {
  filters: QsrFranchisePlatformWorkflowFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: QsrFranchisePlatformWorkflowFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
