// src/modules/home-page/types/values-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../utils/heading-markup';

/**
 * Values and work culture: a list of cards, shaped like the hero's slides.
 *
 * One row carries the section copy plus one card. The copy repeats across rows
 * and the public read uses the first active one - see 017_home_page_values.sql.
 */

export interface ValuesEntry {
  id: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  /** The value's name, shown under the photo. Doubles as the image alt text. */
  cardTitle: string;
  cardBody: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** An entry with everything the renderer needs resolved. */
export interface ResolvedValuesEntry extends ValuesEntry {
  /** The two image sources collapsed into the one URL to actually render. */
  image: string | null;
}

export interface CreateValuesEntryInput {
  imageUrl: string | null;
  imageFileId: string | null;
  cardTitle: string;
  cardBody: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Every field optional, and `null` is meaningful for the nullable ones: it
 * clears the value, where `undefined` leaves it untouched.
 */
export interface UpdateValuesEntryInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  cardTitle?: string;
  cardBody?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface ValuesEntryFilters {
  status?: ContentStatus;
}

export interface ReorderValuesEntriesInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Assembled from the entries rather than mirroring them: the site renders one
 * heading above a grid of cards, so the rows are folded back into that shape
 * here rather than in the browser.
 */
export interface PublicValuesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  cards: Array<{ image: string; title: string; body: string }>;
}
