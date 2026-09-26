// src/modules/careers/validators/applications.validator.ts

import { APPLICATION_STATUSES } from '../../../config/constants';
import { FieldError } from '../../../core/errors/AppError';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import { validateVisitorPhone, VISITOR_PHONE_MAX } from '../../../core/utils/visitor-phone';
import {
  CareerApplicationFilters,
  CreateCareerApplicationInput,
} from '../types/applications.types';

/**
 * Bounds for one submitted application.
 *
 * These are the numbers the website's client-side validation is written
 * against, and the ones 020_career_applications.sql sizes its columns to.
 * Changing one means changing all three.
 */
const FULL_NAME_MIN = 2;
const FULL_NAME_MAX = 120;
// email's ceiling is 254 - the longest address RFC 5321 allows - and it is not
// a constant here because Validator.requiredEmail already applies it.
const PHONE_MAX = VISITOR_PHONE_MAX;
const LOCATION_MIN = 2;
const LOCATION_MAX = 120;
const EXPERIENCE_MIN = 1;
const EXPERIENCE_MAX = 60;
/** Long enough for a covering letter, short enough to store. */
const MESSAGE_MAX = 4000;

/**
 * One submitted application.
 *
 * `resumeProblem` is the result of checking the uploaded file, worked out by
 * the controller before this runs - see utils/resume-asset.ts. It is passed in
 * rather than checked here because the file arrives as a multipart part rather
 * than a body field and its rules need the bytes; and it is passed in rather
 * than thrown separately so a bad file lands in the SAME response as a
 * mistyped email, and an applicant who got two things wrong fixes the whole
 * form once. That is the reasoning the Contact enquiry validator's `choices`
 * argument follows.
 *
 * Every field here arrives as a STRING: multipart/form-data has no types, so
 * even a number would be '3'. Nothing in this validator assumes otherwise.
 *
 * The vacancy is checked for existence and publication in the service, not
 * here: that needs the database, and the answer ("that role is no longer open")
 * is not something this function can know.
 */
export function validateCreateCareerApplication(
  body: unknown,
  resumeProblem: FieldError | null,
): CreateCareerApplicationInput {
  const v = validator(body);

  if (resumeProblem) {
    v.custom(false, resumeProblem.field, resumeProblem.message, resumeProblem.code);
  }

  const phone = v.requiredString('phone', { max: PHONE_MAX });
  if (phone) validateVisitorPhone(v, 'phone', phone);

  const dto: CreateCareerApplicationInput = {
    vacancyId: v.requiredUuid('vacancyId'),
    fullName: v.requiredString('fullName', { min: FULL_NAME_MIN, max: FULL_NAME_MAX }),
    email: v.requiredEmail('email'),
    phone,
    location: v.requiredString('location', { min: LOCATION_MIN, max: LOCATION_MAX }),
    experience: v.requiredString('experience', {
      min: EXPERIENCE_MIN,
      max: EXPERIENCE_MAX,
    }),
    // nullableString, not optionalString: a form posts every input it renders,
    // so an untouched message arrives as '' rather than absent, and
    // optionalString would fail that as "message is required" on a field the
    // applicant was told they could skip. Blank means null here.
    message: v.nullableString('message', { max: MESSAGE_MAX }) ?? null,
  };

  v.assert();
  return dto;
}

/** The admin inbox: paging, search, and the three ways it is narrowed. */
export function validateCareerApplicationListQuery(query: Record<string, unknown>): {
  filters: CareerApplicationFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);

  const filters: CareerApplicationFilters = {
    vacancyId: v.optionalUuid('vacancyId'),
    status: v.optionalEnum('status', APPLICATION_STATUSES),
    dateFrom: v.optionalDate('dateFrom'),
    dateTo: v.optionalDate('dateTo'),
  };

  v.custom(
    !filters.dateFrom || !filters.dateTo || filters.dateFrom <= filters.dateTo,
    'dateFrom',
    'dateFrom must be on or before dateTo',
    'INVALID_RANGE',
  );

  v.assert();
  return { filters, pagination: parsePagination(query) };
}

/** The one thing an administrator may change about an application. */
export function validateCareerApplicationStatus(body: unknown): {
  status: (typeof APPLICATION_STATUSES)[number];
} {
  const v = validator(body);
  const status = v.requiredEnum('status', APPLICATION_STATUSES);
  v.assert();
  return { status };
}
