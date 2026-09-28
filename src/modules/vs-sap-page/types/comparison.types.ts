// src/modules/vs-sap-page/types/comparison.types.ts

import { ContentStatus } from '../../../config/constants';

/**
 * The capability comparison: the table's copy, and the capability rows in it.
 * One file for both, for the reason the About page's numbers.types.ts is one
 * file - they are one tab and one band.
 *
 * The table's columns are fixed at three - UpWon, SAP B1 and Oracle NetSuite -
 * and their headers are the site component's own labels, so neither is
 * authored here.
 */

// ── the section copy ──────────────────────────────────────────────────────

/**
 * The eyebrow, headline and description above the table, and the three labels
 * of its "Total Cost of Ownership (3 yr)" row. A singleton.
 */
export interface VsSapComparisonSection {
  /** The small label above the headline ('Capability comparison'). */
  eyebrow: string;
  /** Plain text: the table's heading component draws no accent span. */
  heading: string;
  subtext: string;
  /** The TCO row's UpWon cell ('BEST'). */
  tcoUpwon: string;
  /** The TCO row's SAP B1 cell ('HIGHEST'). */
  tcoSap: string;
  /** The TCO row's Oracle NetSuite cell ('VERY HIGH'). */
  tcoNetsuite: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** PUT body. A full replace of the section's copy and TCO labels. */
export interface ReplaceVsSapComparisonSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  tcoUpwon: string;
  tcoSap: string;
  tcoNetsuite: string;
}

// ── the capability rows ───────────────────────────────────────────────────

/** One row of the table, exactly as stored. */
export interface VsSapCapability {
  id: string;
  /** The row's label ('FSSAI compliance (native)'). */
  capability: string;
  /**
   * The three ratings, each an integer 0..5: 1 to 5 filled stars out of five,
   * and 0 for "not available natively", which the site draws as a dash.
   */
  upwon: number;
  sap: number;
  netsuite: number;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The website-facing shape of one row: no ids, no authorship, no timestamps, no
 * display_order - the array's order IS the display order - and no status,
 * because an INACTIVE row is simply not in the array.
 */
export interface PublicVsSapCapability {
  capability: string;
  upwon: number;
  sap: number;
  netsuite: number;
}

/**
 * The section and its ACTIVE rows, in one response - the page renders them as
 * one table.
 *
 * `hasCapabilities` separates the two reasons `capabilities` can be empty,
 * exactly as `hasStats` does on the About page's Number section. It counts the
 * rows regardless of status, so "there is no capability row at all" (nothing
 * authored, keep the built-in rows) and "every row is INACTIVE" (render the
 * table without them) stop being the same answer: a rating taken down because
 * it is no longer defensible must not reappear because the list it was in
 * became empty.
 */
export interface PublicVsSapComparisonSection {
  eyebrow: string;
  heading: string;
  subtext: string;
  /** The TCO row's three labels, keyed by the column they print in. */
  tco: {
    upwon: string;
    sap: string;
    netsuite: string;
  };
  capabilities: PublicVsSapCapability[];
  /** Whether any capability row exists at all - ACTIVE or INACTIVE. See above. */
  hasCapabilities: boolean;
}

/** POST body. displayOrder is absent on purpose - the service appends. */
export interface CreateVsSapCapabilityInput {
  capability: string;
  upwon: number;
  sap: number;
  netsuite: number;
  status: ContentStatus;
}

/** PUT body: every field optional, at least one required by the validator. */
export interface UpdateVsSapCapabilityInput {
  capability?: string;
  upwon?: number;
  sap?: number;
  netsuite?: number;
  status?: ContentStatus;
}

/** Every row's id, in its new order - a whole-set rewrite. */
export interface ReorderVsSapCapabilitiesInput {
  ids: string[];
}

/** The admin list's two controls. Paging is not one: see the repository. */
export interface VsSapCapabilityFilters {
  status?: ContentStatus;
  search?: string;
}
