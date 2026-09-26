// src/modules/free-audit/validators/applications.validator.ts

import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import { validateVisitorPhone, VISITOR_PHONE_MAX } from '../../../core/utils/visitor-phone';
import {
  CreateFreeAuditApplicationInput,
  FreeAuditApplicationFilters,
} from '../types/applications.types';
import { FREE_AUDIT_REVENUE_RANGES } from '../utils/revenue-ranges';

/**
 * Bounds for one audit request.
 *
 * These are the numbers the website's client-side validation is written against,
 * and the ones 051_free_audit.sql sizes its columns to. Changing one means
 * changing all three.
 *
 * name, company and role reuse the Partner Program form's bounds, because they
 * are the same three questions asked of the same kind of visitor. pain is a
 * textarea, so it is given room for a paragraph or two - enough to describe the
 * problem, not enough to paste a document.
 */
const NAME_MIN = 2;
const NAME_MAX = 120;
const COMPANY_MIN = 2;
const COMPANY_MAX = 160;
const ROLE_MAX = 120;
const PAIN_MAX = 2000;
// The phone rule and its column width are shared with the Contact enquiry,
// Careers application, Partner Program and discovery call forms - see
// core/utils/visitor-phone.ts for why all of them must apply exactly the same one.
const PHONE_MAX = VISITOR_PHONE_MAX;
// email's ceiling is 254 - the longest address RFC 5321 allows - and it is not
// a constant here because Validator.requiredEmail already applies it.

/**
 * One audit request.
 *
 * Seven fields, which is exactly what the form on /free-audit asks for and
 * nothing more: there is no status and no source, because neither is on the
 * page or in the admin table.
 *
 * Every error is reported under the API's field name (`phone`, `revenueRange`),
 * which the website maps back onto its own inputs (mobile, revenue) to show the
 * message under the right one.
 *
 * Nothing is read from the CMS: the revenue chips are fixed in the page's code
 * and in FREE_AUDIT_REVENUE_RANGES, so an unauthored hero does not stop a
 * visitor asking for an audit.
 */
export function validateCreateFreeAuditApplication(
  body: unknown,
): CreateFreeAuditApplicationInput {
  const v = validator(body);

  const phone = v.requiredString('phone', { max: PHONE_MAX });
  if (phone) validateVisitorPhone(v, 'phone', phone);

  const dto: CreateFreeAuditApplicationInput = {
    name: v.requiredString('name', { min: NAME_MIN, max: NAME_MAX }),
    company: v.requiredString('company', { min: COMPANY_MIN, max: COMPANY_MAX }),
    // nullableString, not optionalString, for both optional fields: a form
    // posts every input it renders, so an untouched one arrives as '' rather
    // than absent, and optionalString would fail that as "role is required" on
    // a field the page does not mark required. Blank means null here.
    role: v.nullableString('role', { max: ROLE_MAX }) ?? null,
    phone,
    email: v.requiredEmail('email'),
    // Exactly one of the four chips, compared as sent: the page sends the chip's
    // own text, so anything else - a trimmed or re-spaced variant included -
    // did not come from it.
    revenueRange: v.requiredEnum('revenueRange', FREE_AUDIT_REVENUE_RANGES),
    pain: v.nullableString('pain', { max: PAIN_MAX }) ?? null,
  };

  v.assert();
  return dto;
}

/** The admin list: paging, a search box, and an optional date window. */
export function validateFreeAuditApplicationListQuery(query: Record<string, unknown>): {
  filters: FreeAuditApplicationFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);

  const filters: FreeAuditApplicationFilters = {
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
