// src/modules/clients-page/types/testimonials-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * "Real Teams. Real Outcomes." - the testimonials marquee closing the Clients
 * page. The eyebrow, heading and subtext live once in page_section_copy under
 * ('clients', 'testimonials').
 */

export interface ClientsTestimonial {
  id: string;
  /** Stored without quotation marks; the card draws those. */
  quote: string;
  /** The bold line under the quote - usually a designation. */
  author: string;
  company: string;
  /** Stars out of five. */
  rating: number;
  /** An absolute URL or a site-relative path. Exclusive with avatarFileId. */
  avatarUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with avatarUrl. */
  avatarFileId: string | null;
  /** '#rrggbb' - the initials' colour when there is no photo. */
  fallbackColor: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A testimonial with its photo pair collapsed into the one URL to render. */
export interface ResolvedClientsTestimonial extends ClientsTestimonial {
  avatar: string | null;
}

export interface CreateClientsTestimonialInput {
  quote: string;
  author: string;
  company: string;
  rating: number;
  avatarUrl: string | null;
  avatarFileId: string | null;
  fallbackColor: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/** Absent leaves a field untouched; `null` clears the nullable ones. */
export type UpdateClientsTestimonialInput = Partial<CreateClientsTestimonialInput>;

export interface ClientsTestimonialFilters {
  status?: ContentStatus;
}

export interface ReorderClientsTestimonialsInput {
  ids: string[];
}

/** The website-facing shape: the section copy and its testimonials, in one read. */
export interface PublicClientsTestimonialsSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string | null;
  testimonials: Array<{
    quote: string;
    author: string;
    company: string;
    rating: number;
    avatar: string | null;
    fallbackColor: string;
  }>;
}
