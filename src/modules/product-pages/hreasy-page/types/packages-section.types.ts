// src/modules/product-pages/hreasy-page/types/packages-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Start With Core HR. Grow Into Full Performance Management."
 *
 * Three tier cards shown as pricing-style plans, the middle one highlighted.
 *
 * Two shapes, because they are two different edits: a tier's pitch is
 * rewritten rarely, where a tick is added to a list the week that capability
 * ships.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('hreasy', 'packages').
 */

/**
 * Which of the three button treatments a card wears.
 *
 * A name rather than colours: the site draws them with Tailwind classes that
 * must exist in its source at build time.
 */
export const PACKAGE_BUTTON_STYLES = ['FILLED', 'OUTLINE_ACCENT', 'OUTLINE_NAVY'] as const;

export type HreasyPackageButtonStyle = (typeof PACKAGE_BUTTON_STYLES)[number];

export interface HreasyPackageFeature {
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

export interface HreasyPackageTier {
  id: string;
  /** The small caps label: CORE, PRO, PLUS. */
  name: string;
  /** Stable across renames, so a deep link keeps pointing at the same tier. */
  slug: string;
  /** The card's prominent line: "Core HR & Payroll". */
  lead: string;
  tagline: string;
  /** The bordered pill under the tagline. */
  scope: string;
  /** The italic label above the ticks. Null on the tier with nothing beneath it. */
  inheritsLabel: string | null;
  buttonLabel: string;
  buttonHref: string;
  buttonStyle: HreasyPackageButtonStyle;
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
export interface ResolvedHreasyPackageTier extends HreasyPackageTier {
  features: HreasyPackageFeature[];
}

export interface CreateHreasyPackageTierInput {
  name: string;
  slug: string;
  lead: string;
  tagline: string;
  scope: string;
  inheritsLabel: string | null;
  buttonLabel: string;
  buttonHref: string;
  buttonStyle: HreasyPackageButtonStyle;
  isPopular: boolean;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateHreasyPackageTierInput {
  name?: string;
  slug?: string;
  lead?: string;
  tagline?: string;
  scope?: string;
  inheritsLabel?: string | null;
  buttonLabel?: string;
  buttonHref?: string;
  buttonStyle?: HreasyPackageButtonStyle;
  isPopular?: boolean;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface CreateHreasyPackageFeatureInput {
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyPackageFeatureInput = Partial<CreateHreasyPackageFeatureInput>;

export interface HreasyPackageTierFilters {
  status?: ContentStatus;
}

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The whole section in one read: the cards are drawn side by side and
 * compared against each other, so sending them one at a time would mean three
 * requests for one row of content.
 */
export interface PublicHreasyPackagesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  tiers: Array<{
    slug: string;
    name: string;
    lead: string;
    tagline: string;
    scope: string;
    inheritsLabel: string | null;
    buttonLabel: string;
    buttonHref: string;
    buttonStyle: HreasyPackageButtonStyle;
    isPopular: boolean;
    features: string[];
  }>;
}
