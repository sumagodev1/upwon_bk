// src/modules/clients-page/types/roster-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * "Trusted by India's Leading Food & FMCG Brands." - the roster band on the
 * Clients page: a heading block over a scrolling marquee of client logos.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('clients', 'trust').
 */

export interface ClientsRosterLogo {
  id: string;
  /** The brand name - also the logo's alt text. */
  name: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A logo with its two image sources collapsed into the one URL to render. */
export interface ResolvedClientsRosterLogo extends ClientsRosterLogo {
  image: string | null;
}

export interface CreateClientsRosterLogoInput {
  name: string;
  imageUrl: string | null;
  imageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/** Absent leaves a field untouched; `null` clears the nullable ones. */
export type UpdateClientsRosterLogoInput = Partial<CreateClientsRosterLogoInput>;

export interface ClientsRosterLogoFilters {
  status?: ContentStatus;
}

export interface ReorderClientsRosterLogosInput {
  ids: string[];
}

/** The website-facing shape: the section copy and its logos, in one read. */
export interface PublicClientsRosterSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string | null;
  logos: Array<{ name: string; image: string }>;
}
