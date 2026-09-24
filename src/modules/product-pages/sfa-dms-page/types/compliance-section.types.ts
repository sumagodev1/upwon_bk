// src/modules/product-pages/sfa-dms-page/types/compliance-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { SfaIconName } from '../utils/icons';

/**
 * "Compliant by Design. Connected to What You Already Use."
 *
 * Two panels under one heading: a column of compliance badges over a piece of
 * artwork on the left, and the integration sphere on the right.
 *
 * The panels themselves are one record - they are a single small form - and
 * the badges are a list that grows.
 *
 * The sphere is not stored here. It draws the same logos as the home page's
 * platform integrations section, read through that module rather than kept as
 * a second list - the same partners, saying the same thing, so two lists would
 * only give somebody the chance to update one of them. The ERP page's
 * equivalent section is arranged the same way.
 *
 * The eyebrow, heading and description live once in page_section_copy under
 * ('sfa-dms', 'establishers').
 */

// ── the two panel headers ─────────────────────────────────────────────────

export interface SfaComplianceSection {
  id: string;
  /** The left panel's small caps header. */
  complianceLabel: string;
  complianceIcon: SfaIconName;
  /** The artwork behind the left panel. Exclusive with backgroundImageFileId. */
  backgroundImageUrl: string | null;
  backgroundImageFileId: string | null;
  /** The right panel's header. */
  ecosystemLabel: string;
  ecosystemIcon: SfaIconName;
  /**
   * The right panel's accent, as #RRGGBB. Its icon tint is this at reduced
   * alpha, computed on the site rather than stored.
   */
  ecosystemColor: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The panels with the artwork's two sources resolved to the URL to render. */
export interface ResolvedSfaComplianceSection extends SfaComplianceSection {
  backgroundImage: string | null;
}

/**
 * A full replacement, not a patch.
 *
 * The two headers are one short form, so a partial update would only add a way
 * for one panel to drift out of step with the other while an administrator
 * thinks they saved both.
 */
export interface UpsertSfaComplianceSectionInput {
  complianceLabel: string;
  complianceIcon: SfaIconName;
  backgroundImageUrl: string | null;
  backgroundImageFileId: string | null;
  ecosystemLabel: string;
  ecosystemIcon: SfaIconName;
  ecosystemColor: string;
}

// ── the badges ────────────────────────────────────────────────────────────

export interface SfaComplianceBadge {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: SfaIconName;
  title: string;
  subtext: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSfaComplianceBadgeInput {
  icon: SfaIconName;
  title: string;
  subtext: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaComplianceBadgeInput = Partial<CreateSfaComplianceBadgeInput>;

export interface SfaComplianceBadgeFilters {
  status?: ContentStatus;
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read: the copy, both panels, the badges, and the
 * sphere's logos assembled from the integrations module.
 */
export interface PublicSfaComplianceSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  compliance: {
    label: string;
    icon: SfaIconName;
    backgroundImage: string | null;
  };
  ecosystem: {
    label: string;
    icon: SfaIconName;
    color: string;
  };
  badges: Array<{ icon: SfaIconName; title: string; subtext: string }>;
  /** The same logos the home page sphere pins, in the same order. */
  logos: Array<{ image: string; alt: string | null }>;
  /** The mark at the centre of the sphere. Null leaves the site's own default. */
  centreLogo: string | null;
}
