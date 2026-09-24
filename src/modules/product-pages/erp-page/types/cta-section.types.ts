// src/modules/product-pages/erp-page/types/cta-section.types.ts

import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The ERP page's closing band. A singleton: the page has exactly one.
 *
 * Its eyebrow, heading and subtext live in page_section_copy under
 * ('erp', 'cta'); this record is the artwork and the button.
 */

export interface ErpCtaSection {
  id: string;
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  buttonLabel: string;
  buttonHref: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedErpCtaSection extends ErpCtaSection {
  desktopImage: string | null;
  mobileImage: string | null;
}

/** A full replacement, not a patch - one row edited by one small form. */
export interface UpsertErpCtaSectionInput {
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  buttonLabel: string;
  buttonHref: string;
}

export interface PublicErpCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  desktopImage: string | null;
  mobileImage: string | null;
  buttonLabel: string;
  buttonHref: string;
}
