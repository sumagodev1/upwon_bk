// src/modules/insider-page/types/issues.types.ts

import { ContentStatus } from '../../../config/constants';

// ── issues ────────────────────────────────────────────────────────────────

/** An Insider issue exactly as it is stored. */
export interface InsiderIssue {
  id: string;
  /** The URL segment: /newsletter/<slug>. */
  slug: string;
  /** 'March 2026'. */
  label: string;
  /** The running number printed beside the label ('ISSUE 4'). */
  issueNumber: number;
  /** The issue /newsletter opens on. At most one issue has it. */
  isCurrent: boolean;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The admin list row: an issue plus how many stories it holds (any status). */
export interface InsiderIssueSummary extends InsiderIssue {
  storyCount: number;
}

/** The admin detail view: the issue and its stories in display order. */
export interface InsiderIssueWithStories extends InsiderIssueSummary {
  stories: ResolvedInsiderStory[];
}

export interface CreateInsiderIssueInput {
  slug: string;
  label: string;
  /** Absent means "the next free number", assigned on insert. */
  issueNumber?: number;
  status: ContentStatus;
  isCurrent: boolean;
}

/** Absent leaves a field untouched. */
export interface UpdateInsiderIssueInput {
  slug?: string;
  label?: string;
  issueNumber?: number;
  status?: ContentStatus;
  isCurrent?: boolean;
}

export interface InsiderIssueFilters {
  status?: ContentStatus;
}

// ── stories ───────────────────────────────────────────────────────────────

/** A story exactly as it is stored. */
export interface InsiderStory {
  id: string;
  issueId: string;
  /** The URL segment: /newsletter/<issue-slug>/<slug>. Unique within its issue. */
  slug: string;
  /** The small label on the card ('Customer win'). */
  eyebrow: string;
  /** The card's link text ('Get inspired'). */
  ctaLabel: string;
  title: string;
  blurb: string;
  /** An absolute URL or a site-relative path. Mutually exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Mutually exclusive with imageUrl. */
  imageFileId: string | null;
  imageAlt: string | null;
  /** Copy, not a number: '4 min read'. */
  readTime: string | null;
  /** The article, one entry per paragraph. */
  body: string[];
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A story with its image source collapsed into the one URL to render. */
export interface ResolvedInsiderStory extends InsiderStory {
  image: string | null;
}

export interface CreateInsiderStoryInput {
  slug: string;
  eyebrow: string;
  ctaLabel: string;
  title: string;
  blurb: string;
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  readTime: string | null;
  body: string[];
  /** Omitted means "append to the end" of the issue. */
  displayOrder?: number;
  status: ContentStatus;
}

/** Absent leaves a field untouched; `null` clears the nullable ones. */
export interface UpdateInsiderStoryInput {
  slug?: string;
  eyebrow?: string;
  ctaLabel?: string;
  title?: string;
  blurb?: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  readTime?: string | null;
  body?: string[];
  displayOrder?: number;
  status?: ContentStatus;
}

/** Every story id of one issue, in the order they should end up in. */
export interface ReorderInsiderStoriesInput {
  ids: string[];
}

// ── public shapes ─────────────────────────────────────────────────────────

/*
 * The website-facing shapes. No ids, ordering, timestamps, or authorship, and
 * the field names are the ones the site's own data/newsletter.js objects use
 * (`cta`, `current`), so fetched and static content are interchangeable at the
 * render site.
 */

/** A story as a card in an issue's grid. */
export interface PublicInsiderStoryCard {
  slug: string;
  eyebrow: string;
  cta: string;
  title: string;
  blurb: string;
  image: string | null;
  imageAlt: string | null;
  readTime: string | null;
}

export interface PublicInsiderIssue {
  slug: string;
  label: string;
  issueNumber: number;
  /** Exactly one published issue carries true - see issues.service getPublishedIssues. */
  current: boolean;
  stories: PublicInsiderStoryCard[];
}

/** A story as its own article page: the card plus the body. */
export interface PublicInsiderStory extends PublicInsiderStoryCard {
  body: string[];
}

export interface PublicInsiderStoryPage {
  issue: Pick<PublicInsiderIssue, 'slug' | 'label' | 'issueNumber'>;
  story: PublicInsiderStory;
}
