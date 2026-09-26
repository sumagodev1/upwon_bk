// src/modules/partner-program/validators/applications.validator.ts

import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import { validateVisitorPhone, VISITOR_PHONE_MAX } from '../../../core/utils/visitor-phone';
import {
  CreatePartnerApplicationInput,
  PartnerApplicationFilters,
} from '../types/applications.types';

/**
 * Bounds for one submitted application.
 *
 * These are the numbers the website's client-side validation is written
 * against, and the ones 022_partner_program_applications.sql sizes its columns
 * to. Changing one means changing all three.
 *
 * fullName and company reuse the Contact enquiry form's bounds, because they are
 * the same two questions asked of the same kind of visitor; role reuses its
 * role. background is new and sized like company, since what people type there
 * ('CA · IT firm · Consultant', or the name of their practice) is the same sort
 * of string.
 */
const FULL_NAME_MIN = 2;
const FULL_NAME_MAX = 120;
const COMPANY_MIN = 2;
const COMPANY_MAX = 160;
const ROLE_MAX = 120;
const BACKGROUND_MAX = 160;
// The mobile rule and its column width are shared with the Contact enquiry and
// Careers application forms - see core/utils/visitor-phone.ts for why all three
// must apply exactly the same one.
const MOBILE_MAX = VISITOR_PHONE_MAX;
// workEmail's ceiling is 254 - the longest address RFC 5321 allows - and it is
// not a constant here because Validator.requiredEmail already applies it.

/**
 * One submitted application.
 *
 * Six fields, which is exactly what the form on /partners asks for and nothing
 * more: there is no message field, no status and no source, because none of
 * them is on the page or in the admin table.
 *
 * No `choices` argument, unlike the Contact enquiry validator: nothing on this
 * form is picked from a published list, so there is nothing to check against
 * the CMS and no reason for the write path to read the hero section at all.
 * That is also why an unauthored hero does not block a submission here, where
 * an unauthored Contact form section does block one there.
 */
export function validateCreatePartnerApplication(
  body: unknown,
): CreatePartnerApplicationInput {
  const v = validator(body);

  const mobile = v.requiredString('mobile', { max: MOBILE_MAX });
  if (mobile) validateVisitorPhone(v, 'mobile', mobile);

  const dto: CreatePartnerApplicationInput = {
    fullName: v.requiredString('fullName', { min: FULL_NAME_MIN, max: FULL_NAME_MAX }),
    company: v.requiredString('company', { min: COMPANY_MIN, max: COMPANY_MAX }),
    // nullableString, not optionalString, for both optional fields: a form
    // posts every input it renders, so an untouched one arrives as '' rather
    // than absent, and optionalString would fail that as "role is required" on
    // a field the applicant was told they could skip. Blank means null here.
    role: v.nullableString('role', { max: ROLE_MAX }) ?? null,
    background: v.nullableString('background', { max: BACKGROUND_MAX }) ?? null,
    mobile,
    workEmail: v.requiredEmail('workEmail'),
  };

  v.assert();
  return dto;
}

/** The admin list: paging, a search box, and an optional date window. */
export function validatePartnerApplicationListQuery(query: Record<string, unknown>): {
  filters: PartnerApplicationFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);

  const filters: PartnerApplicationFilters = {
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
