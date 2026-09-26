// src/modules/vs-sap-page/types/answer-section.types.ts

import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * "The straight answer": the headline and the two side-by-side cards under it.
 * A singleton.
 *
 * One record rather than a section plus two child lists: a card's points have
 * no identity, status or order of their own, and are always saved with the
 * card around them - the contact form section's choice lists are the
 * precedent.
 */
export interface VsSapAnswerSection {
  /** The small label above the headline ('The straight answer'). */
  eyebrow: string;
  /**
   * Authored text in the home heading markup, one **accent** span at most:
   * 'When UpWon Wins. When SAP Wins. **No Spin.**'.
   */
  heading: string;
  /** The orange card's title ('Why food & FMCG operators choose UpWon'). */
  upwonTitle: string;
  /** The orange card's ticked points, in the order they are listed. */
  upwonPoints: string[];
  /** The white card's title ('When SAP B1 is the right choice'). */
  sapTitle: string;
  /** The white card's points, in the order they are listed. */
  sapPoints: string[];
  /** The italic line under the white card's points. */
  closingLine: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The admin shape: the stored row plus the parsed heading for the preview. */
export interface ResolvedVsSapAnswerSection extends VsSapAnswerSection {
  headingLines: HeadingLine[];
}

/**
 * The website-facing shape: no authorship, no timestamps. `heading` travels
 * raw as well as parsed, like every other heading in this API, so a client
 * that only wants plain text can still have it.
 */
export interface PublicVsSapAnswerSection {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  upwonTitle: string;
  upwonPoints: string[];
  sapTitle: string;
  sapPoints: string[];
  closingLine: string;
}

/** PUT body. A full replace of the section, both cards and their points. */
export interface ReplaceVsSapAnswerSectionInput {
  eyebrow: string;
  heading: string;
  upwonTitle: string;
  upwonPoints: string[];
  sapTitle: string;
  sapPoints: string[];
  closingLine: string;
}
