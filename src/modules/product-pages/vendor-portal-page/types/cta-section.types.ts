// src/modules/product-pages/vendor-portal-page/types/cta-section.types.ts

import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The closing band - "See Your Vendor Base on UpWon — Live, in 30 Minutes."
 *
 * A photograph with the copy laid over its left and two buttons under it, and
 * a phone crop of the same scene for narrow viewports.
 *
 * A singleton: the page has exactly one, so there is no list, no ordering and
 * no status - the band either exists or the site keeps the one it ships.
 *
 * Simpler than the WMS band in two ways, both because the design is: the
 * buttons carry no icon (both draw the same arrow), and there is no trust
 * strip beneath them.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('vms', 'cta').
 */

export interface VmsCtaSection {
  /** The photograph. Exclusive with imageFileId. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The phone crop. Null falls back to the desktop photograph. */
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;

  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;

  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The band with both image pairs collapsed into the URLs to render. */
export interface ResolvedVmsCtaSection extends VmsCtaSection {
  image: string | null;
  mobileImage: string | null;
}

export interface UpsertVmsCtaSectionInput {
  imageUrl: string | null;
  imageFileId: string | null;
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
 * Null when the copy is missing or the band has never been authored - the
 * page then keeps the band it ships.
 */
export interface PublicVmsCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  image: string | null;
  mobileImage: string | null;
  primary: { label: string; href: string };
  secondary: { label: string; href: string } | null;
}
