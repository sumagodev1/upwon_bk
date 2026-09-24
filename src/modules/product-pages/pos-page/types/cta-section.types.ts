// src/modules/product-pages/pos-page/types/cta-section.types.ts

import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The POS page's closing band.
 *
 * One record, not a list: the page closes on a single invitation.
 *
 * Shaped differently from the SFA-DMS band, which carries a photograph and a
 * dashboard screenshot. This one has two crops of the same artwork - a wide one
 * for desktop and a tall one for phones - two buttons, and a footnote under
 * them.
 *
 * The eyebrow, heading and description live once in page_section_copy under
 * ('pos', 'cta').
 */

export interface PosCtaSection {
  id: string;
  /** The wide artwork, shown from 768px up. Exclusive with desktopImageFileId. */
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
  /** The reassurance line under the buttons. */
  footnote: string | null;
  /**
   * The handwritten note in the top right, drawn only from 1024px up. A
   * newline in it is a line break, the same grammar the headings use.
   */
  note: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The band with both artwork pairs resolved to the URLs to actually render. */
export interface ResolvedPosCtaSection extends PosCtaSection {
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
export interface UpsertPosCtaSectionInput {
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  footnote: string | null;
  note: string | null;
}

/**
 * The website-facing shape.
 *
 * Null when the copy or the record is missing - the page then keeps the band it
 * ships, which is a complete working one. The artwork is optional either way:
 * without it the band falls back to its cream ground, which is a design rather
 * than a hole.
 */
export interface PublicPosCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  desktopImage: string | null;
  mobileImage: string | null;
  primary: { label: string; href: string };
  secondary: { label: string; href: string } | null;
  footnote: string | null;
  /** The handwritten note, or null when the band is drawn without one. */
  note: string | null;
}
