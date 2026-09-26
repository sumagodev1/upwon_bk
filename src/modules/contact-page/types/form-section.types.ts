// src/modules/contact-page/types/form-section.types.ts

import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * The copy and the choices around the enquiry form, exactly as stored. A
 * singleton.
 *
 * The form's inputs, its submit button and the success screen's buttons are
 * behaviour and stay in the website's code; everything a visitor reads around
 * them is here.
 */
export interface ContactFormSection {
  eyebrow: string;
  /** Authored text in the home heading markup: newline and **accent**. */
  heading: string;
  /** The chips above the revenue grid, in the order they are offered. */
  businessTypes: string[];
  revenueRanges: string[];
  platforms: string[];
  /** The reassurance line beside the submit button. */
  footnote: string;
  successHeading: string;
  successBody: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The admin shape: the stored row plus the parsed heading for the preview. */
export interface ResolvedContactFormSection extends ContactFormSection {
  headingLines: HeadingLine[];
}

/** The website-facing shape: no timestamps or authorship. */
export interface PublicContactFormSection {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  businessTypes: string[];
  revenueRanges: string[];
  platforms: string[];
  footnote: string;
  successHeading: string;
  successBody: string;
}

/** PUT body. A full replace of the section. */
export interface ReplaceContactFormSectionInput {
  eyebrow: string;
  heading: string;
  businessTypes: string[];
  revenueRanges: string[];
  platforms: string[];
  footnote: string;
  successHeading: string;
  successBody: string;
}
