// src/modules/social-media-links/types/social-links.types.ts

import { ContentStatus } from '../../../config/constants';

/**
 * The footer's social links: the row of square icon buttons under the contact
 * lines, each opening one of the company's profiles.
 *
 * An ordered child list with no section above it, like the contact lines -
 * the row has no heading for an admin to author.
 */

/** One icon button, exactly as stored. */
export interface SocialLink {
  id: string;
  /**
   * What the button is called - its aria-label and tooltip ('LinkedIn'). The
   * button shows only the icon, so this is the one thing a screen reader says.
   * Never an input: written from the icon through SOCIAL_LINK_LABELS whenever
   * the icon is set.
   */
  label: string;
  /** A name from SOCIAL_MEDIA_ICON_NAMES, not a file. */
  icon: string;
  /** An absolute http(s) URL - a profile on another site, never a local path. */
  url: string;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The website-facing shape of one button: no ids, no authorship, no
 * timestamps, no display_order - the array's order IS the display order - and
 * no status, because an INACTIVE link is simply not in the array.
 */
export interface PublicSocialLink {
  label: string;
  icon: string;
  url: string;
}

/**
 * POST body. displayOrder is absent on purpose - the service appends - and so
 * is label, which the service derives from the icon.
 */
export interface CreateSocialLinkInput {
  icon: string;
  url: string;
  status: ContentStatus;
}

/**
 * PUT body: every field optional, at least one required by the validator. No
 * label: a new icon brings its own.
 */
export interface UpdateSocialLinkInput {
  icon?: string;
  url?: string;
  status?: ContentStatus;
}

/** Every link's id, in its new order - a whole-set rewrite. */
export interface ReorderSocialLinksInput {
  ids: string[];
}

/** The admin list's two controls. Paging is not one: see the repository. */
export interface SocialLinkFilters {
  status?: ContentStatus;
  search?: string;
}
