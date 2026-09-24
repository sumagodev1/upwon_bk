// src/modules/home-page/types/testimonials-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../utils/heading-markup';

/**
 * Client video testimonials: a list of cards, shaped like the hero's slides.
 *
 * One row carries the section copy plus one testimonial - its still, its
 * optional clip, the quote and who said it. The copy repeats across rows and
 * the public read uses the first active one - see
 * 019_home_page_testimonials.sql.
 */

export interface TestimonialEntry {
  id: string;
  /** The card's still. An absolute URL or a site-relative path. */
  posterUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with posterUrl. */
  posterFileId: string | null;
  /** The clip the play button opens. Optional. Exclusive with videoFileId. */
  videoUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with videoUrl. */
  videoFileId: string | null;
  /** What the customer said, rendered inside curly quotes by the site. */
  quote: string;
  clientName: string;
  /** Role and sector as one authored line, e.g. 'Retail Operations · Sweets'. */
  clientPosition: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** An entry with everything the renderer needs resolved. */
export interface ResolvedTestimonialEntry extends TestimonialEntry {
  /** Each pair of source columns collapsed into the one URL to render. */
  poster: string | null;
  video: string | null;
}

export interface CreateTestimonialEntryInput {
  posterUrl: string | null;
  posterFileId: string | null;
  videoUrl: string | null;
  videoFileId: string | null;
  quote: string;
  clientName: string;
  clientPosition: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Every field optional, and `null` is meaningful for the nullable ones: it
 * clears the value, where `undefined` leaves it untouched.
 */
export interface UpdateTestimonialEntryInput {
  posterUrl?: string | null;
  posterFileId?: string | null;
  videoUrl?: string | null;
  videoFileId?: string | null;
  quote?: string;
  clientName?: string;
  clientPosition?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface TestimonialEntryFilters {
  status?: ContentStatus;
}

export interface ReorderTestimonialEntriesInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Assembled from the entries rather than mirroring them: the site renders one
 * heading beside one marquee, so the rows are folded back into that shape here
 * rather than in the browser.
 *
 * A card's `video` is nullable where its `poster` is not. The still is what
 * the marquee draws, so a card that lost one is dropped; the clip only opens
 * in the modal, and the component already handles a card without one.
 */
export interface PublicTestimonialsSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  cards: Array<{
    poster: string;
    video: string | null;
    quote: string;
    clientName: string;
    clientPosition: string;
  }>;
}
