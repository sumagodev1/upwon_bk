// src/modules/about-page/types/hero-section.types.ts

import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * One backdrop in the hero's rotation, as stored: two crops of the same
 * photograph - a wide desktop one and an optional portrait one for phones - each
 * with at most one of its two sources set. Stored inside
 * about_hero_section.backdrops as jsonb; see 023_about_page_hero.sql for why the
 * set is a column rather than a child table, and
 * 030_about_page_hero_backdrop_mobile_image.sql for the entry shape.
 */
export interface AboutHeroBackdrop {
  /** An absolute URL or a site-relative path. Mutually exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Mutually exclusive with imageUrl. */
  imageFileId: string | null;
  /** Narrow-viewport art for this backdrop. Mutually exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  /** Narrow-viewport upload for this backdrop. Mutually exclusive with mobileImageUrl. */
  mobileImageFileId: string | null;
}

/** A stored backdrop plus the URLs the site can actually render it from. */
export interface ResolvedAboutHeroBackdrop extends AboutHeroBackdrop {
  /**
   * Null when the upload behind imageFileId has since been deleted, which the
   * admin form shows as an empty slot and the public read drops entirely.
   */
  image: string | null;
  /**
   * Null means this backdrop has no phone crop, so the desktop one serves every
   * viewport - and also covers a mobile upload that has since been deleted,
   * which degrades to the same thing.
   */
  mobileImage: string | null;
}

/** The About page hero exactly as it is stored. A singleton. */
export interface AboutHeroSection {
  /** The pill above the headline. */
  eyebrow: string;
  /** Authored text in the home heading markup: newline and **accent**. */
  heading: string;
  subtext: string;
  /** The rotating backdrops, in the order they are shown. May be empty. */
  backdrops: AboutHeroBackdrop[];
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The admin shape: the stored row plus each backdrop's resolved URL and the
 * parsed heading, so the form can round-trip the raw fields and preview the
 * result.
 */
export interface ResolvedAboutHeroSection extends Omit<AboutHeroSection, 'backdrops'> {
  backdrops: ResolvedAboutHeroBackdrop[];
  headingLines: HeadingLine[];
}

/**
 * One backdrop as the website receives it: the URL to render, and the phone crop
 * to render instead below the slider's breakpoint.
 *
 * `image` is non-null by construction - an entry whose desktop image could not be
 * resolved is dropped from the list rather than sent - so the slider never has to
 * guard a slide against a missing src. `mobileImage` is null whenever no phone
 * crop is published, which means "use `image` at every width": the same fallback
 * the home and Insider heroes' <picture> already expresses.
 */
export interface PublicAboutHeroBackdrop {
  image: string;
  mobileImage: string | null;
}

/** The website-facing shape: no ids, timestamps, or authorship. */
export interface PublicAboutHeroSection {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /**
   * The backdrops to rotate through, in order. One object per slide rather than
   * the plain URL this used to be, because a slide now carries two crops; the
   * desktop URL is the `image` key, so nothing about it moved. Entries whose
   * desktop upload has gone are dropped rather than sent with a null image, so
   * the site never has to guard a slide against a missing src. An empty array
   * renders the hero on its plain navy ground.
   */
  backdrops: PublicAboutHeroBackdrop[];
  /** Not authored: derived from the heading, so an image is never unlabelled. */
  imageAlt: string | null;
}

/** PUT body. A full replace: an absent nullable field is stored as null. */
export interface ReplaceAboutHeroSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  backdrops: AboutHeroBackdrop[];
}
