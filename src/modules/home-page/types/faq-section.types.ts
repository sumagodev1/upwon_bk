// src/modules/home-page/types/faq-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../utils/heading-markup';

/**
 * Frequently asked questions: a list of entries, shaped like the hero's slides.
 *
 * One row is one question and its answer. The eyebrow, heading and subtext
 * that head the section are not here - they live once in home_section_copy,
 * because an administrator should not retype them per question. See
 * 021_home_section_copy.sql.
 */

export interface FaqEntry {
  id: string;
  question: string;
  /** Plain text. The accordion renders it into a <p>, so markup is literal. */
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFaqEntryInput {
  question: string;
  answer: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/** Every field optional; absent leaves the stored value untouched. */
export interface UpdateFaqEntryInput {
  question?: string;
  answer?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface FaqEntryFilters {
  status?: ContentStatus;
}

export interface ReorderFaqEntriesInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The section's copy and its questions come from two tables now, and this is
 * where they are put back together: the site renders one heading above one
 * accordion, so folding them is the server's job rather than the browser's.
 *
 * `faqs` uses the `q`/`a` keys the accordion component already takes, so the
 * website wrapper passes the array straight through.
 */
export interface PublicFaqSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  faqs: Array<{ q: string; a: string }>;
}
