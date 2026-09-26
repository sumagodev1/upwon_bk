// src/modules/product-pages/hreasy-page/types/lifecycle-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Everything From Hiring to Exit - For Every Kind of Employee You Have."
 *
 * A grid of capability cards, four across. Each is a photograph, a title and
 * a one-line outcome.
 *
 * Distinct from the module showcase in capabilities-section.types.ts, which
 * lists the same seven stages as a nav with one composite image beside it.
 * That one's copy is ('hreasy', 'capabilities'); this one's is
 * ('hreasy', 'lifecycle').
 */

export interface HreasyLifecycleCard {
  id: string;
  /** The bold line under the photograph. */
  title: string;
  /** The outcome under it, one sentence. */
  description: string;
  /** The card photograph. Exclusive with imageFileId, and one of them is set. */
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedHreasyLifecycleCard extends HreasyLifecycleCard {
  /** The two image sources collapsed into the one URL to actually render. */
  image: string | null;
}

export interface CreateHreasyLifecycleCardInput {
  title: string;
  description: string;
  imageUrl: string | null;
  imageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateHreasyLifecycleCardInput {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface HreasyLifecycleCardFilters {
  status?: ContentStatus;
}

export interface ReorderHreasyLifecycleCardsInput {
  ids: string[];
}

/** One card in the website-facing grid, in order. */
export interface PublicHreasyLifecycleCard {
  title: string;
  description: string;
  image: string | null;
}

/**
 * The website-facing shape: the copy that heads the section and the cards
 * under it, merged into the one block the site renders.
 */
export interface PublicHreasyLifecycleSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  cards: PublicHreasyLifecycleCard[];
}
