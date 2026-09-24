// src/modules/product-pages/erp-page/validators/faq-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import {
  CreateErpFaqEntryInput,
  ErpFaqEntryFilters,
  ReorderErpFaqEntriesInput,
  UpdateErpFaqEntryInput,
} from '../types/faq-section.types';

/**
 * Matched against the source text, so the limits are authoring limits.
 *
 * The ceilings have room over what the page ships - the longest live question
 * is 57 characters and the longest answer 382 - because the rule is there to
 * catch a paste of the wrong thing, not to second-guess how much detail an
 * answer needs.
 */
const QUESTION_MAX = 300;
const ANSWER_MAX = 2000;

/** A question is asked, not stated. Same rule as the home page's accordion. */
function validateQuestionMark(v: Validator, question: string): void {
  v.custom(
    question.trim().endsWith('?'),
    'question',
    'question must end with a question mark',
    'NOT_A_QUESTION',
  );
}

export function validateCreateErpFaqEntry(body: unknown): CreateErpFaqEntryInput {
  const v = validator(body);

  const question = v.requiredString('question', { min: 5, max: QUESTION_MAX });
  if (question) validateQuestionMark(v, question);

  const dto: CreateErpFaqEntryInput = {
    question,
    answer: v.requiredString('answer', { min: 20, max: ANSWER_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpFaqEntry(body: unknown): UpdateErpFaqEntryInput {
  const v = validator(body);

  v.requireAtLeastOne(['question', 'answer', 'displayOrder', 'status']);

  const question = v.has('question')
    ? v.requiredString('question', { min: 5, max: QUESTION_MAX })
    : undefined;
  if (question) validateQuestionMark(v, question);

  const dto: UpdateErpFaqEntryInput = {
    question,
    answer: v.optionalString('answer', { min: 20, max: ANSWER_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateErpFaqEntryStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateReorderErpFaqEntries(body: unknown): ReorderErpFaqEntriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_ERP_FAQ_ENTRIES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one question id', 'REQUIRED');

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

export function validateErpFaqEntryListQuery(query: Record<string, unknown>): {
  filters: ErpFaqEntryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ErpFaqEntryFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
