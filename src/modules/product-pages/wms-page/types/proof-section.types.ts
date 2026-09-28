// src/modules/product-pages/wms-page/types/proof-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Not a Pitch. Just What's Already Running."
 *
 * Three cards in a row, each cycling through its own set of stat images every
 * few seconds.
 *
 * Two shapes, because the row is two things: the cards are the arrangement -
 * how many columns and in what order - and the slides are what each one
 * shows.
 *
 * A card carries no copy. Every word a visitor reads here is inside the
 * artwork, which is also why a slide carries alt text: it is the only way the
 * figures reach a screen reader at all.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('wms', 'proof').
 */

export interface WmsProofSlide {
  id: string;
  cardId: string;
  /** The stat artwork. Exclusive with imageFileId, and one of them is set. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** What a screen reader reads in its place. Null leaves it decorative. */
  alt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A slide with its two image sources collapsed into the one URL to render. */
export interface ResolvedWmsProofSlide extends WmsProofSlide {
  image: string | null;
}

export interface WmsProofCard {
  id: string;
  /** The admin-side name for the column. Never rendered on the site. */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A card with the slides it flips through attached. */
export interface ResolvedWmsProofCard extends WmsProofCard {
  slides: ResolvedWmsProofSlide[];
}

export interface CreateWmsProofCardInput {
  label: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWmsProofCardInput = Partial<CreateWmsProofCardInput>;

export interface CreateWmsProofSlideInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateWmsProofSlideInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface WmsProofCardFilters {
  status?: ContentStatus;
}

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The whole row in one read: the three cards are drawn side by side and flip
 * on one shared timer, so sending them separately would mean a request per
 * column for content that animates together.
 */
export interface PublicWmsProofSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** One entry per card, each holding the images it flips through, in order. */
  cards: Array<{
    label: string;
    slides: Array<{ image: string; alt: string | null }>;
  }>;
}
