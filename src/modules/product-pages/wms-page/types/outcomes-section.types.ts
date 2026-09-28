// src/modules/product-pages/wms-page/types/outcomes-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { WmsIconName } from '../utils/icons';

/**
 * The customer-outcomes row - "15-20% Less Wastage. 20-35% Better Fulfilment
 * Accuracy."
 *
 * A heading over a row of five cards. Each card is a pictogram in a round
 * tile, the figure it claims, what that figure measures, and a line saying
 * how the system gets there.
 *
 * Not the ERP page's outcome cards despite the shared section key: those are
 * customer stories - a photograph, a quote and who said it - where these are
 * unattributed range figures across a whole category.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('wms', 'outcomes').
 */

/** Which colour the card's hover rule draws in. */
export type WmsOutcomeAccent = 'orange' | 'blue';

export const WMS_OUTCOME_ACCENTS = ['orange', 'blue'] as const;

export interface WmsOutcomeCard {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: WmsIconName;
  /** The figure, written exactly as it should read - "15-20%", "99%+". */
  stat: string;
  /** What the figure measures, as the card's heading. */
  title: string;
  /** The line under the rule. */
  description: string;
  accent: WmsOutcomeAccent;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWmsOutcomeCardInput {
  icon: WmsIconName;
  stat: string;
  title: string;
  description: string;
  accent: WmsOutcomeAccent;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWmsOutcomeCardInput = Partial<CreateWmsOutcomeCardInput>;

export interface WmsOutcomeCardFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

/**
 * The whole section in one read: the copy above the row and the cards in it.
 *
 * Null when the copy is missing or no card is published - the page then keeps
 * the row it ships, which is a complete working one. A heading over an empty
 * row is not a section, it is a hole.
 */
export interface PublicWmsOutcomesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  cards: Array<{
    icon: WmsIconName;
    stat: string;
    title: string;
    description: string;
    accent: WmsOutcomeAccent;
  }>;
}
