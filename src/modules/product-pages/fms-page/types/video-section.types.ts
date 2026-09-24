// src/modules/product-pages/fms-page/types/video-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "It's Not Just Software - It's Your Franchise Operating System."
 *
 * Copy over a product video, with the playback bar underneath.
 *
 * A list rather than a singleton, though the section renders one player: the
 * public read takes the first live entry, and the others are drafts and
 * retired clips. That is what lets a replacement be uploaded and checked
 * alongside the one visitors are watching, then switched over with the status
 * toggle rather than written over the top of it.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('fms', 'video').
 */

export interface FmsVideoEntry {
  id: string;
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

/** The entry with its two sources collapsed into the one URL to actually play. */
export interface ResolvedFmsVideoEntry extends FmsVideoEntry {
  video: string | null;
}

export interface CreateFmsVideoEntryInput {
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
export interface UpdateFmsVideoEntryInput {
  videoUrl?: string | null;
  videoFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface FmsVideoEntryFilters {
  status?: ContentStatus;
}

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape: the copy and the one live video.
 *
 * Null when the copy is missing, or when no live entry still resolves a
 * playable source - the page then keeps the section it ships, which is a
 * complete working one. A heading promising a video above an empty player is
 * worse than the copy the site already has.
 */
export interface PublicFmsVideoSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  video: string;
}
