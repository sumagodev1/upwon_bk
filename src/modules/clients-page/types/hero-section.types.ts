// src/modules/clients-page/types/hero-section.types.ts

import { ContentStatus } from '../../../config/constants';

/**
 * A Clients hero slide exactly as it is stored.
 *
 * The same shape as the Insider hero's slide, field for field: no `shine`
 * (HeroSlider has no shine treatment) and no `eyebrow`, because the Clients
 * hero's pill is the page's fixed 'CLIENTS & CASE STUDIES' label, as are its
 * two CTAs - they belong to the page, not to a slide.
 */
export interface ClientsHeroSlide {
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
export interface ResolvedClientsHeroSlide extends ClientsHeroSlide {
  image: string | null;
  /** Null means "use the desktop one". */
  mobileImage: string | null;
}

/**
 * The public, website-facing shape: no ids, ordering, timestamps, or
 * authorship. Field names match the home hero's public shape so the site reads
 * both the same way.
 */
export interface PublicClientsHeroSlide {
  heading: string;
  subtext: string;
  image: string | null;
  /** Null means the desktop image serves every viewport. */
  mobileImage: string | null;
  imageAlt: string | null;
}

export interface CreateClientsHeroSlideInput {
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
export interface UpdateClientsHeroSlideInput {
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

export interface ClientsHeroSlideFilters {
  status?: ContentStatus;
}

/** The full ACTIVE+INACTIVE id list, in the order they should end up in. */
export interface ReorderClientsHeroSlidesInput {
  ids: string[];
}
