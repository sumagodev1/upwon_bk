// src/modules/industry-pages/beverage-page/types/cta-section.types.ts

import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The Beverages & Juices page's closing band.
 *
 * One record, not a list: the page closes on a single invitation.
 *
 * The POS band's shape without its footnote and handwritten note: two crops
 * of the same artwork - a wide one for desktop and a tall one for phones - and
 * two buttons.
 *
 * The heading and description live once in page_section_copy under
 * ('beverage', 'cta'). The band has no eyebrow today; the
 * copy's eyebrow is optional, so one can be added without a schema change.
 */

export interface BeverageCtaSection {
  id: string;
  /** The wide artwork, shown from 1024px up. Exclusive with desktopImageFileId. */
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  /** The tall crop phones actually download. Exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
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

/** The band with both artwork pairs resolved to the URLs to actually render. */
export interface ResolvedBeverageCtaSection extends BeverageCtaSection {
  desktopImage: string | null;
  mobileImage: string | null;
}

/**
 * A full replacement, not a patch.
 *
 * The band is one small form, so a partial update would only add a way for the
 * buttons to drift out of step with the artwork while an administrator thinks
 * they saved both.
 */
export interface UpsertBeverageCtaSectionInput {
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;
}

/**
 * The website-facing shape.
 *
 * Null when the copy or the record is missing - the page then keeps the band it
 * ships, which is a complete working one. The artwork is optional either way:
 * without it the site keeps the artwork it ships.
 */
export interface PublicBeverageCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  desktopImage: string | null;
  mobileImage: string | null;
  primary: { label: string; href: string };
  secondary: { label: string; href: string } | null;
}
