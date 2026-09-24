// src/modules/product-pages/sfa-dms-page/types/outcomes-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Real Outcomes for Every Distribution Team."
 *
 * A carousel of named customer stories: a portrait, the outcome as a headline,
 * the story under it, and who said it.
 *
 * Two shapes. The pair of buttons beside the heading is one record - they are a
 * single small form. The cards are a list that grows every time a customer
 * agrees to be named.
 *
 * The eyebrow and heading live once in page_section_copy under
 * ('sfa-dms', 'outcomes'). The design has no line under the heading, so the
 * subtext stays null.
 */

// ── the two buttons beside the heading ────────────────────────────────────

export interface SfaOutcomeSection {
  id: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A full replacement, not a patch.
 *
 * The two buttons are one short form, so a partial update would only add a way
 * for one to drift out of step with the other.
 */
export interface UpsertSfaOutcomeSectionInput {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

// ── the story cards ───────────────────────────────────────────────────────

export interface SfaOutcomeCard {
  id: string;
  title: string;
  body: string;
  personName: string;
  personRole: string;
  company: string;
  /** The portrait. Exclusive with photoFileId, and one of the two is required. */
  photoUrl: string | null;
  photoFileId: string | null;
  /** Where the corner arrow goes. Null draws no arrow. */
  linkHref: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The card with its two photo sources collapsed into the one URL to render. */
export interface ResolvedSfaOutcomeCard extends SfaOutcomeCard {
  photo: string | null;
}

export interface CreateSfaOutcomeCardInput {
  title: string;
  body: string;
  personName: string;
  personRole: string;
  company: string;
  photoUrl: string | null;
  photoFileId: string | null;
  linkHref: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaOutcomeCardInput = Partial<CreateSfaOutcomeCardInput>;

export interface SfaOutcomeCardFilters {
  status?: ContentStatus;
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read: the copy, the two buttons, and the cards.
 *
 * Null when the copy is missing or no card is live - the page then keeps the
 * carousel it ships, which is a complete working one. A card whose photo has
 * been deleted is dropped rather than published with a null source, which
 * would leave a coloured square where a face should be.
 */
export interface PublicSfaOutcomesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  buttons: {
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  } | null;
  cards: Array<{
    title: string;
    body: string;
    name: string;
    role: string;
    company: string;
    photo: string;
    href: string | null;
  }>;
}
