// src/modules/industry-pages/non-food-fmcg-page/types/faq-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The Non-Food FMCG page's FAQ accordion: one row per question.
 *
 * The eyebrow, heading and subtext that head it live once in
 * page_section_copy under ('non-food-fmcg', 'faq').
 */

export interface NonFoodFmcgFaqEntry {
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

export interface CreateNonFoodFmcgFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateNonFoodFmcgFaqEntryInput {
  question?: string;
  answer?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface NonFoodFmcgFaqEntryFilters {
  status?: ContentStatus;
}

export interface ReorderNonFoodFmcgFaqEntriesInput {
  ids: string[];
}

/** The website-facing shape, using the q/a keys the accordion already takes. */
export interface PublicNonFoodFmcgFaqSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  faqs: Array<{ q: string; a: string }>;
}
