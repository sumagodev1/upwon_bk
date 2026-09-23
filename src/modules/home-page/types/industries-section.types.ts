// src/modules/home-page/types/industries-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../utils/heading-markup';

/**
 * The industries video intro: a list of entries, shaped like the hero's slides.
 *
 * The section renders one block, so the public read takes the first active
 * entry - see 015_home_page_industries.sql for why it is a list anyway.
 */

export interface IndustriesEntry {
  id: string;
  eyebrow: string;
  /** Authored text, not HTML. Same two markers as the hero heading. */
  heading: string;
  subtext: string;
  /** An absolute URL or a site-relative path. Exclusive with videoFileId. */
  videoUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with videoUrl. */
  videoFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** An entry with everything the renderer needs resolved. */
export interface ResolvedIndustriesEntry extends IndustriesEntry {
  headingLines: HeadingLine[];
  /** The two video sources collapsed into the one URL to actually play. */
  video: string | null;
}

export interface CreateIndustriesEntryInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  videoUrl: string | null;
  videoFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Every field optional, and `null` is meaningful for the nullable ones: it
 * clears the value, where `undefined` leaves it untouched.
 */
export interface UpdateIndustriesEntryInput {
  eyebrow?: string;
  heading?: string;
  subtext?: string;
  videoUrl?: string | null;
  videoFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface IndustriesEntryFilters {
  status?: ContentStatus;
}

export interface ReorderIndustriesEntriesInput {
  ids: string[];
}

/** The website-facing shape: the first active entry, ready to render. */
export interface PublicIndustriesSection {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  video: string;
}
