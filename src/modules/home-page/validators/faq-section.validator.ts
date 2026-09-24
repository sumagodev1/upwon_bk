// src/modules/home-page/validators/faq-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import {
  CreateFaqEntryInput,
  FaqEntryFilters,
  ReorderFaqEntriesInput,
  UpdateFaqEntryInput,
} from '../types/faq-section.types';

/**
 * Matched against the source text, so the limits are authoring limits.
 *
 * The question and answer ceilings have room over what the section ships - the
 * longest live question is 59 characters and the longest answer 429 - because
 * the rule is there to catch a paste of the wrong thing, not to second-guess
 * how much detail an answer needs. The floors are the useful half: a
 * three-character "answer" is a mistake every time.
 *
 * The section's eyebrow, heading and subtext are validated by the section-copy
 * validator, which owns them now.
 */
const QUESTION_MAX = 300;
const ANSWER_MAX = 2000;

/**
 * A question is asked, not stated.
 *
 * Checked rather than silently appended: an entry that reads as a heading
 * breaks the accordion's rhythm, and the author is the one who knows whether
 * it is phrased as a question at all.
 */
function validateQuestionMark(v: Validator, question: string): void {
  v.custom(
    question.trim().endsWith('?'),
    'question',
    'question must end with a question mark',
    'NOT_A_QUESTION',
  );
}

export function validateCreateFaqEntry(body: unknown): CreateFaqEntryInput {
  const v = validator(body);

  const question = v.requiredString('question', { min: 5, max: QUESTION_MAX });
  if (question) validateQuestionMark(v, question);

  const dto: CreateFaqEntryInput = {
    question,
    answer: v.requiredString('answer', { min: 20, max: ANSWER_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateFaqEntry(body: unknown): UpdateFaqEntryInput {
  const v = validator(body);

  v.requireAtLeastOne(['question', 'answer', 'displayOrder', 'status']);

  const question = v.has('question')
    ? v.requiredString('question', { min: 5, max: QUESTION_MAX })
    : undefined;
  if (question) validateQuestionMark(v, question);

  const dto: UpdateFaqEntryInput = {
    question,
    answer: v.optionalString('answer', { min: 20, max: ANSWER_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateFaqEntryStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates, which
 * a "move question X to position N" endpoint can when two admins drag at once.
 */
export function validateReorderFaqEntries(body: unknown): ReorderFaqEntriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_FAQ_ENTRIES });

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

export function validateFaqEntryListQuery(query: Record<string, unknown>): {
  filters: FaqEntryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FaqEntryFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
