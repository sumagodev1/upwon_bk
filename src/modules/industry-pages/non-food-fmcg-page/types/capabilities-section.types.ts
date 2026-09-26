// src/modules/industry-pages/non-food-fmcg-page/types/capabilities-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Everything You Need. One Connected Platform." - the Core Capabilities section: copy over a row of cards, each an illustration, a title and a description.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('non-food-fmcg', 'capabilities').
 */

export interface NonFoodFmcgCapabilityCard {
  id: string;
  /** The card title. */
  title: string;
  /** The sentence under the title. */
  description: string;
  /** The illustration at the top of the card. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedNonFoodFmcgCapabilityCard extends NonFoodFmcgCapabilityCard {
  image: string | null;
}

export interface CreateNonFoodFmcgCapabilityCardInput {
  title: string;
  description: string;
  imageUrl: string | null;
  imageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateNonFoodFmcgCapabilityCardInput = Partial<CreateNonFoodFmcgCapabilityCardInput>;

export interface NonFoodFmcgCapabilityCardFilters {
  status?: ContentStatus;
}

export interface ReorderNonFoodFmcgCapabilityCardsInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Null when the copy is missing or no capability is live - the page then hides the
 * section. An item whose uploaded artwork has been deleted is dropped rather than published with a broken image.
 */
export interface PublicNonFoodFmcgCapabilitiesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  cards: Array<{ image: string; title: string; description: string }>;
}
