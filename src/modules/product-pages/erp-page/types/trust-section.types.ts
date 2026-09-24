// src/modules/product-pages/erp-page/types/trust-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The ERP page's proof strip: a list of entries.
 *
 * One row carries at most one brand logo and at most one counter. The two
 * lists are gathered independently on read, so they need not line up - six
 * logos and four counters is six rows, the last two logo-only.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('erp', 'trust').
 */

export interface ErpTrustEntry {
  id: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  /** The brand name, doubling as the logo's alt text. */
  imageAlt: string | null;
  /** Display text, not a number: '10,000+' and '4,200+' are authored. */
  statValue: string | null;
  statLabel: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** An entry with everything the renderer needs resolved. */
export interface ResolvedErpTrustEntry extends ErpTrustEntry {
  /** The two image sources collapsed into the one URL to actually render. */
  image: string | null;
}

export interface CreateErpTrustEntryInput {
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  statValue: string | null;
  statLabel: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Every field optional, and `null` is meaningful for the nullable ones: it
 * clears the value, where `undefined` leaves it untouched.
 */
export interface UpdateErpTrustEntryInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  statValue?: string | null;
  statLabel?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface ErpTrustEntryFilters {
  status?: ContentStatus;
}

export interface ReorderErpTrustEntriesInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Assembled from the entries rather than mirroring them: the site renders one
 * card with one heading, one marquee and one row of counters, so folding the
 * rows back into that shape is the server's job rather than the browser's.
 */
export interface PublicErpTrustSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  logos: Array<{ image: string; alt: string }>;
  stats: Array<{ value: string; label: string }>;
}
