// src/modules/product-pages/pos-page/types/growth-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Start With Your Counter. Grow Into Full Franchise Control."
 *
 * Three tier cards shown as pricing-style plans, with a reassurance line under
 * the row.
 *
 * Three shapes, because they are three different edits: the line under the row
 * is set once, a tier's pitch is rewritten rarely, and a tick is added to a
 * list the week that capability ships.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('pos', 'packages').
 */

/** The reassurance line under the row. One record for the whole section. */
export interface PosGrowthSection {
  id: string;
  /** Null turns the line off; the row of cards reads fine without it. */
  footnote: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertPosGrowthSectionInput {
  footnote?: string | null;
}

export interface PosGrowthFeature {
  id: string;
  tierId: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PosGrowthTier {
  id: string;
  /** The small caps label: CORE, PRO, PLUS. */
  name: string;
  /** Stable across renames, so a deep link keeps pointing at the same tier. */
  slug: string;
  /** The large line where a price would be. */
  lead: string;
  tagline: string;
  /** The bordered pill under the tagline. */
  scope: string;
  /** The bold first tick. Null on the tier with nothing beneath it. */
  inheritsLabel: string | null;
  buttonLabel: string;
  buttonHref: string;
  /** The card wearing the "Most Popular" badge. At most one is true. */
  isPopular: boolean;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A tier with its tick list attached. */
export interface ResolvedPosGrowthTier extends PosGrowthTier {
  features: PosGrowthFeature[];
}

export interface CreatePosGrowthTierInput {
  name: string;
  slug: string;
  lead: string;
  tagline: string;
  scope: string;
  inheritsLabel: string | null;
  buttonLabel: string;
  buttonHref: string;
  isPopular: boolean;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdatePosGrowthTierInput {
  name?: string;
  slug?: string;
  lead?: string;
  tagline?: string;
  scope?: string;
  inheritsLabel?: string | null;
  buttonLabel?: string;
  buttonHref?: string;
  isPopular?: boolean;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface CreatePosGrowthFeatureInput {
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosGrowthFeatureInput = Partial<CreatePosGrowthFeatureInput>;

export interface PosGrowthTierFilters {
  status?: ContentStatus;
}

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The whole section in one read: the cards are drawn side by side and compared
 * against each other, so sending them one at a time would mean three requests
 * for one row of content.
 */
export interface PublicPosGrowthSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null when no line is set - the row of cards renders without it. */
  footnote: string | null;
  /**
   * The same line parsed into the accent tree the site renders.
   *
   * This page draws the growth-path line with an orange half, so it is
   * authored in the heading grammar - **like this** - and parsed here rather
   * than on the site. Null exactly when `footnote` is.
   */
  footnoteLines: HeadingLine[] | null;
  tiers: Array<{
    slug: string;
    name: string;
    lead: string;
    tagline: string;
    scope: string;
    inheritsLabel: string | null;
    buttonLabel: string;
    buttonHref: string;
    isPopular: boolean;
    features: string[];
  }>;
}
