// src/modules/contact-page/validators/enquiries.validator.ts

import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import { validateVisitorPhone, VISITOR_PHONE_MAX } from '../../../core/utils/visitor-phone';
import {
  ContactEnquiryFilters,
  CreateContactEnquiryInput,
  PublishedContactFormChoices,
} from '../types/enquiries.types';

/**
 * Bounds for one submitted enquiry.
 *
 * These are the numbers the website's client-side validation is written
 * against, and the ones the columns in 018_contact_enquiries.sql are sized to.
 * Changing one means changing all three.
 */
const FULL_NAME_MIN = 2;
const FULL_NAME_MAX = 120;
// workEmail's ceiling is 254 - the longest address RFC 5321 allows - and it is
// not a constant here because Validator.requiredEmail already applies it.
// The phone rule and its column width are shared with the Careers application
// form - see core/utils/visitor-phone.ts for why both forms must apply exactly
// the same one.
const PHONE_MAX = VISITOR_PHONE_MAX;
const COMPANY_MIN = 2;
const COMPANY_MAX = 160;
const ROLE_MAX = 120;
/** A published choice is a chip face - the same ceiling the form section uses. */
const CHOICE_MAX = 60;
/** Long enough for a real description of the problem, short enough to store. */
const MESSAGE_MAX = 4000;

/**
 * One submitted enquiry.
 *
 * `choices` is read from contact_form_section by the service before this runs,
 * so the three choice fields are checked against what the form is publishing
 * right now rather than against a hardcoded list that would drift the first
 * time an admin edits the options. Passing them in - instead of checking them
 * later in the service - keeps every field error in one response, so a visitor
 * fixes the whole form once.
 */
export function validateCreateContactEnquiry(
  body: unknown,
  choices: PublishedContactFormChoices,
): CreateContactEnquiryInput {
  const v = validator(body);

  const fullName = v.requiredString('fullName', { min: FULL_NAME_MIN, max: FULL_NAME_MAX });
  const workEmail = v.requiredEmail('workEmail');
  const company = v.requiredString('company', { min: COMPANY_MIN, max: COMPANY_MAX });

  // nullableString, not optionalString, for all three optional fields: a form
  // posts every input it renders, so an untouched one arrives as "" rather
  // than absent, and optionalString would fail that as "phone is required" on
  // a field the visitor was told they could skip. Blank means null here.
  const phone = v.nullableString('phone', { max: PHONE_MAX }) ?? null;
  if (phone) validateVisitorPhone(v, 'phone', phone);

  const role = v.nullableString('role', { max: ROLE_MAX }) ?? null;
  const message = v.nullableString('message', { max: MESSAGE_MAX }) ?? null;

  // requiredEnum reports the published options in its message, which is what a
  // caller working from a stale page needs to see.
  const businessType = v.requiredEnum('businessType', choices.businessTypes);
  const revenueRange = v.requiredEnum('revenueRange', choices.revenueRanges);

  // Zero platforms is a legal answer, so this list is never "required" - only
  // bounded by how many the form currently offers.
  const selected = v.stringArray('platforms', {
    max: choices.platforms.length,
    maxLength: CHOICE_MAX,
  });
  const unpublished = selected.filter((entry) => !choices.platforms.includes(entry));
  v.custom(
    unpublished.length === 0,
    'platforms',
    `platforms must be chosen from: ${choices.platforms.join(', ')}`,
    'INVALID_ENUM',
  );

  const dto: CreateContactEnquiryInput = {
    fullName,
    workEmail,
    phone,
    company,
    role,
    businessType,
    revenueRange,
    // Stored in the order the form offers them, not the order they arrived, so
    // the inbox's compact "first two plus +N" column reads the same every time.
    platforms: [...selected].sort(
      (a, b) => choices.platforms.indexOf(a) - choices.platforms.indexOf(b),
    ),
    message,
  };

  v.assert();
  return dto;
}

/** The admin inbox list: paging, a search box, and an optional date window. */
export function validateContactEnquiryListQuery(query: Record<string, unknown>): {
  filters: ContactEnquiryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);

  const filters: ContactEnquiryFilters = {
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
