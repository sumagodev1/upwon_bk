// src/modules/product-pages/vendor-portal-page/types/outcomes-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The customer-outcome showcase - "The Proof Point This Page Still Needs."
 *
 * A player with a tab strip beside it. Picking a tab swaps the film and the
 * block of copy under it.
 *
 * One row per tab, holding both the tab's own label and everything the panel
 * shows when it is selected - they are one thing to an editor, and nothing
 * else points at either half.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('vms', 'outcomes').
 */

export interface VmsOutcomeVideo {
  id: string;
  /** The tab's own label, down the side of the player. */
  label: string;
  /** The pill drawn over the player. */
  badge: string;
  /** The running time beside it. Shown rather than measured, so it is text. */
  duration: string | null;

  title: string;
  description: string;

  buttonLabel: string | null;
  buttonHref: string | null;

  /** The film. Exclusive with videoFileId; both null keeps the site's own. */
  videoUrl: string | null;
  videoFileId: string | null;
  /** The still shown before it plays. */
  posterUrl: string | null;
  posterFileId: string | null;

  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** An entry with each source pair collapsed into the URL to render. */
export interface ResolvedVmsOutcomeVideo extends VmsOutcomeVideo {
  video: string | null;
  poster: string | null;
}

export interface CreateVmsOutcomeVideoInput {
  label: string;
  badge: string;
  duration: string | null;
  title: string;
  description: string;
  buttonLabel: string | null;
  buttonHref: string | null;
  videoUrl: string | null;
  videoFileId: string | null;
  posterUrl: string | null;
  posterFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Updating one.
 *
 * The nullable fields stay nullable here: unlike an image a card is built
 * around, every one of these is genuinely optional, so clearing one is a
 * legitimate edit rather than a half-finished state.
 */
export interface UpdateVmsOutcomeVideoInput {
  label?: string;
  badge?: string;
  duration?: string | null;
  title?: string;
  description?: string;
  buttonLabel?: string | null;
  buttonHref?: string | null;
  videoUrl?: string | null;
  videoFileId?: string | null;
  posterUrl?: string | null;
  posterFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface VmsOutcomeVideoFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * `video` may be null: the three entries shipped today share one placeholder
 * clip that belongs to the site, so an entry without its own film is a
 * complete, usable tab rather than a broken one.
 */
export interface PublicVmsOutcomesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  videos: Array<{
    label: string;
    badge: string;
    duration: string | null;
    title: string;
    description: string;
    button: { label: string; href: string } | null;
    video: string | null;
    poster: string | null;
  }>;
}
