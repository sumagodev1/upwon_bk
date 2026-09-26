// src/modules/industry-pages/engineering-manufacturing-page/types/trust-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { EngineeringIconName } from '../utils/icons';

/**
 * The trust section: one heading over a row of figure cards and a marquee of
 * customer logos.
 *
 * Two shapes, on the FMS proof strip's pattern, because they are two different
 * edits - a logo is added the day a brand goes live, and a figure is revised
 * when the numbers change.
 *
 * The eyebrow, heading and subtext above both live once in page_section_copy
 * under ('engineering-manufacturing', 'trust').
 */

// ── the logo marquee ──────────────────────────────────────────────────────

export interface EngineeringTrustLogo {
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
export interface ResolvedEngineeringTrustLogo extends EngineeringTrustLogo {
  image: string | null;
}

export interface CreateEngineeringTrustLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateEngineeringTrustLogoInput = Partial<CreateEngineeringTrustLogoInput>;

export interface EngineeringTrustLogoFilters {
  status?: ContentStatus;
}

// ── the figure cards ──────────────────────────────────────────────────────

/** One figure on a card: the number as it reads, and what it counts. */
export interface TrustFigure {
  value: string;
  label: string;
}

export interface EngineeringTrustCard {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: EngineeringIconName;
  /** The icon's colour, as #RRGGBB. */
  accentColor: string;
  /** The square behind the icon, as #RRGGBB. */
  tintColor: string;
  /** The figure the card opens on. */
  value: string;
  label: string;
  /** The figure it turns over to. Null means the card holds still. */
  alternate: TrustFigure | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEngineeringTrustCardInput {
  icon: EngineeringIconName;
  accentColor: string;
  tintColor: string;
  value: string;
  label: string;
  alternate: TrustFigure | null;
  displayOrder?: number;
  status: ContentStatus;
}

/** `alternate: null` clears the second figure; undefined leaves it alone. */
export type UpdateEngineeringTrustCardInput = Partial<CreateEngineeringTrustCardInput>;

export interface EngineeringTrustCardFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read: the copy, the cards and the logos.
 *
 * Null when the copy is missing, or when neither list has anything to show -
 * the page then keeps the section it ships. One empty list is allowed.
 */
export interface PublicEngineeringTrustSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  cards: Array<{
    icon: EngineeringIconName;
    accentColor: string;
    tintColor: string;
    /** One or two figures, in the order the card shows them. */
    figures: TrustFigure[];
  }>;
  logos: Array<{ image: string; alt: string }>;
}
