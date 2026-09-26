// src/modules/industry-pages/spices-agro-page/types/trust-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The trust section: one centred heading over a marquee of customer logos and a
 * product screenshot under it.
 *
 * Two shapes: the logos are a list, on the Beverages page's pattern, and the
 * screenshot is one record - there is only one, and it is a different edit
 * from adding a brand.
 *
 * The eyebrow, heading and subtext above both live once in page_section_copy
 * under ('spices-agro', 'trust').
 */

// ── the logo marquee ──────────────────────────────────────────────────────

export interface SpicesAgroTrustLogo {
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
export interface ResolvedSpicesAgroTrustLogo extends SpicesAgroTrustLogo {
  image: string | null;
}

export interface CreateSpicesAgroTrustLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSpicesAgroTrustLogoInput = Partial<CreateSpicesAgroTrustLogoInput>;

export interface SpicesAgroTrustLogoFilters {
  status?: ContentStatus;
}

// ── the product panel ─────────────────────────────────────────────────────

export interface SpicesAgroTrustPanel {
  id: string;
  /** The screenshot. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** What the screenshot shows, read in place of it. */
  imageAlt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedSpicesAgroTrustPanel extends SpicesAgroTrustPanel {
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertSpicesAgroTrustPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read: the copy, the logos and the screenshot.
 *
 * Null when the copy is missing, or when there is neither a logo nor a panel -
 * the page then keeps the section it ships. `image` is null when there is no
 * panel, or it has no image, and the site then keeps its own screenshot.
 */
export interface PublicSpicesAgroTrustSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  logos: Array<{ image: string; alt: string }>;
  image: string | null;
  imageAlt: string | null;
}
