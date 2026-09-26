// src/modules/social-media-links/types/contact-lines.types.ts

import { ContentStatus, SocialContactLineKind } from '../../../config/constants';

/**
 * The footer's contact lines: the short list under the brand block - where the
 * company is, how to write to it, how to call it, where it lives online - each
 * with an icon.
 *
 * An ordered child list with no section above it. The footer has no heading
 * over these lines for an admin to author, so there is no singleton here the
 * way the About page's People tab has one: the rows ARE the content.
 */

/** One line, exactly as stored. */
export interface SocialContactLine {
  id: string;
  /** Decides how the site links the line - see SOCIAL_CONTACT_LINE_KINDS. */
  kind: SocialContactLineKind;
  /** A name from SOCIAL_MEDIA_ICON_NAMES, not a file. */
  icon: string;
  /**
   * The text the footer prints, and the one it links from. Stored as authored
   * (an EMAIL lowercased), so the admin sees the phone number in the form it is
   * dialled in and the site derives the tel: or https:// target itself.
   */
  value: string;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The website-facing shape of one line: no ids, no authorship, no timestamps,
 * no display_order - the array's order IS the display order - and no status,
 * because an INACTIVE line is simply not in the array.
 *
 * No href either. The link is the site's own derivation from the kind and the
 * value (mailto:, tel: with the punctuation stripped, https:// added to a bare
 * host), and a stored copy that could disagree with the text beside it is worse
 * than none.
 */
export interface PublicSocialContactLine {
  kind: SocialContactLineKind;
  icon: string;
  value: string;
}

/** POST body. displayOrder is absent on purpose - the service appends. */
export interface CreateSocialContactLineInput {
  kind: SocialContactLineKind;
  icon: string;
  value: string;
  status: ContentStatus;
}

/**
 * PUT body: every field optional, at least one required by the validator.
 *
 * kind and value are not independent: the value is checked against the kind,
 * so a patch that carries only one of them is checked against the row's
 * current other half by the service - see contactLinesService.update.
 */
export interface UpdateSocialContactLineInput {
  kind?: SocialContactLineKind;
  icon?: string;
  value?: string;
  status?: ContentStatus;
}

/** Every line's id, in its new order - a whole-set rewrite. */
export interface ReorderSocialContactLinesInput {
  ids: string[];
}

/** The admin list's two controls. Paging is not one: see the repository. */
export interface SocialContactLineFilters {
  status?: ContentStatus;
  search?: string;
}
