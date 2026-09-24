// src/modules/product-pages/erp-page/types/outcomes-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "What Changed After UPWON - In Their Own Words".
 *
 * A carousel of outcome cards. Each card is one customer's result: the pill
 * naming their industry, the figure that changed, the line explaining it, the
 * quote, who said it, and a photograph down the right-hand side.
 *
 * The eyebrow and heading above the carousel live once in page_section_copy
 * under ('erp', 'outcomes'). That record's subtext is null here - the header
 * row is an eyebrow, a heading and a button, with the cards doing the
 * explaining.
 */

export interface ErpOutcomeCard {
  id: string;
  industry: string;
  /** Written exactly as it should read - "Same-day", "6 tools -> 1". */
  stat: string;
  statLabel: string;
  /** Stored without quotation marks; the card draws those. */
  quote: string;
  authorRole: string;
  authorCompany: string;
  /** The photograph. Exclusive with imageFileId, and one of them is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A card with its photograph resolved to something the browser can load. */
export interface ResolvedErpOutcomeCard extends ErpOutcomeCard {
  image: string | null;
}

export interface CreateErpOutcomeCardInput {
  industry: string;
  stat: string;
  statLabel: string;
  quote: string;
  authorRole: string;
  authorCompany: string;
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpOutcomeCardInput = Partial<CreateErpOutcomeCardInput>;

export interface ErpOutcomeCardFilters {
  status?: ContentStatus;
}

/**
 * The website-facing shape.
 *
 * The whole section in one read: the carousel scrolls in the browser, so the
 * cards are all in hand before the visitor touches an arrow.
 */
export interface PublicErpOutcomesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  cards: Array<{
    industry: string;
    stat: string;
    statLabel: string;
    quote: string;
    authorRole: string;
    authorCompany: string;
    image: string;
    imageAlt: string | null;
  }>;
}
