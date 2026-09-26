// src/modules/about-page/types/cta-section.types.ts

import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * The closing CTA banner above the footer, exactly as it is stored. A singleton.
 *
 * No eyebrow, unlike every other section on this page: the banner has never had
 * one.
 *
 * Two crops of the artwork rather than two sizes of one picture: the wide banner
 * the card shows from 1024px up, and a portrait one for the narrow layout below
 * it. See 031_about_page_cta_mobile_image.sql for why the section needs both,
 * and utils/about-image-spec.ts for what each has to be.
 */
export interface AboutCtaSection {
  /** Authored text in the home heading markup: newline and **accent**. */
  heading: string;
  subtext: string;
  /** An absolute URL or a site-relative path. Mutually exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Mutually exclusive with imageUrl. */
  imageFileId: string | null;
  /** Narrow-layout art (<= 1023px). Mutually exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  /** Narrow-layout upload. Mutually exclusive with mobileImageUrl. */
  mobileImageFileId: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The admin shape: the stored row plus the resolved image URLs and the parsed
 * heading, so the form can round-trip the raw fields and preview the result.
 */
export interface ResolvedAboutCtaSection extends AboutCtaSection {
  image: string | null;
  /** Null means nothing is published for the narrow layout. */
  mobileImage: string | null;
  headingLines: HeadingLine[];
}

/** The website-facing shape: no ids, timestamps, or authorship. */
export interface PublicAboutCtaSection {
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null renders the banner on the plain card the section falls back to. */
  image: string | null;
  /**
   * The crop for the narrow layout, below the section's own `lg` breakpoint.
   * Null means nothing is published for it, which is what the site renders
   * today - so a banner with no mobile crop looks exactly as it did before this
   * field existed.
   */
  mobileImage: string | null;
  /** Not authored: derived from the heading, so an image is never unlabelled. */
  imageAlt: string | null;
}

/** PUT body. A full replace: an absent nullable field is stored as null. */
export interface ReplaceAboutCtaSectionInput {
  heading: string;
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
}
