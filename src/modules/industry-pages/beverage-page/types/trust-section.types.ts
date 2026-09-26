// src/modules/industry-pages/beverage-page/types/trust-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The trust section: one heading over a two-row marquee of customer logos and a
 * stat card that turns over between photographed figures.
 *
 * Two shapes, on the Engineering page's pattern, because they are two
 * different edits - a logo is added the day a brand goes live, and a figure is
 * revised when the numbers change.
 *
 * The eyebrow, heading and subtext above both live once in page_section_copy
 * under ('beverage', 'trust').
 */

// ── the logo marquee ──────────────────────────────────────────────────────

export interface BeverageTrustLogo {
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
export interface ResolvedBeverageTrustLogo extends BeverageTrustLogo {
  image: string | null;
}

export interface CreateBeverageTrustLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeverageTrustLogoInput = Partial<CreateBeverageTrustLogoInput>;

export interface BeverageTrustLogoFilters {
  status?: ContentStatus;
}

// ── the stats ─────────────────────────────────────────────────────────────

/**
 * One figure on the turning stat card, over its own photograph.
 */
export interface BeverageTrustStat {
  id: string;
  /** The figure as it is read: "2.5 Cr+", "45+". Text, not a number. */
  value: string;
  label: string;
  /** The photograph behind it. Exclusive with imageFileId; both null draws the dark ground. */
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The stat with its two sources collapsed into the one URL to render. */
export interface ResolvedBeverageTrustStat extends BeverageTrustStat {
  image: string | null;
}

export interface CreateBeverageTrustStatInput {
  value: string;
  label: string;
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeverageTrustStatInput = Partial<CreateBeverageTrustStatInput>;

export interface BeverageTrustStatFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read: the copy, the stats and the logos.
 *
 * Null when the copy is missing, or when neither list has anything to show -
 * the page then keeps the section it ships. One empty list is allowed.
 */
export interface PublicBeverageTrustSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  stats: Array<{ value: string; label: string; image: string | null }>;
  logos: Array<{ image: string; alt: string }>;
}
