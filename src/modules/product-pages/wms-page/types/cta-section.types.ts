// src/modules/product-pages/wms-page/types/cta-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { WmsIconName } from '../utils/icons';

/**
 * "See Your Warehouse on UpWon - Live, in 30 Minutes."
 *
 * A block of copy laid over the left of a full-bleed photograph, two buttons
 * carrying icons, and a four-item trust strip underneath.
 *
 * Two shapes, because they are two different edits: the band's own furniture
 * is one small form, and the reassurances under it are a list.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('wms', 'cta').
 */

// ── the band ──────────────────────────────────────────────────────────────

export interface WmsCtaSection {
  id: string;
  /**
   * The photograph behind the band, and the phone crop of it.
   *
   * A pair, unlike the HREasy band's single banner: this design lays its copy
   * over the left of a landscape photograph, and that crop keeps nothing
   * readable on a phone. Each is an exclusive url/file pair, and all four are
   * optional - without them the band falls back to its cream ground.
   */
  imageUrl: string | null;
  imageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  /** The first button. Required - the band exists to be acted on. */
  primaryLabel: string;
  primaryHref: string;
  primaryIcon: WmsIconName;
  /** The second. All three parts or none of them. */
  secondaryLabel: string | null;
  secondaryHref: string | null;
  secondaryIcon: WmsIconName | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The band with each image pair collapsed into the one URL to render. */
export interface ResolvedWmsCtaSection extends WmsCtaSection {
  image: string | null;
  /** Null means the phone shows the desktop photograph. */
  mobileImage: string | null;
}

/** A full replacement, not a patch - the band is one small form. */
export interface UpsertWmsCtaSectionInput {
  imageUrl: string | null;
  imageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  primaryLabel: string;
  primaryHref: string;
  primaryIcon: WmsIconName;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  secondaryIcon: WmsIconName | null;
}

// ── the trust strip ───────────────────────────────────────────────────────

/**
 * One reassurance under the buttons: an icon and two short lines, drawn one
 * above the other.
 *
 * Two fields rather than one string because the break is deliberate - a
 * single field would leave an editor guessing where it falls.
 */
export interface WmsCtaTrustItem {
  id: string;
  icon: WmsIconName;
  lineOne: string;
  lineTwo: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWmsCtaTrustItemInput {
  icon: WmsIconName;
  lineOne: string;
  lineTwo: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWmsCtaTrustItemInput = Partial<CreateWmsCtaTrustItemInput>;

export interface WmsCtaTrustItemFilters {
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
 * the band reads perfectly well as a photograph with two buttons.
 */
export interface PublicWmsCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  image: string | null;
  /** Null means the phone shows the desktop photograph. */
  mobileImage: string | null;
  primary: { label: string; href: string; icon: WmsIconName };
  secondary: { label: string; href: string; icon: WmsIconName } | null;
  trust: Array<{ icon: WmsIconName; lineOne: string; lineTwo: string }>;
}
