// src/modules/product-pages/fms-page/types/outcomes-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "35 Outlets Became 200. The Back-Office Team Didn't Grow at All."
 *
 * A case-study carousel: a full-bleed photograph with a card floating over it,
 * cycling between the networks running on UpWon.
 *
 * Every visible thing belongs to a story, including the background photograph -
 * the picture changes with the card, so it is a field on the story rather than
 * one image for the section.
 *
 * The eyebrow, heading and subtext above the carousel live once in
 * page_section_copy under ('fms', 'outcomes').
 */

export interface FmsOutcomeStat {
  id: string;
  storyId: string;
  /** Read verbatim: "250+", "6,000+", "35 to 200+". */
  value: string;
  /** The line under it, which says what the figure counts. */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FmsOutcomeStory {
  id: string;
  /** The network's name - also the alt text, and the avatar's initials. */
  name: string;
  /** Stable across renames, so a deep link keeps pointing at the same story. */
  slug: string;
  /** The brand mark on the card. Exclusive with logoFileId. */
  logoUrl: string | null;
  logoFileId: string | null;
  /** The photograph behind the card. Exclusive with photoFileId. */
  photoUrl: string | null;
  photoFileId: string | null;
  quote: string;
  personName: string;
  personCompany: string;
  linkLabel: string;
  linkHref: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A story with its media resolved and its figures attached. */
export interface ResolvedFmsOutcomeStory extends FmsOutcomeStory {
  logo: string | null;
  photo: string | null;
  stats: FmsOutcomeStat[];
}

export interface CreateFmsOutcomeStoryInput {
  name: string;
  slug: string;
  logoUrl: string | null;
  logoFileId: string | null;
  photoUrl: string | null;
  photoFileId: string | null;
  quote: string;
  personName: string;
  personCompany: string;
  linkLabel: string;
  linkHref: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateFmsOutcomeStoryInput {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  logoFileId?: string | null;
  photoUrl?: string | null;
  photoFileId?: string | null;
  quote?: string;
  personName?: string;
  personCompany?: string;
  linkLabel?: string;
  linkHref?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface CreateFmsOutcomeStatInput {
  value: string;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsOutcomeStatInput = Partial<CreateFmsOutcomeStatInput>;

export interface FmsOutcomeStoryFilters {
  status?: ContentStatus;
}

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The whole carousel in one read: it rotates on a timer in the browser, so
 * sending stories one at a time would mean a request every few seconds for
 * content already known.
 */
export interface PublicFmsOutcomesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  stories: Array<{
    slug: string;
    name: string;
    logo: string;
    photo: string;
    quote: string;
    personName: string;
    personCompany: string;
    linkLabel: string;
    linkHref: string;
    stats: Array<{ value: string; label: string }>;
  }>;
}
