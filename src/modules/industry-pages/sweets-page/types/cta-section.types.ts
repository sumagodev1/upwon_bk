// src/modules/industry-pages/sweets-page/types/cta-section.types.ts

import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The Sweets & Namkeen page's closing band.
 *
 * One record: two crops of the same artwork - a wide one for desktop and a
 * tall one for the phone banner - and two buttons. The mobile crop is
 * optional; without it the page crops the desktop artwork.
 *
 * The heading and description live once in page_section_copy under
 * ('sweets', 'cta').
 */

// ── the band ──────────────────────────────────────────────────────────────

export interface SweetsCtaSection {
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
export interface ResolvedSweetsCtaSection extends SweetsCtaSection {
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
export interface UpsertSweetsCtaSectionInput {
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
export interface PublicSweetsCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  desktopImage: string | null;
  mobileImage: string | null;
  primary: { label: string; href: string };
  secondary: { label: string; href: string } | null;
}
