// src/modules/why-upwon-page/types/testimonials-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * The customer trust & testimonials section: the copy and a button on the
 * left, a rotating testimonial card on the right, and a scrolling wall of
 * client logos under both.
 *
 * Three shapes, because they are three different edits - a testimonial is
 * added when a customer gives one, a logo the day a brand goes live, and the
 * small lines around them (the lead line, the button, the wall's label) are one
 * record read and replaced.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('why-upwon', 'testimonials').
 */

// ── the client wall ───────────────────────────────────────────────────────

export interface WhyUpwonClientLogo {
  id: string;
  /** The mark. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The brand name, read in place of the image. */
  alt: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The logo with its two sources collapsed into the one URL to render. */
export interface ResolvedWhyUpwonClientLogo extends WhyUpwonClientLogo {
  image: string | null;
}

export interface CreateWhyUpwonClientLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWhyUpwonClientLogoInput = Partial<CreateWhyUpwonClientLogoInput>;

export interface WhyUpwonClientLogoFilters {
  status?: ContentStatus;
}

// ── the testimonials ──────────────────────────────────────────────────────

/**
 * One quote on the rotating card: what was said, who said it, and the brand's
 * logo in the plate beside it.
 */
export interface WhyUpwonTestimonial {
  id: string;
  quote: string;
  /** Who said it - a role or a team rather than a named person, by convention. */
  author: string;
  /** The line under the author - usually the company. */
  role: string;
  /** The brand, read in place of its logo. */
  brand: string;
  /** The small caps line in the plate ("Bakery & Confectionery"). Optional. */
  category: string | null;
  /** The line under it ("Pune"). Optional. */
  location: string | null;
  /** The brand's logo. Exclusive with logoFileId, and one of the two is required. */
  logoUrl: string | null;
  logoFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The testimonial with its logo's two sources collapsed into the one URL to render. */
export interface ResolvedWhyUpwonTestimonial extends WhyUpwonTestimonial {
  logo: string | null;
}

export interface CreateWhyUpwonTestimonialInput {
  quote: string;
  author: string;
  role: string;
  brand: string;
  category: string | null;
  location: string | null;
  logoUrl: string | null;
  logoFileId: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWhyUpwonTestimonialInput = Partial<CreateWhyUpwonTestimonialInput>;

export interface WhyUpwonTestimonialFilters {
  status?: ContentStatus;
}

// ── the panel ─────────────────────────────────────────────────────────────

/**
 * The small lines around the lists: the lead line between the eyebrow and the
 * heading, the button under the copy, and the label over the client wall.
 * Each optional - null hides it.
 */
export interface WhyUpwonTestimonialsPanel {
  id: string;
  leadLine: string | null;
  /** The button under the copy. Both halves or neither. */
  buttonLabel: string | null;
  buttonHref: string | null;
  wallLabel: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertWhyUpwonTestimonialsPanelInput {
  leadLine: string | null;
  buttonLabel: string | null;
  buttonHref: string | null;
  wallLabel: string | null;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read.
 *
 * Null when the copy is missing, or when neither list has anything to show -
 * the page then keeps the section it ships. One empty list is allowed, and the
 * site keeps its own for that one. `panel` is null when it has never been
 * authored, and the site keeps its own lines.
 */
export interface PublicWhyUpwonTestimonialsSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  panel: {
    leadLine: string | null;
    button: { label: string; href: string } | null;
    wallLabel: string | null;
  } | null;
  testimonials: Array<{
    quote: string;
    author: string;
    role: string;
    brand: string;
    category: string | null;
    location: string | null;
    logo: string;
  }>;
  logos: Array<{ image: string; alt: string }>;
}
