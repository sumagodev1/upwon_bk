// src/modules/home-page/types/integrations-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../utils/heading-markup';

/**
 * Platform integrations: a list of orbit logos, shaped like the hero's slides.
 *
 * One row carries the section copy, the shared centre logo, and one of the
 * brand marks pinned to the rotating sphere. The copy and the centre logo
 * repeat across rows and the public read uses the first active one - see
 * 018_home_page_integrations.sql.
 */

export interface IntegrationsEntry {
  id: string;
  /** Shared across the section. Absolute URL or site-relative path. */
  centreLogoUrl: string | null;
  /** Shared across the section. Exclusive with centreLogoUrl. */
  centreLogoFileId: string | null;
  /** This row's orbit logo. Exclusive with logoFileId. */
  logoUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with logoUrl. */
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

/** An entry with everything the renderer needs resolved. */
export interface ResolvedIntegrationsEntry extends IntegrationsEntry {
  /** Each pair of source columns collapsed into the one URL to render. */
  logo: string | null;
  centreLogo: string | null;
}

export interface CreateIntegrationsEntryInput {
  centreLogoUrl: string | null;
  centreLogoFileId: string | null;
  logoUrl: string | null;
  logoFileId: string | null;
  logoAlt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Every field optional, and `null` is meaningful for the nullable ones: it
 * clears the value, where `undefined` leaves it untouched.
 */
export interface UpdateIntegrationsEntryInput {
  centreLogoUrl?: string | null;
  centreLogoFileId?: string | null;
  logoUrl?: string | null;
  logoFileId?: string | null;
  logoAlt?: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface IntegrationsEntryFilters {
  status?: ContentStatus;
}

export interface ReorderIntegrationsEntriesInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Assembled from the entries rather than mirroring them: the site renders one
 * heading beside one sphere, so the rows are folded back into that shape here
 * rather than in the browser.
 *
 * `centreLogo` is nullable where `logos` is not. A section with no orbit logos
 * has nothing to draw, so the whole read returns null; a section with no
 * centre logo just falls back to the mark the site already ships.
 */
export interface PublicIntegrationsSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  centreLogo: string | null;
  logos: Array<{ image: string; alt: string }>;
}
