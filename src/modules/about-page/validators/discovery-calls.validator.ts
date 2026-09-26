// src/modules/about-page/validators/discovery-calls.validator.ts

import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import { validateVisitorPhone, VISITOR_PHONE_MAX } from '../../../core/utils/visitor-phone';
import {
  AboutDiscoveryCallFilters,
  CreateAboutDiscoveryCallInput,
} from '../types/discovery-calls.types';

/**
 * Bounds for one booked discovery call.
 *
 * These are the numbers the website's client-side validation is written against,
 * and the ones 028_about_discovery_calls.sql sizes its columns to. Changing one
 * means changing all three.
 *
 * `name` reuses the Contact enquiry and Partner Program forms' bounds, because
 * it is the same question asked of the same kind of visitor. `business` is sized
 * like partner_program_applications.background, since what people type there
 * ('Bakery, FMCG, QSR') is the same sort of string.
 */
const NAME_MIN = 2;
const NAME_MAX = 120;
// The phone rule and its column width are shared with the Contact enquiry,
// Careers application and Partner Program forms - see core/utils/visitor-phone.ts
// for why all four must apply exactly the same one.
const PHONE_MAX = VISITOR_PHONE_MAX;
const BUSINESS_MAX = 160;

/**
 * One booked call.
 *
 * Three fields, which is exactly what the form on /about asks for and nothing
 * more - it is called 'Three fields. 20 seconds.' on the page. There is no
 * email, no message, no status and no source, because none of them is on the
 * page or in the admin table.
 *
 * No `choices` argument and nothing read from the CMS, like the Partner Program
 * form and unlike the Contact enquiry form: nothing here is picked from a
 * published list, so an unauthored section does not stop a visitor booking a
 * call.
 */
export function validateCreateAboutDiscoveryCall(
  body: unknown,
): CreateAboutDiscoveryCallInput {
  const v = validator(body);

  const phone = v.requiredString('phone', { max: PHONE_MAX });
  if (phone) validateVisitorPhone(v, 'phone', phone);

  const dto: CreateAboutDiscoveryCallInput = {
    name: v.requiredString('name', { min: NAME_MIN, max: NAME_MAX }),
    phone,
    // nullableString, not optionalString: a form posts every input it renders,
    // so an untouched one arrives as '' rather than absent, and optionalString
    // would fail that as "business is required" on the one field the page
    // labels optional. Blank means null here.
    business: v.nullableString('business', { max: BUSINESS_MAX }) ?? null,
  };

  v.assert();
  return dto;
}

/** The admin list: paging, a search box, and an optional date window. */
export function validateAboutDiscoveryCallListQuery(query: Record<string, unknown>): {
  filters: AboutDiscoveryCallFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);

  const filters: AboutDiscoveryCallFilters = {
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
