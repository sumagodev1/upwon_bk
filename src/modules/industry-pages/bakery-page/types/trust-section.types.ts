// src/modules/industry-pages/bakery-page/types/trust-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Powering Growth for Bakery & Confectionery Businesses"
 *
 * One heading over two rows: the customer logos, then a strip of figures each
 * with a round illustration above it.
 *
 * Two shapes rather than one, because they are two different edits - a logo is
 * added the day a brand goes live, a figure is revised when the numbers land.
 * The same split as the SFA-DMS proof section, less its card.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('bakery', 'trust').
 */

// ── the customer logos ────────────────────────────────────────────────────

export interface BakeryTrustLogo {
  id: string;
  /** The mark. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The brand name, read in place of the image. */
  alt: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The logo with its two sources collapsed into the one URL to render. */
export interface ResolvedBakeryTrustLogo extends BakeryTrustLogo {
  image: string | null;
}

export interface CreateBakeryTrustLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBakeryTrustLogoInput = Partial<CreateBakeryTrustLogoInput>;

export interface BakeryTrustLogoFilters {
  status?: ContentStatus;
}

// ── the figures ───────────────────────────────────────────────────────────

export interface BakeryTrustStat {
  id: string;
  /**
   * The figure as it is read: "25,000+", "2.5 Cr+". Text rather than a number,
   * because the strip renders it verbatim and the suffix carries as much
   * meaning as the digits.
   */
  value: string;
  label: string;
  /** The round illustration. Exclusive with iconFileId; both may be null. */
  iconUrl: string | null;
  iconFileId: string | null;
  /** The highlighted cell - lighter ground and an underline. */
  isFeatured: boolean;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedBakeryTrustStat extends BakeryTrustStat {
  icon: string | null;
}

export interface CreateBakeryTrustStatInput {
  value: string;
  label: string;
  iconUrl: string | null;
  iconFileId: string | null;
  isFeatured: boolean;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBakeryTrustStatInput = Partial<CreateBakeryTrustStatInput>;

export interface BakeryTrustStatFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read.
 *
 * Null when the copy is missing, or when neither row has anything to show -
 * the page then keeps the section it ships, which is a complete working one.
 */
export interface PublicBakeryTrustSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  logos: Array<{ image: string; alt: string }>;
  stats: Array<{ value: string; label: string; icon: string | null; featured: boolean }>;
}
