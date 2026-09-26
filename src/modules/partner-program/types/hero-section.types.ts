// src/modules/partner-program/types/hero-section.types.ts

import { HeadingLine } from '../../home-page/utils/heading-markup';

/** The Partner Program page hero exactly as it is stored. A singleton. */
export interface PartnerProgramHeroSection {
  /** The pill above the headline. */
  eyebrow: string;
  /** Authored text in the home heading markup: newline and **accent**. */
  heading: string;
  subtext: string;
  /** An absolute URL or a site-relative path. Mutually exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Mutually exclusive with imageUrl. */
  imageFileId: string | null;
  /** Narrow-viewport art. Mutually exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  /** Narrow-viewport upload. Mutually exclusive with mobileImageUrl. */
  mobileImageFileId: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The admin shape: the stored row plus the resolved image URLs and the parsed
 * heading, so the form can round-trip the raw fields and preview the result.
 */
export interface ResolvedPartnerProgramHeroSection extends PartnerProgramHeroSection {
  image: string | null;
  /** Null means "use the desktop one". */
  mobileImage: string | null;
  headingLines: HeadingLine[];
}

/** The website-facing shape: no ids, timestamps, or authorship. */
export interface PublicPartnerProgramHeroSection {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null renders the hero on its plain ambient background, as it does today. */
  image: string | null;
  /**
   * The narrow-viewport crop. Null means the desktop image serves every
   * viewport, which is what the site renders today - so a hero with no mobile
   * crop looks exactly as it did before this field existed.
   */
  mobileImage: string | null;
  /** Not authored: derived from the heading, so an image is never unlabelled. */
  imageAlt: string | null;
}

/** PUT body. A full replace: an absent nullable field is stored as null. */
export interface ReplacePartnerProgramHeroSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
}
