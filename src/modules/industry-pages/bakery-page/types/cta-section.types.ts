// src/modules/industry-pages/bakery-page/types/cta-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The Bakery & Confectionery page's closing band.
 *
 * Two shapes: the band itself - one record, two crops of the same artwork and
 * two buttons - and the row of capability marks under the buttons, which is a
 * list because a mark is added or retired on its own.
 *
 * The heading and description live once in page_section_copy under
 * ('bakery', 'cta').
 */

// ── the band ──────────────────────────────────────────────────────────────

export interface BakeryCtaSection {
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
export interface ResolvedBakeryCtaSection extends BakeryCtaSection {
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
export interface UpsertBakeryCtaSectionInput {
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;
}

// ── the capability marks ──────────────────────────────────────────────────

export interface BakeryCtaFeature {
  id: string;
  /** A name from ERP_ICON_NAMES - the site maps it back to a lucide component. */
  icon: string;
  /** The first line: "Streamline". */
  label: string;
  /** The second line: "Procurement". */
  subLabel: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBakeryCtaFeatureInput {
  icon: string;
  label: string;
  subLabel: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBakeryCtaFeatureInput = Partial<CreateBakeryCtaFeatureInput>;

export interface BakeryCtaFeatureFilters {
  status?: ContentStatus;
}

export interface ReorderBakeryCtaFeaturesInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * Null when the copy or the band is missing - the page then keeps the band it
 * ships, which is a complete working one. An empty features list is allowed:
 * the band reads fine without the marks under it.
 */
export interface PublicBakeryCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  desktopImage: string | null;
  mobileImage: string | null;
  primary: { label: string; href: string };
  secondary: { label: string; href: string } | null;
  features: Array<{ icon: string; label: string; subLabel: string }>;
}
