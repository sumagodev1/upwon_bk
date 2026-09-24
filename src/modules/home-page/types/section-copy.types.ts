// src/modules/home-page/types/section-copy.types.ts

import { PageKey, SectionKey } from '../../../config/constants';
import { HeadingLine } from '../utils/heading-markup';

/**
 * The copy that heads one section of one page.
 *
 * Keyed by the pair rather than the section alone - the ERP page has a 'faq'
 * and so does the home page, and they are different content. See
 * 023_page_section_copy.sql.
 */

export interface SectionCopy {
  pageKey: PageKey;
  sectionKey: SectionKey;
  /** Null where a section opens straight on its heading, as the ERP band does. */
  eyebrow: string | null;
  /** Authored text, not HTML. Same two markers as the hero heading. */
  heading: string;
  /** Null where a section carries no explanatory line, as the outcomes carousel does. */
  subtext: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Section copy with the heading parsed, ready to render. */
export interface ResolvedSectionCopy extends SectionCopy {
  headingLines: HeadingLine[];
}

/**
 * A full replacement, not a patch.
 *
 * The three fields are authored together in one small form, so a partial
 * update would only add a way for two of them to drift out of step with the
 * third while an administrator thinks they saved all three.
 */
export interface UpsertSectionCopyInput {
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}
