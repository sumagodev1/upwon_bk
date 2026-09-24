// src/modules/product-pages/sfa-dms-page/types/cta-section.types.ts

import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The SFA-DMS page's closing band.
 *
 * One record, not a list: the page closes on a single invitation.
 *
 * Shaped differently from the ERP band, which carries a desktop and a mobile
 * artwork. This one has a photograph behind the whole band and the product
 * dashboard peeking up from the bottom edge, so those are the two images.
 *
 * The eyebrow, heading and description live once in page_section_copy under
 * ('sfa-dms', 'cta').
 */

export interface SfaCtaSection {
  id: string;
  /** The photograph behind the band. Exclusive with backgroundImageFileId. */
  backgroundImageUrl: string | null;
  backgroundImageFileId: string | null;
  /** The screenshot along the bottom edge. Exclusive with dashboardImageFileId. */
  dashboardImageUrl: string | null;
  dashboardImageFileId: string | null;
  dashboardAlt: string | null;
  buttonLabel: string;
  buttonHref: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The band with both image pairs resolved to the URLs to actually render. */
export interface ResolvedSfaCtaSection extends SfaCtaSection {
  backgroundImage: string | null;
  dashboardImage: string | null;
}

/**
 * A full replacement, not a patch.
 *
 * The band is one small form, so a partial update would only add a way for the
 * button to drift out of step with the artwork while an administrator thinks
 * they saved both.
 */
export interface UpsertSfaCtaSectionInput {
  backgroundImageUrl: string | null;
  backgroundImageFileId: string | null;
  dashboardImageUrl: string | null;
  dashboardImageFileId: string | null;
  dashboardAlt: string | null;
  buttonLabel: string;
  buttonHref: string;
}

/**
 * The website-facing shape.
 *
 * Null when the copy has never been authored - the page then keeps the band it
 * ships, which is a complete working one.
 */
export interface PublicSfaCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  backgroundImage: string | null;
  dashboardImage: string | null;
  dashboardAlt: string | null;
  buttonLabel: string;
  buttonHref: string;
}
