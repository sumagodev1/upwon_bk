// src/modules/about-page/types/discovery-calls.types.ts

/**
 * The discovery calls visitors book through the form at the foot of /about.
 *
 * The five sections of this module are content: an admin writes them and the
 * website reads them. This one is a records list - the website writes it and
 * only the admin panel reads it - so there is no "public" shape here at all.
 * Nothing in this file is ever served to an anonymous caller.
 */

/** What the visitor filled in, as stored. The shape the admin table lists. */
export interface AboutDiscoveryCallSummary {
  id: string;
  name: string;
  /** 'Phone / WhatsApp' on the form - one field, because it is one number. */
  phone: string;
  /** 'Business (optional)' - optional on the form, so nullable here. */
  business: string | null;
  createdAt: Date;
}

/**
 * One booking in full: the three answers plus the triage columns.
 *
 * The IP and user agent are on the detail read only. They are not part of what
 * the visitor told us, they are not shown in the table, and a list endpoint that
 * hands them back by the pageful is a worse leak for no gain.
 */
export interface AboutDiscoveryCall extends AboutDiscoveryCallSummary {
  submittedIp: string | null;
  submittedUserAgent: string | null;
}

/**
 * The validated submission. The triage columns are deliberately absent: they
 * come from the request, never from the body, or a submitter could choose the IP
 * their booking is filed under.
 */
export interface CreateAboutDiscoveryCallInput {
  name: string;
  phone: string;
  business: string | null;
}

/** The list's optional date window. Search and paging come from parsePagination. */
export interface AboutDiscoveryCallFilters {
  dateFrom?: Date;
  dateTo?: Date;
}
