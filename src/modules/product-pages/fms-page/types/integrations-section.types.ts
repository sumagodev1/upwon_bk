// src/modules/product-pages/fms-page/types/integrations-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "One System - with Pre-Built Integrations."
 *
 * Copy on the left, a rotating sphere of brand marks on the right.
 *
 * Two shapes, because they are two different edits: the mark at the core is
 * set once and rarely touched, while a brand joins the orbit the week that
 * integration ships.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('fms', 'integrations').
 */

/** The mark at the core of the sphere. One record for the whole section. */
export interface FmsIntegrationSection {
  id: string;
  /** Absolute URL or site-relative path. Exclusive with centreLogoFileId. */
  centreLogoUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with centreLogoUrl. */
  centreLogoFileId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The record with its two sources collapsed into the one URL to render. */
export interface ResolvedFmsIntegrationSection extends FmsIntegrationSection {
  centreLogo: string | null;
}

/**
 * Both fields optional, and `null` is meaningful: it clears the value, where
 * `undefined` leaves it untouched. There is no required field, because a
 * section with no centre mark is valid - the site falls back to the one it
 * ships.
 */
export interface UpsertFmsIntegrationSectionInput {
  centreLogoUrl?: string | null;
  centreLogoFileId?: string | null;
}

export interface FmsIntegrationLogo {
  id: string;
  /** This row's brand mark. Exclusive with logoFileId; one of the two required. */
  logoUrl: string | null;
  logoFileId: string | null;
  /** The brand name, doubling as the logo's alt text. */
  logoAlt: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The logo with its two sources collapsed into the one URL to render. */
export interface ResolvedFmsIntegrationLogo extends FmsIntegrationLogo {
  logo: string | null;
}

export interface CreateFmsIntegrationLogoInput {
  logoUrl: string | null;
  logoFileId: string | null;
  logoAlt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateFmsIntegrationLogoInput {
  logoUrl?: string | null;
  logoFileId?: string | null;
  logoAlt?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface FmsIntegrationLogoFilters {
  status?: ContentStatus;
}

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape: the copy, the centre mark and the orbit.
 *
 * `centreLogo` is nullable where `logos` is not. A section with no orbit
 * marks has nothing to draw, so the whole read returns null; a section with no
 * centre mark just falls back to the one the site already ships.
 */
export interface PublicFmsIntegrationsSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  centreLogo: string | null;
  logos: Array<{ image: string; alt: string }>;
}
