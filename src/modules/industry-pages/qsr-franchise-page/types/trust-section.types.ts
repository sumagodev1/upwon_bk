// src/modules/industry-pages/qsr-franchise-page/types/trust-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { QsrFranchiseIconName } from '../utils/icons';

/**
 * The trust section: one heading over a marquee of customer logos, and a
 * mosaic under it of three stat tiles and two photographs.
 *
 * Three shapes, because they are three different edits - a logo is added the
 * day a brand goes live, a figure is revised when the numbers change, and the
 * photographs are swapped as one pair.
 *
 * The eyebrow, heading and subtext above all of them live once in
 * page_section_copy under ('qsr-franchise', 'trust').
 */

// ── the logo marquee ──────────────────────────────────────────────────────

export interface QsrFranchiseTrustLogo {
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
export interface ResolvedQsrFranchiseTrustLogo extends QsrFranchiseTrustLogo {
  image: string | null;
}

export interface CreateQsrFranchiseTrustLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchiseTrustLogoInput = Partial<CreateQsrFranchiseTrustLogoInput>;

export interface QsrFranchiseTrustLogoFilters {
  status?: ContentStatus;
}

// ── the stat tiles ────────────────────────────────────────────────────────

/**
 * One stat tile in the mosaic: a figure, what it counts, a line about it, and
 * an icon in the round badge beside the figure.
 */
export interface QsrFranchiseTrustStat {
  id: string;
  /** The figure as it is read: "2.5 Cr+", "18,000+". Text, not a number. */
  value: string;
  label: string;
  description: string;
  /** A name from the page's icon allowlist. */
  icon: QsrFranchiseIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQsrFranchiseTrustStatInput {
  value: string;
  label: string;
  description: string;
  icon: QsrFranchiseIconName;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchiseTrustStatInput = Partial<CreateQsrFranchiseTrustStatInput>;

export interface QsrFranchiseTrustStatFilters {
  status?: ContentStatus;
}

// ── the photographs ───────────────────────────────────────────────────────

/**
 * The mosaic's two photographs: the small tile under the first figure, and
 * the tall panel down the right-hand side. Each optional - without one the
 * site keeps the photograph it ships in that place.
 */
export interface QsrFranchiseTrustPanel {
  id: string;
  /** The small tile. Exclusive with smallImageFileId. */
  smallImageUrl: string | null;
  smallImageFileId: string | null;
  /** The tall panel. Exclusive with tallImageFileId. */
  tallImageUrl: string | null;
  tallImageFileId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedQsrFranchiseTrustPanel extends QsrFranchiseTrustPanel {
  /** Each pair collapsed into the one URL to render. */
  smallImage: string | null;
  tallImage: string | null;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertQsrFranchiseTrustPanelInput {
  smallImageUrl: string | null;
  smallImageFileId: string | null;
  tallImageUrl: string | null;
  tallImageFileId: string | null;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read: the copy, the logos, the stats and the
 * photographs.
 *
 * Null when the copy is missing, or when neither list has anything to show -
 * the page then keeps the section it ships. One empty list is allowed. A null
 * photograph means the site keeps its own in that place.
 */
export interface PublicQsrFranchiseTrustSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  logos: Array<{ image: string; alt: string }>;
  stats: Array<{ value: string; label: string; description: string; icon: string }>;
  smallImage: string | null;
  tallImage: string | null;
}
