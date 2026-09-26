// src/modules/clients-page/types/cases-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * The Clients page's case studies.
 *
 * Each row is one client, shown twice on the site:
 *
 *   the card   in "What Growth Actually Looks Like on UpWon." on /clients -
 *              category, brand, location, scale, headline, the first three
 *              active outcomes and the 'Read the full story' link.
 *   the story  at /clients/<slug>, when the row has a slug - built from its
 *              sections, each switched on or off on its own (CASE_SECTIONS).
 *
 * The story's lists (outcomes, challenges, timeline, deliverables) are child
 * rows - see types/story-rows.types.ts. The eyebrow, heading and subtext
 * above the card grid live once in page_section_copy under
 * ('clients', 'outcomes').
 */

/** The story page's sections that can be switched on and off. */
export const CASE_SECTIONS = [
  'outcomes',
  'challenges',
  'whyUpwon',
  'timeline',
  'deliverables',
  'testimonial',
] as const;

export type CaseSectionKey = (typeof CASE_SECTIONS)[number];

export type CaseSectionStatuses = Record<CaseSectionKey, ContentStatus>;

/** One figure. The card shows the first three active; the story all of them. */
export interface ClientsCaseOutcome {
  /** Written exactly as it should read - '35 → 200+', '₹20 L+'. */
  value: string;
  label: string;
}

/** One card of the story's "What X Faced Before UpWon" list. */
export interface ClientsCaseChallenge {
  title: string;
  desc: string;
}

/** One step of the story's "What We Delivered" timeline. */
export interface ClientsCaseTimelineStep {
  /** The small label - 'Week 1', 'Day 30', 'Month 4+'. */
  week: string;
  title: string;
  detail: string;
}

/** The story's text fields, stored on the card itself. */
export interface ClientsCaseStoryFields {
  /** The URL segment, /clients/<slug>. Null means no story page. */
  slug: string | null;
  duration: string | null;
  challengeOneLine: string | null;
  /** The paragraph beside the challenges list. */
  challengeSummary: string | null;
  whyUpwon: string | null;
  testimonialQuote: string | null;
  testimonialAuthor: string | null;
  testimonialRole: string | null;
}

export interface ClientsCaseCard extends ClientsCaseStoryFields {
  id: string;
  category: string;
  brand: string;
  location: string;
  scale: string | null;
  /** Stored without quotation marks; the card draws those. */
  headline: string;
  /**
   * Read-only: the ACTIVE outcome rows, in order - what the card shows the
   * first three of. Edited through the outcomes section, not here.
   */
  outcomes: ClientsCaseOutcome[];
  /** Site-relative path or absolute URL. Null hides 'Read the full story'. */
  storyUrl: string | null;
  sections: CaseSectionStatuses;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientsCaseCardInput extends ClientsCaseStoryFields {
  category: string;
  brand: string;
  location: string;
  scale: string | null;
  headline: string;
  storyUrl: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateClientsCaseCardInput = Partial<CreateClientsCaseCardInput>;

export interface ClientsCaseCardFilters {
  status?: ContentStatus;
}

export interface ReorderClientsCaseCardsInput {
  ids: string[];
}

/** The website-facing shape: the section copy and its cards, in one read. */
export interface PublicClientsCasesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string | null;
  cards: Array<{
    category: string;
    brand: string;
    location: string;
    scale: string | null;
    headline: string;
    /** The first three active only - the rest are the story's. */
    outcomes: ClientsCaseOutcome[];
    storyUrl: string | null;
    /** Set when the card has a published story at /clients/<slug>. */
    slug: string | null;
  }>;
}

/**
 * The website-facing story at /clients/<slug>. A switched-off section comes
 * back empty (an empty list, or null) - the page hides empty sections.
 */
export interface PublicClientsCaseStory {
  slug: string;
  category: string;
  brand: string;
  location: string;
  scale: string | null;
  headline: string;
  duration: string | null;
  challengeOneLine: string | null;
  challengeSummary: string | null;
  outcomes: ClientsCaseOutcome[];
  challenges: ClientsCaseChallenge[];
  whyUpwon: string | null;
  timeline: ClientsCaseTimelineStep[];
  deliverables: string[];
  /** Null when the story has no closing quote, or it is switched off. */
  testimonial: { quote: string; author: string; role: string } | null;
}
