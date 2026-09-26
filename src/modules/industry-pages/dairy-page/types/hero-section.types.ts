// src/modules/industry-pages/dairy-page/types/hero-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The Dairy & Ice Cream page's hero slider: a list of slides.
 *
 * Each slide carries its own copy, like the home page's hero and unlike the
 * page's list sections - the slider shows three different pitches, so there is
 * nothing shared to lift into page_section_copy.
 */

/** A button. Label and target are stored and validated as a pair. */
export interface SlideCta {
  label: string;
  href: string;
}

export interface DairyHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text, not HTML. Same two markers as every other heading. */
  headline: string;
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: SlideCta | null;
  secondaryCta: SlideCta | null;
  /** The slide background. Exclusive with imageFileId. */
  imageUrl: string | null;
  imageFileId: string | null;
  /**
   * The portrait crop shown under 768px. Exclusive with mobileImageFileId.
   *
   * Optional: a slide without one falls back to the desktop image, which is
   * what every slide does today.
   */
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedDairyHeroSlide extends DairyHeroSlide {
  headlineLines: HeadingLine[];
  /** The two image sources collapsed into the one URL to actually render. */
  image: string | null;
  /** The same for the mobile pair. Null means "use the desktop image". */
  mobileImage: string | null;
}

export interface CreateDairyHeroSlideInput {
  eyebrow: string;
  headline: string;
  subhead: string;
  microTrust: string | null;
  cta: SlideCta | null;
  secondaryCta: SlideCta | null;
  imageUrl: string | null;
  imageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateDairyHeroSlideInput {
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  microTrust?: string | null;
  cta?: SlideCta | null;
  secondaryCta?: SlideCta | null;
  imageUrl?: string | null;
  imageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface DairyHeroSlideFilters {
  status?: ContentStatus;
}

export interface ReorderDairyHeroSlidesInput {
  ids: string[];
}

/** The website-facing shape: one entry per active slide, in order. */
export interface PublicDairyHeroSlide {
  eyebrow: string;
  headline: string;
  headlineLines: HeadingLine[];
  subhead: string;
  microTrust: string | null;
  cta: SlideCta | null;
  secondaryCta: SlideCta | null;
  image: string | null;
  /** Null means the phone shows the desktop image, as every slide does today. */
  mobileImage: string | null;
}
