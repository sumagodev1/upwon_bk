// src/modules/home-page/types/trust-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../utils/heading-markup';

/**
 * The trust section: a list of entries, shaped like the hero's slides.
 *
 * One row carries the section copy plus, optionally, one brand logo and one
 * scale counter. The copy repeats across rows and the public read uses the
 * first active one - see 014_home_page_trust_entries.sql for why.
 */

export interface TrustEntry {
  id: string;
  eyebrow: string;
  /** Authored text, not HTML. Same two markers as the hero heading. */
  heading: string;
  subtext: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  /** The brand name, doubling as the logo's alt text. */
  imageAlt: string | null;
  /** Display text, not a number: '10,000+' and '4,200+' are authored. */
  statValue: string | null;
  statLabel: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** An entry with everything the renderer needs resolved. */
export interface ResolvedTrustEntry extends TrustEntry {
  headingLines: HeadingLine[];
  /** The two image sources collapsed into the one URL to actually render. */
  image: string | null;
}

export interface CreateTrustEntryInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  statValue: string | null;
  statLabel: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Every field optional, and `null` is meaningful for the nullable ones: it
 * clears the value, where `undefined` leaves it untouched.
 */
export interface UpdateTrustEntryInput {
  eyebrow?: string;
  heading?: string;
  subtext?: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  statValue?: string | null;
  statLabel?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface TrustEntryFilters {
  status?: ContentStatus;
}

export interface ReorderTrustEntriesInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Assembled from the entries rather than mirroring them: the site renders one
 * card with one heading, one marquee and one row of counters, so the entries
 * are folded back into that shape here rather than in the browser.
 */
export interface PublicTrustSection {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  logos: Array<{ image: string; alt: string }>;
  stats: Array<{ value: string; label: string }>;
}
