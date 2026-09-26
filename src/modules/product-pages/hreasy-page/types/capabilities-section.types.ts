// src/modules/product-pages/hreasy-page/types/capabilities-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Advanced Platform for Every HR Need - From Recruitment to Retirement."
 *
 * A list of lifecycle stages down the left, and beside the selected one the
 * panel artwork for that stage.
 *
 * A module is its label and its image, and nothing else: the orange icon
 * tile, the repeated heading and the line under it are all inside the
 * artwork, so holding them as fields would be a second copy of words already
 * baked into the picture.
 *
 * The eyebrow, heading and subtext above the list are not here either - they
 * are stored once in page_section_copy under ('hreasy', 'capabilities') and
 * merged into the public read below.
 */

export interface HreasyCapabilityModule {
  id: string;
  /** The title in the left-hand list. */
  name: string;
  /** Stable across renames, so a selected row survives a wording change. */
  slug: string;
  /** The panel artwork. Exclusive with imageFileId, and one of them is set. */
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedHreasyCapabilityModule extends HreasyCapabilityModule {
  /** The two image sources collapsed into the one URL to actually render. */
  image: string | null;
}

export interface CreateHreasyCapabilityModuleInput {
  name: string;
  slug: string;
  imageUrl: string | null;
  imageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateHreasyCapabilityModuleInput {
  name?: string;
  slug?: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface HreasyCapabilityModuleFilters {
  status?: ContentStatus;
}

export interface ReorderHreasyCapabilityModulesInput {
  ids: string[];
}

/** One row in the website-facing list, in order. */
export interface PublicHreasyCapabilityModule {
  slug: string;
  name: string;
  image: string | null;
}

/**
 * The website-facing shape: the copy that heads the section and the modules
 * under it, merged into the one block the site renders.
 */
export interface PublicHreasyCapabilitiesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  modules: PublicHreasyCapabilityModule[];
}
