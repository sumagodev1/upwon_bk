// src/modules/why-upwon-page/types/results-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';
import { WhyUpwonIconName } from '../utils/icons';

/**
 * The proof & results section: the copy over three result cards, each a
 * figure, a title, a line of detail and an icon, over its own small visual - a
 * checklist, a trend chart, and a hub of connected modules.
 *
 * Two shapes - the visuals' text and the hub artwork are one record, the
 * results a list. The visual a card carries, and its colours, both follow
 * display order, so neither is stored - and the list is capped at the three
 * visuals there are. The eyebrow, heading and subtext live once in
 * page_section_copy under ('why-upwon', 'outcomes').
 */

// ── the visuals panel ─────────────────────────────────────────────────────

export interface WhyUpwonResultsPanel {
  id: string;
  /** The hub artwork in the third card. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** What the hub artwork shows, read in place of it. */
  imageAlt: string;
  /** The checklist in the first card's visual - the work that stops being manual. */
  checklistItems: string[];
  /** The small line under each checklist item ("Automated"). */
  checklistStatus: string;
  /** The second card's chart: its title, its badge, and the two-line note on it. */
  trendTitle: string;
  trendBadge: string;
  trendNote: string;
  trendNoteSub: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedWhyUpwonResultsPanel extends WhyUpwonResultsPanel {
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertWhyUpwonResultsPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string;
  checklistItems: string[];
  checklistStatus: string;
  trendTitle: string;
  trendBadge: string;
  trendNote: string;
  trendNoteSub: string;
}

// ── the results ──────────────────────────────────────────────────────

export interface WhyUpwonResult {
  id: string;
  /** The headline figure as it is read: "30%", "2× Faster". Text, not a number. */
  stat: string;
  title: string;
  /** The line under the title. */
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: WhyUpwonIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWhyUpwonResultInput {
  stat: string;
  title: string;
  description: string;
  icon: WhyUpwonIconName;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWhyUpwonResultInput = Partial<CreateWhyUpwonResultInput>;

export interface WhyUpwonResultFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderWhyUpwonResultsInput {
  ids: string[];
}

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no result is active - the page then keeps
 * the section it ships. `panel` is null when the visuals have never been
 * authored, and the site keeps its own.
 */
export interface PublicWhyUpwonResultsSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  panel: {
    /** Null when the panel has no image - keep the site's own hub artwork. */
    image: string | null;
    imageAlt: string;
    checklistItems: string[];
    checklistStatus: string;
    trendTitle: string;
    trendBadge: string;
    trendNote: string;
    trendNoteSub: string;
  } | null;
  results: Array<{ stat: string; title: string; description: string; icon: WhyUpwonIconName }>;
}
