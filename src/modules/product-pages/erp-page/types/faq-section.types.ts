// src/modules/product-pages/erp-page/types/faq-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The ERP page's FAQ accordion: one row per question.
 *
 * The eyebrow, heading and subtext that head it live once in
 * page_section_copy under ('erp', 'faq').
 */

export interface ErpFaqEntry {
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

export interface CreateErpFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateErpFaqEntryInput {
  question?: string;
  answer?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface ErpFaqEntryFilters {
  status?: ContentStatus;
}

export interface ReorderErpFaqEntriesInput {
  ids: string[];
}

/** The website-facing shape, using the q/a keys the accordion already takes. */
export interface PublicErpFaqSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  faqs: Array<{ q: string; a: string }>;
}
