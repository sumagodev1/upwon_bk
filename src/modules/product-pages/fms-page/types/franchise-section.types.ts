// src/modules/product-pages/fms-page/types/franchise-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { FmsIconName } from '../utils/icons';

/**
 * The franchise category map.
 *
 * A row of tabs, and under the selected one a panel carrying its photograph, a
 * numbered flow and a strip of benefits. Three lists edited and ordered
 * independently, with both child lists owned by the category they describe -
 * unlike the ERP page's industry switcher, whose benefits strip is shared
 * across every industry.
 *
 * The eyebrow, heading and subtext above the tabs live once in
 * page_section_copy under ('fms', 'recognition'), and the orange highlight is
 * the **accent** marker inside that heading rather than a field of its own.
 */

export interface FmsFranchiseStep {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: FmsIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Same shape as a step - an icon, a title and a line - but a separate list and
 * a separate table: the flow is the sequence, the strip is the payoff, and
 * they are reordered and published independently.
 */
export type FmsFranchiseBenefit = FmsFranchiseStep;

export interface FmsFranchiseCategory {
  id: string;
  name: string;
  /** Stable across renames, so the site's selection survives a wording change. */
  slug: string;
  tagline: string;
  description: string;
  /** The tab pictogram. Exclusive with iconFileId. */
  iconUrl: string | null;
  iconFileId: string | null;
  /** The panel photograph. Exclusive with imageFileId. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** #RRGGBB. The site derives the 12% wash from it. */
  accentColor: string;
  /** #RRGGBB. The pale ground the panel copy sits on - not derivable. */
  surfaceColor: string;
  exploreLabel: string;
  exploreHref: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A category with its media resolved and both child lists attached. */
export interface ResolvedFmsFranchiseCategory extends FmsFranchiseCategory {
  icon: string | null;
  image: string | null;
  steps: FmsFranchiseStep[];
  benefits: FmsFranchiseBenefit[];
}

export interface CreateFmsFranchiseCategoryInput {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  iconUrl: string | null;
  iconFileId: string | null;
  imageUrl: string | null;
  imageFileId: string | null;
  accentColor: string;
  surfaceColor: string;
  exploreLabel: string;
  exploreHref: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateFmsFranchiseCategoryInput {
  name?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  iconUrl?: string | null;
  iconFileId?: string | null;
  imageUrl?: string | null;
  imageFileId?: string | null;
  accentColor?: string;
  surfaceColor?: string;
  exploreLabel?: string;
  exploreHref?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface CreateFmsFranchiseEntryInput {
  title: string;
  description: string;
  icon: FmsIconName;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsFranchiseEntryInput = Partial<CreateFmsFranchiseEntryInput>;

export interface FmsFranchiseCategoryFilters {
  status?: ContentStatus;
}

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The whole section in one read: the tabs switch panels in the browser without
 * going back to the server, so sending categories one at a time would mean a
 * request per click for content already known - and the autoplay would fire
 * one every few seconds.
 */
export interface PublicFmsFranchiseSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  categories: Array<{
    slug: string;
    name: string;
    tagline: string;
    description: string;
    icon: string;
    image: string;
    accentColor: string;
    surfaceColor: string;
    exploreLabel: string;
    exploreHref: string;
    steps: Array<{ title: string; description: string; icon: FmsIconName }>;
    benefits: Array<{ title: string; description: string; icon: FmsIconName }>;
  }>;
}
