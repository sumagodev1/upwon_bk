// src/modules/product-pages/hreasy-page/types/cta-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { HreasyIconName } from '../utils/icons';

/**
 * "See Your Whole Workforce on One System - Live, in 30 Minutes."
 *
 * A single banner with the copy centred over it, two buttons carrying icons,
 * and a four-item trust strip underneath.
 *
 * Two shapes, because they are two different edits: the band's own furniture
 * is one small form, and the reassurances under it are a list.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('hreasy', 'cta').
 */

// ── the band ──────────────────────────────────────────────────────────────

export interface HreasyCtaSection {
  id: string;
  /**
   * The banner behind the band. One image, not the pair the other pages
   * carry - this band centres its copy over a full-width cover crop, so the
   * same file serves both viewports. Exclusive pair, both optional.
   */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The first button. Required - the band exists to be acted on. */
  primaryLabel: string;
  primaryHref: string;
  primaryIcon: HreasyIconName;
  /** The second. All three parts or none of them. */
  secondaryLabel: string | null;
  secondaryHref: string | null;
  secondaryIcon: HreasyIconName | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The band with its image pair collapsed into the one URL to render. */
export interface ResolvedHreasyCtaSection extends HreasyCtaSection {
  image: string | null;
}

/** A full replacement, not a patch - the band is one small form. */
export interface UpsertHreasyCtaSectionInput {
  imageUrl: string | null;
  imageFileId: string | null;
  primaryLabel: string;
  primaryHref: string;
  primaryIcon: HreasyIconName;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  secondaryIcon: HreasyIconName | null;
}

// ── the trust strip ───────────────────────────────────────────────────────

/**
 * One reassurance under the buttons: an icon and two short lines, drawn one
 * above the other.
 *
 * Two fields rather than one string because the break is deliberate - a
 * single field would leave an editor guessing where it falls.
 */
export interface HreasyCtaTrustItem {
  id: string;
  icon: HreasyIconName;
  lineOne: string;
  lineTwo: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHreasyCtaTrustItemInput {
  icon: HreasyIconName;
  lineOne: string;
  lineTwo: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyCtaTrustItemInput = Partial<CreateHreasyCtaTrustItemInput>;

export interface HreasyCtaTrustItemFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole band in one read.
 *
 * Null when either the copy or the band itself is missing - the page then
 * keeps the band it ships. An empty trust strip is not a reason to fall back:
 * the band reads perfectly well as a banner with two buttons.
 */
export interface PublicHreasyCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  image: string | null;
  primary: { label: string; href: string; icon: HreasyIconName };
  secondary: { label: string; href: string; icon: HreasyIconName } | null;
  trust: Array<{ icon: HreasyIconName; lineOne: string; lineTwo: string }>;
}
