// src/modules/product-pages/hreasy-page/types/outcomes-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "95% Fewer HR Errors. 40% Less Admin Time. One System, Three Business
 * Verticals."
 *
 * A row of case-study cards, each led by a dark stat panel: a headline figure
 * over a rule, then up to three smaller ones, then the brand, its badge, the
 * story and a link out.
 *
 * Two shapes, because they are two different edits: a story's prose is
 * rewritten rarely, where a figure is corrected the day a new number lands.
 *
 * No photograph, no quote and no attribution, unlike the FMS and POS cards:
 * this card leads on numbers and the prose under it is the site's own
 * summary rather than something a customer said.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('hreasy', 'outcomes').
 */

export interface HreasyOutcomeStat {
  id: string;
  storyId: string;
  /** Read verbatim: "250+", "7 yrs", "40%". */
  value: string;
  /** The small caps line under it. */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HreasyOutcomeStory {
  id: string;
  /** The customer. Drawn as words when there is no mark. */
  name: string;
  /** Stable across renames, so a deep link keeps pointing at the same story. */
  slug: string;
  /** The brand mark. Exclusive with logoFileId; both null is allowed. */
  logoUrl: string | null;
  logoFileId: string | null;
  /** The small orange badge: "Flagship Story". */
  tag: string;
  /** The headline figure in the dark panel, and the line under it. */
  heroValue: string;
  heroLabel: string;
  /** The paragraph under the brand row. */
  body: string;
  linkLabel: string;
  linkHref: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A story with its mark resolved and its figures attached. */
export interface ResolvedHreasyOutcomeStory extends HreasyOutcomeStory {
  /** The two logo sources collapsed into the one URL to render. */
  logo: string | null;
  stats: HreasyOutcomeStat[];
}

export interface CreateHreasyOutcomeStoryInput {
  name: string;
  slug: string;
  logoUrl: string | null;
  logoFileId: string | null;
  tag: string;
  heroValue: string;
  heroLabel: string;
  body: string;
  linkLabel: string;
  linkHref: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateHreasyOutcomeStoryInput {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  logoFileId?: string | null;
  tag?: string;
  heroValue?: string;
  heroLabel?: string;
  body?: string;
  linkLabel?: string;
  linkHref?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface CreateHreasyOutcomeStatInput {
  value: string;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyOutcomeStatInput = Partial<CreateHreasyOutcomeStatInput>;

export interface HreasyOutcomeStoryFilters {
  status?: ContentStatus;
}

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The whole row in one read: the cards sit side by side and are read against
 * each other, so sending them one at a time would mean a request per card.
 */
export interface PublicHreasyOutcomesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  stories: Array<{
    slug: string;
    name: string;
    /** Null means the card draws the name as words instead. */
    logo: string | null;
    tag: string;
    heroValue: string;
    heroLabel: string;
    body: string;
    linkLabel: string;
    linkHref: string;
    stats: Array<{ value: string; label: string }>;
  }>;
}
