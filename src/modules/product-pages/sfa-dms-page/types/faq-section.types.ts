// src/modules/product-pages/sfa-dms-page/types/faq-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The SFA-DMS page's FAQ accordion: one row per question.
 *
 * The eyebrow, heading and subtext that head it live once in
 * page_section_copy under ('erp', 'faq').
 */

export interface SfaFaqEntry {
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

export interface CreateSfaFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateSfaFaqEntryInput {
  question?: string;
  answer?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface SfaFaqEntryFilters {
  status?: ContentStatus;
}

export interface ReorderSfaFaqEntriesInput {
  ids: string[];
}

/** The website-facing shape, using the q/a keys the accordion already takes. */
export interface PublicSfaFaqSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  faqs: Array<{ q: string; a: string }>;
}
