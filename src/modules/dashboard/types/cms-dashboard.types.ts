// src/modules/dashboard/types/cms-dashboard.types.ts

import { RecentActivityItem } from './dashboard.types';

/**
 * The dashboard this admin panel actually needs.
 *
 * Separate from DashboardOverview rather than replacing it: that one counts
 * organizations, subscriptions, plans and MRR, which belong to a tenanted SaaS
 * product. This installation is the marketing site's CMS - those three tables
 * are empty and always will be here - so a dashboard built on them shows a
 * screen of zeros.
 *
 * What this one shows is what an editor actually opens the panel to find out:
 * what has come in that needs answering, what has been changed lately, and how
 * much content each area holds.
 */

/**
 * One of the forms the public site submits into.
 *
 * `total` and `last7Days` rather than a read/unread split: only the careers
 * inbox carries a status column, so "unread" does not exist for the other
 * four and inventing it would mean a number the panel cannot keep true.
 */
export interface InboxCounter {
  /** The key the admin panel routes on, e.g. 'contactEnquiries'. */
  key: string;
  /** What it is called on screen. */
  label: string;
  /** Where the panel should link to. */
  to: string;
  total: number;
  last7Days: number;
  /**
   * Waiting on someone, where the table can say so. Null where it cannot -
   * which the panel renders as absent rather than as zero, because zero would
   * claim nothing is waiting when nothing is actually known.
   */
  needsAttention: number | null;
}

/** A content area an editor maintains, and how much is in it. */
export interface ContentCounter {
  key: string;
  label: string;
  to: string;
  /** Rows that exist. */
  total: number;
  /**
   * Rows the public site is currently showing. Null where the area has no
   * published/draft distinction, so the panel can omit it rather than
   * repeating `total` twice.
   */
  published: number | null;
}

export interface CmsDashboard {
  /** Submissions from the public site's forms - the actionable half. */
  inboxes: InboxCounter[];
  /** The content areas, for a sense of what is filled in and what is not. */
  content: ContentCounter[];
  /** The last few changes anyone made, straight from audit_logs. */
  recentActivity: RecentActivityItem[];
  /**
   * The signed-in admin's own last few changes.
   *
   * Worth separating from the list above: on an installation with one active
   * editor the two are identical, and on one with several "what did I just
   * change?" is a different question from "what changed?".
   */
  myRecentActivity: RecentActivityItem[];
  generatedAt: string;
}
