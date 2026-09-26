// src/modules/about-page/types/numbers.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * The Number section: its copy, and the stat cards in it. One file for both,
 * for the reason team.types.ts is one file - they are one tab and one band.
 */

// ── the section copy ──────────────────────────────────────────────────────

/** The eyebrow, headline and description above the cards. A singleton. */
export interface AboutNumbersSection {
  eyebrow: string;
  /** Authored text in the home heading markup: newline and **accent**. */
  heading: string;
  subtext: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The admin shape: the stored row plus the parsed heading for the preview. */
export interface ResolvedAboutNumbersSection extends AboutNumbersSection {
  headingLines: HeadingLine[];
}

/** PUT body. A full replace of the section's copy. */
export interface ReplaceAboutNumbersSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
}

// ── the stat cards ────────────────────────────────────────────────────────

/** One stat card, exactly as stored. */
export interface AboutNumberStat {
  id: string;
  /** The big number as it is printed: '150+', '7', '98%'. */
  value: string;
  /** The bold line under the number ('Businesses Deployed'). */
  label: string;
  /** The grey line under that. */
  description: string;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The website-facing shape of one card: no ids, no authorship, no timestamps, no
 * display_order - the array's order IS the display order - and no status,
 * because an INACTIVE card is simply not in the array.
 *
 * No icon: the component picks it from the card's position out of a fixed set of
 * lucide components, and it stays there.
 */
export interface PublicAboutNumberStat {
  value: string;
  label: string;
  description: string;
}

/**
 * The section and its ACTIVE cards, in one response - the page renders them
 * together.
 *
 * `hasStats` separates the two reasons `stats` can be empty, exactly as
 * `hasMembers` does on the team section - see the note there. It counts the rows
 * under this section regardless of status, so "there is no card row at all"
 * (nothing authored, keep the built-in four) and "every card is INACTIVE" (render
 * the empty band) stop being the same answer. It matters more here than anywhere
 * else on the page: the built-in four are claims about the business, and an admin
 * taking one down must not have it put back.
 */
export interface PublicAboutNumbersSection {
  eyebrow: string;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  stats: PublicAboutNumberStat[];
  /** Whether any stat row exists at all - ACTIVE or INACTIVE. See above. */
  hasStats: boolean;
}

/** POST body. displayOrder is absent on purpose - the service appends. */
export interface CreateAboutNumberStatInput {
  value: string;
  label: string;
  description: string;
  status: ContentStatus;
}

/** PUT body: every field optional, at least one required by the validator. */
export interface UpdateAboutNumberStatInput {
  value?: string;
  label?: string;
  description?: string;
  status?: ContentStatus;
}

/** Every card's id, in its new order - a whole-set rewrite. */
export interface ReorderAboutNumberStatsInput {
  ids: string[];
}

/** The admin list's two controls. Paging is not one: see the repository. */
export interface AboutNumberStatFilters {
  status?: ContentStatus;
  search?: string;
}
