// src/modules/industry-pages/dairy-page/types/capabilities-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Built to Simplify. Connected to Scale." - the Core Capabilities section: copy and a collage beside a numbered list of cards, each an icon, a title and a description.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('dairy', 'capabilities').
 */

export interface DairyCapabilityCard {
  id: string;
  /** A name from DAIRY_ICON_NAMES - the site maps it to a lucide component. */
  icon: string;
  /** The card title: "Product & Batch Visibility". */
  title: string;
  /** The sentence under the title. */
  description: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDairyCapabilityCardInput {
  icon: string;
  title: string;
  description: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateDairyCapabilityCardInput = Partial<CreateDairyCapabilityCardInput>;

export interface DairyCapabilityCardFilters {
  status?: ContentStatus;
}

export interface ReorderDairyCapabilityCardsInput {
  ids: string[];
}

// ── the panel image ───────────────────────────────────────────────────────

/** The collage beside the cards. One record, read and replaced. */
export interface DairyCapabilitiesPanel {
  id: string;
  /** Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** Read aloud in place of the image. */
  alt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedDairyCapabilitiesPanel extends DairyCapabilitiesPanel {
  image: string | null;
}

/** A full replacement, not a patch. */
export interface UpsertDairyCapabilitiesPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
}

/**
 * The website-facing shape.
 *
 * Null when the copy is missing or no capability is live - the page then hides the
 * section.
 */
export interface PublicDairyCapabilitiesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  panel: { image: string; alt: string } | null;
  cards: Array<{ icon: string; title: string; description: string }>;
}
