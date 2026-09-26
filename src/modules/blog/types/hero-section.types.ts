// src/modules/blog/types/hero-section.types.ts

import { ContentStatus } from '../../../config/constants';

/**
 * A /blog hero slide exactly as it is stored.
 *
 * The Insider hero's InsiderHeroSlide with three differences: an `eyebrow`
 * (the blog's pill is authored copy, like the home hero's), no `imageAlt`
 * (HeroSlider draws the backdrop as decoration), and no `mobileImageUrl` - the
 * phone image is an upload only.
 *
 * No button labels or links: the site fixes both buttons in its code
 * (BlogPage.jsx: primary -> /demo, secondary -> /knowledgebase).
 */
export interface BlogHeroSlide {
  id: string;
  /** The small caps pill above the headline ('THE UPWON BLOG'). */
  eyebrow: string;
  /**
   * Plain text, no accent markup. HeroSlider sets the weight itself by
   * splitting on an em-dash: the setup before it lighter, the payoff bold.
   */
  heading: string;
  subtext: string;
  /**
   * The image_url column: legacy / seed-only. It holds the seeded slide's site
   * artwork, for which no uploaded file exists, and the admin API never writes
   * a URL into it. Mutually exclusive with imageFileId.
   */
  imageUrl: string | null;
  /** The desktop background, uploaded through the files module. */
  imageFileId: string | null;
  /** Narrow-viewport upload. Null falls back to the desktop image. */
  mobileImageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A slide with each background collapsed into the one URL to render. The raw
 * source columns stay, because the admin edit form round-trips them.
 */
export interface ResolvedBlogHeroSlide extends BlogHeroSlide {
  image: string | null;
  /** Null means "use the desktop one". */
  mobileImage: string | null;
}

/**
 * The public, website-facing shape: no ids, ordering, timestamps, or
 * authorship. The Insider hero's public shape plus `eyebrow`, and without
 * `imageAlt`.
 */
export interface PublicBlogHeroSlide {
  eyebrow: string;
  heading: string;
  subtext: string;
  image: string | null;
  /** Null means the desktop image serves every viewport. */
  mobileImage: string | null;
}

/**
 * POST body. Pictures are uploads only: an imageUrl a client sends is never
 * stored (see the validator).
 */
export interface CreateBlogHeroSlideInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageFileId: string | null;
  mobileImageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service, not the caller. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Every field optional, and `null` is meaningful for the nullable ones: it
 * clears the value, where `undefined` leaves it untouched.
 */
export interface UpdateBlogHeroSlideInput {
  eyebrow?: string;
  heading?: string;
  subtext?: string;
  imageFileId?: string | null;
  /**
   * Only ever true, and only when the body sends `imageUrl: null`: removes the
   * legacy seeded picture. Never a way to store a URL.
   */
  clearLegacyImage?: boolean;
  mobileImageFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface BlogHeroSlideFilters {
  status?: ContentStatus;
}

/** The full ACTIVE+INACTIVE id list, in the order they should end up in. */
export interface ReorderBlogHeroSlidesInput {
  ids: string[];
}
