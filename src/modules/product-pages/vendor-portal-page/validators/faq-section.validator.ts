// src/modules/product-pages/vendor-portal-page/validators/faq-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import {
  CreateVmsFaqEntryInput,
  ReorderInput,
  UpdateVmsFaqEntryInput,
  VmsFaqEntryFilters,
} from '../types/faq-section.types';

/**
 * Matched against the source text, so the limits are authoring limits.
 *
 * The answer column is TEXT rather than bounded - an accordion panel grows to
 * fit and touches nothing around it - so its ceiling is editorial. The longest
 * shipped answer is 430 characters.
 */
const QUESTION_MAX = 300;
const ANSWER_MAX = 2000;

export function validateCreateVmsFaqEntry(body: unknown): CreateVmsFaqEntryInput {
  const v = validator(body);

  const dto: CreateVmsFaqEntryInput = {
    question: v.requiredString('question', { min: 5, max: QUESTION_MAX }),
    answer: v.requiredString('answer', { min: 10, max: ANSWER_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateVmsFaqEntry(body: unknown): UpdateVmsFaqEntryInput {
  const v = validator(body);

  v.requireAtLeastOne(['question', 'answer', 'displayOrder', 'status']);

  const dto: UpdateVmsFaqEntryInput = {
    question: v.optionalString('question', { min: 5, max: QUESTION_MAX }),
    answer: v.optionalString('answer', { min: 10, max: ANSWER_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateVmsFaqEntryListQuery(query: Record<string, unknown>): {
  filters: VmsFaqEntryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: VmsFaqEntryFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateVmsFaqStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateVmsFaqEntryReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_VMS_FAQ_ENTRIES });

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
