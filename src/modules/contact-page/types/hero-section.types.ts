// src/modules/contact-page/types/hero-section.types.ts

import { HeadingLine } from '../../home-page/utils/heading-markup';

/** The Contact page hero exactly as it is stored. A singleton. */
export interface ContactHeroSection {
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
export interface ResolvedContactHeroSection extends ContactHeroSection {
  image: string | null;
  /** Null means "use the desktop one". */
  mobileImage: string | null;
  headingLines: HeadingLine[];
}

/** The website-facing shape: no ids, timestamps, or authorship. */
export interface PublicContactHeroSection {
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  image: string | null;
  /** Null means the desktop image serves every viewport. */
  mobileImage: string | null;
  /** Not authored: derived from the heading, so an image is never unlabelled. */
  imageAlt: string | null;
}

/** PUT body. A full replace: an absent nullable field is stored as null. */
export interface ReplaceContactHeroSectionInput {
  heading: string;
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
}
