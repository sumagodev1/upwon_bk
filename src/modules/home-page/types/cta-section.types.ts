// src/modules/home-page/types/cta-section.types.ts

import { HeadingLine } from '../utils/heading-markup';

/**
 * The report-download call to action.
 *
 * A singleton, unlike every other section in this module: the page has exactly
 * one of these bands, so there is no list, no ordering and no publish state -
 * the section is either authored or it is not. See 022_home_page_cta.sql.
 *
 * Its eyebrow, heading and subtext live in home_section_copy under the 'cta'
 * key, the same as the list sections since 021.
 */

export interface CtaSection {
  id: string;
  /** The collage behind the band. Absolute URL or site-relative path. */
  desktopImageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with the URL. */
  desktopImageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  buttonLabel: string;
  /** The PDF the button hands over. Upload only - there is no URL variant. */
  reportFileId: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The section with every source collapsed into the URL to actually use. */
export interface ResolvedCtaSection extends CtaSection {
  desktopImage: string | null;
  mobileImage: string | null;
  /** Already carries ?download, so the button saves rather than views. */
  reportUrl: string | null;
  /** So the panel and the site can show what the button hands over. */
  reportFileName: string | null;
  reportSizeBytes: number | null;
}

/**
 * A full replacement, not a patch.
 *
 * One row edited by one small form, so a partial update would only add a way
 * for half of it to drift while an administrator thinks they saved all of it -
 * the same reasoning as the section copy's upsert.
 *
 * `null` clears a slot; the image pairs stay mutually exclusive.
 */
export interface UpsertCtaSectionInput {
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  buttonLabel: string;
  reportFileId: string | null;
}

/**
 * The website-facing shape.
 *
 * The copy and the band come from two tables and are put back together here:
 * the site renders one block, so folding them is the server's job rather than
 * the browser's.
 *
 * Everything but the copy and the button label is nullable, because the
 * component has its own artwork and its own resources link to fall back on -
 * a band with no uploaded report still renders correctly.
 */
export interface PublicCtaSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  desktopImage: string | null;
  mobileImage: string | null;
  buttonLabel: string;
  /** Null means "no report attached" - the button keeps its built-in link. */
  reportUrl: string | null;
  reportFileName: string | null;
  reportSizeBytes: number | null;
}
