// src/modules/product-pages/pos-page/types/recognition-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { PosIconName } from '../utils/icons';

/**
 * The category map - "Built for Bakery Counters, Sweets Shops, Dine-In, QSR
 * and Every Food Retail Business in Between."
 *
 * A sticky heading on the left beside a three-column grid of dark cards, each
 * naming one kind of counter so a visitor finds themselves in the list
 * immediately.
 *
 * One shape, because a card is one thing: an icon, a name and a line about it.
 * The FMS page's equivalent is a much richer object - artwork, accents, an
 * explore link, its own steps and benefits - because that section is an
 * interactive map with a selected category. Nothing here is selectable.
 *
 * The eyebrow, heading and subtext on the left live once in page_section_copy
 * under ('pos', 'recognition').
 */

export interface PosRecognitionCategory {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: PosIconName;
  /** The kind of counter, as the card's heading. */
  title: string;
  /** The line under it. */
  description: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePosRecognitionCategoryInput {
  icon: PosIconName;
  title: string;
  description: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosRecognitionCategoryInput = Partial<CreatePosRecognitionCategoryInput>;

export interface PosRecognitionCategoryFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

/**
 * The whole section in one read: the copy on the left and the cards on the
 * right.
 *
 * Null when the copy is missing or no card is published - the page then keeps
 * the map it ships, which is a complete working one. A heading with an empty
 * grid beside it is not a section, it is a hole.
 */
export interface PublicPosRecognitionSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  categories: Array<{ icon: PosIconName; title: string; description: string }>;
}
