// src/modules/about-page/types/team.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * The People section: its copy, and the people in it.
 *
 * One file for both, the way insider issues and the stories under them share
 * one, because they are one tab in the admin panel and one band on the page -
 * the section is never read without its members, and a member means nothing
 * outside it.
 */

// ── the section copy ──────────────────────────────────────────────────────

/** The eyebrow, headline and description above the grid. A singleton. */
export interface AboutTeamSection {
  eyebrow: string;
  /** Authored text in the home heading markup: newline and **accent**. */
  heading: string;
  subtext: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The admin shape: the stored row plus the parsed heading for the preview. */
export interface ResolvedAboutTeamSection extends AboutTeamSection {
  headingLines: HeadingLine[];
}

/** PUT body. A full replace of the section's copy. */
export interface ReplaceAboutTeamSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
}

// ── the people ────────────────────────────────────────────────────────────

/** One person on the grid, exactly as stored. */
export interface AboutTeamMember {
  id: string;
  name: string;
  /** The line under the name ('Chief Technology Officer'). */
  role: string;
  /** The grey line under the role ('Nashik · Platform · Architecture · Scale'). */
  meta: string;
  /** An absolute URL or a site-relative path. Mutually exclusive with photoFileId. */
  photoUrl: string | null;
  /** An asset uploaded through the files module. Mutually exclusive with photoUrl. */
  photoFileId: string | null;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The admin shape: the stored row plus the resolved photo URL. */
export interface ResolvedAboutTeamMember extends AboutTeamMember {
  photo: string | null;
}

/**
 * The website-facing shape of one person: no ids, no authorship, no timestamps,
 * no display_order - the array's order IS the display order - and no status,
 * because an INACTIVE person is simply not in the array.
 *
 * No initials and no accent colour: both are the site's own derivation from the
 * name and the card's position, and a stored copy that could disagree with the
 * name is worse than none.
 */
export interface PublicAboutTeamMember {
  name: string;
  role: string;
  meta: string;
  /** Null keeps today's initials monogram on the card. */
  photo: string | null;
  /** Not authored: derived from the name and role. */
  photoAlt: string | null;
}

/**
 * The section and its ACTIVE people, in one response - the page renders them
 * together.
 *
 * `members` can legitimately be empty, and `hasMembers` is what tells the site
 * WHY. Without it an empty array has two meanings the site cannot separate:
 *
 *   the section holds no row at all   -> the CMS has nothing authored here, so the
 *   (none added, or all deleted)         site keeps its built-in six, exactly as it
 *                                        does for a section whose copy was never
 *                                        saved. The panel says so while its table
 *                                        is empty, so nobody is surprised by it;
 *   every person is INACTIVE          -> render the empty grid. That IS somebody's
 *                                        choice, and putting the built-in six back
 *                                        would republish exactly what they just
 *                                        took down.
 *
 * So `hasMembers` counts the rows under this section REGARDLESS of status: true
 * means the list has been authored and what it holds is the answer, false means
 * there is nothing here and the site keeps its own.
 */
export interface PublicAboutTeamSection {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  members: PublicAboutTeamMember[];
  /** Whether any person row exists at all - ACTIVE or INACTIVE. See above. */
  hasMembers: boolean;
}

/** POST body. displayOrder is absent on purpose - the service appends. */
export interface CreateAboutTeamMemberInput {
  name: string;
  role: string;
  meta: string;
  photoUrl: string | null;
  photoFileId: string | null;
  status: ContentStatus;
}

/**
 * PUT body: every field optional, at least one required by the validator.
 *
 * The photo pair is nullable rather than optional so an emptied slot clears the
 * photo instead of being read as "leave it alone" - absent is undefined, null is
 * "remove it".
 */
export interface UpdateAboutTeamMemberInput {
  name?: string;
  role?: string;
  meta?: string;
  photoUrl?: string | null;
  photoFileId?: string | null;
  status?: ContentStatus;
}

/** Every person's id, in their new order - a whole-set rewrite. */
export interface ReorderAboutTeamMembersInput {
  ids: string[];
}

/** The admin list's two controls. Paging is not one: see the repository. */
export interface AboutTeamMemberFilters {
  status?: ContentStatus;
  search?: string;
}
