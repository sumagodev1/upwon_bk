// src/modules/partner-program/types/applications.types.ts

/**
 * The applications visitors submit through the form at the foot of /partners.
 *
 * The hero section of this module is content: an admin writes it and the
 * website reads it. This one is a records list - the website writes it and only
 * the admin panel reads it - so there is no "public" shape here at all. Nothing
 * in this file is ever served to an anonymous caller.
 */

/** What the applicant filled in, as stored. The shape the admin table lists. */
export interface PartnerApplicationSummary {
  id: string;
  fullName: string;
  company: string;
  /** 'Founder, Practice Lead…' - optional on the form, so nullable here. */
  role: string | null;
  /** 'CA · IT firm · Consultant' - the kind of practice. Optional. */
  background: string | null;
  mobile: string;
  workEmail: string;
  createdAt: Date;
}

/**
 * One application in full: the answers plus the triage columns.
 *
 * The IP and user agent are on the detail read only. They are not part of what
 * the applicant told us, they are not shown in the table, and a list endpoint
 * that hands them back by the pageful is a worse leak for no gain.
 */
export interface PartnerApplication extends PartnerApplicationSummary {
  submittedIp: string | null;
  submittedUserAgent: string | null;
}

/**
 * The validated submission. The triage columns are deliberately absent: they
 * come from the request, never from the body, or a submitter could choose the
 * IP their application is filed under.
 */
export interface CreatePartnerApplicationInput {
  fullName: string;
  company: string;
  role: string | null;
  background: string | null;
  mobile: string;
  workEmail: string;
}

/** The list's optional date window. Search and paging come from parsePagination. */
export interface PartnerApplicationFilters {
  dateFrom?: Date;
  dateTo?: Date;
}
