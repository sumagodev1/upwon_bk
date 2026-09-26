// src/modules/product-pages/pos-page/types/security-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { PosIconName } from '../utils/icons';

/**
 * "GST-Compliant by Default. Your Sales Data Stays Yours."
 *
 * Four shapes rather than one, because they are four different edits:
 *
 *   the section     the two panel labels, the shield, the line under the
 *                   sphere, and the data-ownership strip
 *   the badges      the compliance marks flanking the shield
 *   the logos       the marks pinned to the integration sphere
 *   the assurances  the "You own it." row at the foot of the strip
 *
 * The eyebrow, heading and subtext above it all live once in
 * page_section_copy under ('pos', 'establishers') - the same key the ERP page
 * uses for this band.
 */

// ── the fixed furniture ───────────────────────────────────────────────────

export interface PosSecuritySection {
  id: string;
  /** The small heading over the badge panel: "Compliant by Design". */
  panelOneLabel: string;
  /** And over the sphere: "Connected to What You Already Use". */
  panelTwoLabel: string;
  /** The shield between the badge columns. Exclusive pair, both optional. */
  shieldImageUrl: string | null;
  shieldImageFileId: string | null;
  /** The caption under the sphere. Takes **like this** accent markup. */
  sphereFootnote: string | null;
  /** The data-ownership strip, which the section always draws. */
  dataIcon: PosIconName;
  dataHeading: string;
  dataBody: string;
  /** The illustrations flanking it. Exclusive pairs, both optional. */
  dataLeftImageUrl: string | null;
  dataLeftImageFileId: string | null;
  dataRightImageUrl: string | null;
  dataRightImageFileId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The section with each image pair collapsed into the one URL to render. */
export interface ResolvedPosSecuritySection extends PosSecuritySection {
  shieldImage: string | null;
  dataLeftImage: string | null;
  dataRightImage: string | null;
}

/** A full replacement, not a patch - the furniture is one small form. */
export interface UpsertPosSecuritySectionInput {
  panelOneLabel: string;
  panelTwoLabel: string;
  shieldImageUrl: string | null;
  shieldImageFileId: string | null;
  sphereFootnote: string | null;
  dataIcon: PosIconName;
  dataHeading: string;
  dataBody: string;
  dataLeftImageUrl: string | null;
  dataLeftImageFileId: string | null;
  dataRightImageUrl: string | null;
  dataRightImageFileId: string | null;
}

// ── the compliance badges ─────────────────────────────────────────────────

export interface PosSecurityBadge {
  id: string;
  icon: PosIconName;
  title: string;
  /** The line under the title. */
  subtext: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePosSecurityBadgeInput {
  icon: PosIconName;
  title: string;
  subtext: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosSecurityBadgeInput = Partial<CreatePosSecurityBadgeInput>;

// ── the sphere's marks ────────────────────────────────────────────────────

export interface PosSecurityLogo {
  id: string;
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The logo with its two sources collapsed into the one URL to render. */
export interface ResolvedPosSecurityLogo extends PosSecurityLogo {
  image: string | null;
}

export interface CreatePosSecurityLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosSecurityLogoInput = Partial<CreatePosSecurityLogoInput>;

// ── the assurances ────────────────────────────────────────────────────────

export interface PosSecurityAssurance {
  id: string;
  icon: PosIconName;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePosSecurityAssuranceInput {
  icon: PosIconName;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosSecurityAssuranceInput = Partial<CreatePosSecurityAssuranceInput>;

// ── shared ────────────────────────────────────────────────────────────────

export interface PosSecurityListFilters {
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
 * Null when the copy or the furniture is missing - the page then keeps the
 * band it ships, which is a complete working one. An empty list is not a
 * reason to fall back: a section with no badges still has its sphere, and the
 * component simply draws fewer things.
 */
export interface PublicPosSecuritySection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;

  panelOneLabel: string;
  panelTwoLabel: string;
  shieldImage: string | null;

  /** The caption under the sphere, and the same line parsed for its accent. */
  sphereFootnote: string | null;
  sphereFootnoteLines: HeadingLine[] | null;

  dataIcon: PosIconName;
  dataHeading: string;
  dataBody: string;
  dataLeftImage: string | null;
  dataRightImage: string | null;

  badges: Array<{ icon: PosIconName; title: string; subtext: string }>;
  logos: Array<{ image: string; alt: string }>;
  assurances: Array<{ icon: PosIconName; label: string }>;
}
