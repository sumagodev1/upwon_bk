// src/modules/why-upwon-page/types/hero-section.types.ts

import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * The Why UpWon page's hero: one record, not a slider - the page opens on a
 * single split hero, the artwork on one side and the copy in the space it
 * leaves.
 *
 * Two crops of the same artwork - a wide one for desktop, a tall one for
 * phones - a description of what it shows, and two buttons. The same shape as
 * the industry pages' closing bands, plus the description, because here the
 * picture is the page's first content rather than decoration.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('why-upwon', 'hero').
 */

export interface WhyUpwonHeroSection {
  id: string;
  /** The wide artwork, shown from 1024px up. Exclusive with desktopImageFileId. */
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  /** The tall crop phones actually download. Exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  /** What the artwork shows, read in place of it. */
  imageAlt: string;
  primaryLabel: string;
  primaryHref: string;
  /** The outlined button beside it. Both halves or neither. */
  secondaryLabel: string | null;
  secondaryHref: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The hero with both artwork pairs resolved to the URLs to actually render. */
export interface ResolvedWhyUpwonHeroSection extends WhyUpwonHeroSection {
  desktopImage: string | null;
  mobileImage: string | null;
}

/**
 * A full replacement, not a patch.
 *
 * The hero is one small form, so a partial update would only add a way for the
 * buttons to drift out of step with the artwork while an administrator thinks
 * they saved both.
 */
export interface UpsertWhyUpwonHeroSectionInput {
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  imageAlt: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;
}

/**
 * The website-facing shape.
 *
 * Null when the copy or the record is missing - the page then keeps the hero
 * it ships, which is a complete working one. The artwork is optional either
 * way: without it the site keeps the artwork it ships.
 */
export interface PublicWhyUpwonHeroSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  desktopImage: string | null;
  mobileImage: string | null;
  imageAlt: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string } | null;
}
