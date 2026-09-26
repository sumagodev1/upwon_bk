// src/modules/insider-page/types/hero-section.types.ts

import { ContentStatus } from '../../../config/constants';

/**
 * An Insider hero slide exactly as it is stored.
 *
 * The same shape as the home hero's HeroSlide, field for field, minus `shine`
 * (HeroSlide has no shine treatment) and `eyebrow`: the Insider hero's pill
 * always names the issue being viewed, which the site derives from the URL.
 */
export interface InsiderHeroSlide {
  id: string;
  /**
   * Plain text, no accent markup. HeroSlider sets the weight itself by
   * splitting on an em-dash: the setup before it lighter, the payoff bold.
   */
  heading: string;
  subtext: string;
  /** An absolute URL or a site-relative path. Mutually exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Mutually exclusive with imageUrl. */
  imageFileId: string | null;
  imageAlt: string | null;
  /** Narrow-viewport background. Mutually exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  /** Narrow-viewport upload. Mutually exclusive with mobileImageUrl. */
  mobileImageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A slide with both image pairs collapsed into the one URL to render. The raw
 * source columns stay, because the admin edit form round-trips them.
 */
export interface ResolvedInsiderHeroSlide extends InsiderHeroSlide {
  image: string | null;
  /** Null means "use the desktop one". */
  mobileImage: string | null;
}

/**
 * The public, website-facing shape: no ids, ordering, timestamps, or
 * authorship. Field names match the home hero's public shape so the site reads
 * both the same way.
 */
export interface PublicInsiderHeroSlide {
  heading: string;
  subtext: string;
  image: string | null;
  /** Null means the desktop image serves every viewport. */
  mobileImage: string | null;
  imageAlt: string | null;
}

export interface CreateInsiderHeroSlideInput {
  heading: string;
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service, not the caller. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Every field optional, and `null` is meaningful for the nullable ones: it
 * clears the value, where `undefined` leaves it untouched.
 */
export interface UpdateInsiderHeroSlideInput {
  heading?: string;
  subtext?: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface InsiderHeroSlideFilters {
  status?: ContentStatus;
}

/** The full ACTIVE+INACTIVE id list, in the order they should end up in. */
export interface ReorderInsiderHeroSlidesInput {
  ids: string[];
}
