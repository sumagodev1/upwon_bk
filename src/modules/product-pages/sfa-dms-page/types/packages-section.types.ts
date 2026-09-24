// src/modules/product-pages/sfa-dms-page/types/packages-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { SfaIconName } from '../utils/icons';

/**
 * "Start With Your Field Team. Add Distributor Control When You're Ready."
 *
 * The phased adoption path, drawn as pricing-table cards with no prices: one
 * card per stage, each listing what it adds to the stage before it.
 *
 * Two shapes, because they are edited at different moments - the pitch is
 * rewritten rarely, a capability is added to a tick list the week it ships.
 *
 * The eyebrow, heading and subtext above the cards live once in
 * page_section_copy under ('sfa-dms', 'packages').
 */

// ── the cards ─────────────────────────────────────────────────────────────

export interface SfaPackageCard {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: SfaIconName;
  /** The pill in the top-right corner: 'Stage 1', 'Stage 2', 'Complete'. */
  stageLabel: string;
  title: string;
  /** The coloured line under the title. */
  subtitle: string;
  description: string;
  /**
   * The card's accent, as #RRGGBB. The icon tint and the badge border are this
   * colour at reduced alpha, computed on the site rather than stored.
   */
  accentColor: string;
  buttonLabel: string;
  buttonHref: string;
  /** The small caps line over the ticks. */
  featuresLabel: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSfaPackageCardInput {
  icon: SfaIconName;
  stageLabel: string;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  buttonLabel: string;
  buttonHref: string;
  featuresLabel: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaPackageCardInput = Partial<CreateSfaPackageCardInput>;

export interface SfaPackageCardFilters {
  status?: ContentStatus;
}

// ── the ticks under each card ─────────────────────────────────────────────

export interface SfaPackageFeature {
  id: string;
  cardId: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSfaPackageFeatureInput {
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaPackageFeatureInput = Partial<CreateSfaPackageFeatureInput>;

export interface SfaPackageFeatureFilters {
  status?: ContentStatus;
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read: the copy, and the cards with their ticks.
 *
 * Null when the copy is missing or no card is live - the page then keeps the
 * section it ships, which is a complete working one.
 */
export interface PublicSfaPackagesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  cards: Array<{
    icon: SfaIconName;
    stageLabel: string;
    title: string;
    subtitle: string;
    description: string;
    accentColor: string;
    buttonLabel: string;
    buttonHref: string;
    featuresLabel: string;
    features: string[];
  }>;
}
