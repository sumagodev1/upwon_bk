// src/modules/contact-page/types/enquiries.types.ts

/**
 * The enquiries visitors submit through the form on /contact.
 *
 * The other three sections of this module are content: an admin writes them
 * and the website reads them. This one is a records inbox - the website writes
 * it and only the admin panel reads it - so there is no "public" shape here at
 * all. Nothing in this file is ever served to an anonymous caller.
 */

/** What the visitor answered, as stored. The shape the admin inbox lists. */
export interface ContactEnquirySummary {
  id: string;
  fullName: string;
  workEmail: string;
  phone: string | null;
  company: string;
  role: string | null;
  businessType: string;
  revenueRange: string;
  /** The platforms ticked, in the order the published list offers them. */
  platforms: string[];
  /** "What are you trying to solve?" - free text, and often the whole lead. */
  message: string | null;
  createdAt: Date;
}

/**
 * One enquiry in full: the answers plus the triage columns.
 *
 * The IP and user agent are on the detail read only. They are not part of what
 * the visitor told us, they are not shown in the inbox table, and a list
 * endpoint that hands them back by the pageful is a worse leak for no gain.
 */
export interface ContactEnquiry extends ContactEnquirySummary {
  submittedIp: string | null;
  submittedUserAgent: string | null;
}

/**
 * The validated submission. The triage columns are deliberately absent: they
 * come from the request, never from the body, or a submitter could choose the
 * IP their enquiry is filed under.
 */
export interface CreateContactEnquiryInput {
  fullName: string;
  workEmail: string;
  phone: string | null;
  company: string;
  role: string | null;
  businessType: string;
  revenueRange: string;
  platforms: string[];
  message: string | null;
}

/** The inbox's optional date window. Search and paging come from parsePagination. */
export interface ContactEnquiryFilters {
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * The currently published choices, read from contact_form_section.
 *
 * A submitted business type, revenue range or platform has to be one of these:
 * they are the only options the form ever rendered, so anything else is either
 * a stale page or a script posting directly, and storing it would put a label
 * in the inbox that no admin ever offered.
 */
export interface PublishedContactFormChoices {
  businessTypes: string[];
  revenueRanges: string[];
  platforms: string[];
}
