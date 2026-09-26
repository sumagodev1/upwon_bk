// src/modules/industry-pages/engineering-manufacturing-page/types/faq-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The Engineering & Manufacturing page's FAQ accordion: one row per question.
 *
 * The eyebrow, heading and subtext that head it live once in
 * page_section_copy under ('engineering-manufacturing', 'faq').
 */

export interface EngineeringFaqEntry {
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

export interface CreateEngineeringFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateEngineeringFaqEntryInput {
  question?: string;
  answer?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface EngineeringFaqEntryFilters {
  status?: ContentStatus;
}

export interface ReorderEngineeringFaqEntriesInput {
  ids: string[];
}

/** The website-facing shape, using the q/a keys the accordion already takes. */
export interface PublicEngineeringFaqSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  faqs: Array<{ q: string; a: string }>;
}
