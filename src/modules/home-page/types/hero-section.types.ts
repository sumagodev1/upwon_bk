// src/modules/home-page/types/hero-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../utils/heading-markup';

/** A hero slide exactly as it is stored. */
export interface HeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text, not HTML. See utils/heading-markup for the two markers. */
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
  /** Opts this slide's headline into the animated text shine treatment. */
  shine: boolean;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A slide with everything the renderer needs resolved.
 *
 * `image` collapses the two image sources into the one URL to render, and
 * `headingLines` is the parsed heading, so no consumer re-implements either
 * rule. The raw `heading` and both source columns are still present, because
 * the admin panel's edit form needs to round-trip them.
 */
export interface ResolvedHeroSlide extends HeroSlide {
  image: string | null;
  /** The mobile pair collapsed the same way. Null means "use the desktop one". */
  mobileImage: string | null;
  headingLines: HeadingLine[];
}

/**
 * The public, website-facing shape. Deliberately narrower than the admin one:
 * no ids, ordering, timestamps, or authorship leak to the marketing site, and
 * the fields are named to match the frontend's own slide objects.
 */
export interface PublicHeroSlide {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  image: string | null;
  /** Null means the desktop image serves every viewport. */
  mobileImage: string | null;
  imageAlt: string | null;
  shine: boolean;
}

export interface CreateHeroSlideInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  shine: boolean;
  /** Omitted means "append to the end" - resolved by the service, not the caller. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Every field optional, and `null` is meaningful for the nullable ones: it
 * clears the value, where `undefined` leaves it untouched.
 */
export interface UpdateHeroSlideInput {
  eyebrow?: string;
  heading?: string;
  subtext?: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  shine?: boolean;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface HeroSlideFilters {
  status?: ContentStatus;
}

/** The full ACTIVE+INACTIVE id list, in the order they should end up in. */
export interface ReorderHeroSlidesInput {
  ids: string[];
}
