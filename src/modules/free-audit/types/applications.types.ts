// src/modules/free-audit/types/applications.types.ts

import { FreeAuditRevenueRange } from '../utils/revenue-ranges';

/**
 * The audit requests visitors send through the form on /free-audit.
 *
 * The hero beside it is content: an admin writes it and the website reads it.
 * This is a records list - the website writes it and only the admin panel reads
 * it - so there is no "public" shape here at all. Nothing in this file is ever
 * served to an anonymous caller.
 *
 * The API speaks the field names the website's form and the admin table share
 * (`name`, `phone`, `revenueRange`), which are not the column names
 * (full_name, mobile, revenue_range); the repository maps between them.
 */

/** What the visitor filled in, as stored. The shape the admin table lists. */
export interface FreeAuditApplicationSummary {
  id: string;
  /** 'Full name' on the form. */
  name: string;
  company: string;
  /** 'Your role' - not marked required on the form, so nullable here. */
  role: string | null;
  /** 'Mobile' on the form. */
  phone: string;
  /** 'Work email' on the form. */
  email: string;
  /** One of the four chips, exactly as it reads. */
  revenueRange: FreeAuditRevenueRange;
  /** 'Your single biggest operational pain' - optional, so nullable here. */
  pain: string | null;
  createdAt: Date;
}

/**
 * One request in full: the answers plus the triage columns.
 *
 * The IP and user agent are on the detail read only. They are not part of what
 * the visitor told us, they are not shown in the table, and a list endpoint that
 * hands them back by the pageful is a worse leak for no gain.
 */
export interface FreeAuditApplication extends FreeAuditApplicationSummary {
  submittedIp: string | null;
  submittedUserAgent: string | null;
}

/**
 * The validated submission. The triage columns are deliberately absent: they
 * come from the request, never from the body, or a submitter could choose the IP
 * their request is filed under.
 */
export interface CreateFreeAuditApplicationInput {
  name: string;
  company: string;
  role: string | null;
  phone: string;
  email: string;
  revenueRange: FreeAuditRevenueRange;
  pain: string | null;
}

/** The list's optional date window. Search and paging come from parsePagination. */
export interface FreeAuditApplicationFilters {
  dateFrom?: Date;
  dateTo?: Date;
}
