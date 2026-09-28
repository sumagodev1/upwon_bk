// src/modules/why-upwon-page/types/hero-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * The Why UpWon page's hero slider.
 *
 * A list of slides, the same as every other hero in the CMS. It was a single
 * record until 082, which is why this page's section-copy keys no longer
 * include 'hero': a slide carries its own eyebrow, headline and subhead, so a
 * shared copy row would be a second, unread copy of the first slide's words.
 *
 * Each slide is two crops of one artwork - a wide one for desktop, a tall one
 * for phones - a description of what it shows, and two buttons. The
 * description is required here where the product pages' backgrounds carry
 * none: on this page the artwork is the first content a visitor meets rather
 * than decoration behind it.
 */

export interface WhyUpwonHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  subhead: string;
  /** The wide artwork, shown from 1024px up. Exclusive with desktopImageFileId. */
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  /** The tall crop phones actually download. Exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  /** What the artwork shows, read in place of it. */
  imageAlt: string;
  primaryLabel: string;
  primaryHref: string;
  /** The outlined button beside it. Both halves or neither. */
  secondaryLabel: string | null;
  secondaryHref: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A slide with both artwork pairs resolved to the URLs to actually render. */
export interface ResolvedWhyUpwonHeroSlide extends WhyUpwonHeroSlide {
  desktopImage: string | null;
  mobileImage: string | null;
}

export interface CreateWhyUpwonHeroSlideInput {
  eyebrow: string;
  headline: string;
  subhead: string;
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  imageAlt: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Updating one.
 *
 * Every artwork half stays nullable: both crops are optional on this hero -
 * without them the site keeps the artwork it ships - so clearing one is a
 * real edit rather than a half-finished save.
 */
export interface UpdateWhyUpwonHeroSlideInput {
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  imageAlt?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface WhyUpwonHeroSlideFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape: one entry per published slide.
 *
 * An empty array means "keep the hero you ship", which is what the site does
 * when nothing is published or the API is unreachable.
 *
 * `heading` keeps the authored markers and `headingLines` is the parsed form,
 * so the site can render the accent without implementing the grammar.
 */
export interface PublicWhyUpwonHeroSlide {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  desktopImage: string | null;
  mobileImage: string | null;
  imageAlt: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string } | null;
}
