// src/modules/industry-pages/dairy-page/types/cta-section.types.ts

import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The Dairy & Ice Cream page's closing band.
 *
 * One record: the artwork and two buttons. The mobile crop is optional - the
 * page crops the desktop artwork into a banner when there is none.
 *
 * The heading and description live once in page_section_copy under
 * ('dairy', 'cta').
 */

// ── the band ──────────────────────────────────────────────────────────────

export interface DairyCtaSection {
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
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The band with both artwork pairs resolved to the URLs to actually render. */
export interface ResolvedDairyCtaSection extends DairyCtaSection {
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
export interface UpsertDairyCtaSectionInput {
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;
}

// ── the website-facing shape ──────────────────────────────────────────────

/** Null when the copy or the band is missing - the page then hides the band. */
export interface PublicDairyCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  desktopImage: string | null;
  mobileImage: string | null;
  primary: { label: string; href: string };
  secondary: { label: string; href: string } | null;
}
