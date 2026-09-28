// src/modules/product-pages/vendor-portal-page/types/faq-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The Vendor Portal FAQ - "Questions Procurement Leads Ask Before They
 * Commit."
 *
 * An accordion of questions about adoption: whether vendors will use a
 * self-service portal, whether a rollout can start small, how quality scoring
 * works, and who can see the commercial terms.
 *
 * The eyebrow, heading and subtext above it live once in page_section_copy
 * under ('vms', 'faq').
 */

export interface VmsFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVmsFaqEntryInput {
  question: string;
  answer: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateVmsFaqEntryInput = Partial<CreateVmsFaqEntryInput>;

export interface VmsFaqEntryFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

/**
 * The whole section in one read: the copy above the accordion and the
 * questions in it.
 *
 * Null when the copy is missing or nothing is published - the page then keeps
 * the FAQ it ships, which is a complete working one.
 */
export interface PublicVmsFaqSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** The site's accordion calls them `q` and `a`. */
  faqs: Array<{ q: string; a: string }>;
}
