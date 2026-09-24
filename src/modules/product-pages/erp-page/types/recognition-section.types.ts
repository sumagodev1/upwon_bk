// src/modules/product-pages/erp-page/types/recognition-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { ErpIconName } from '../utils/icons';

/**
 * The industry recognition switcher.
 *
 * Three lists that are edited and ordered independently: the industries, each
 * industry's features, and the benefits strip along the bottom of the card.
 *
 * The label, heading and description live once in page_section_copy under
 * ('erp', 'recognition'), and the orange highlight is the **accent** marker
 * inside that heading rather than a field of its own.
 */

export interface ErpIndustryFeature {
  id: string;
  industryId: string;
  title: string;
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: ErpIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ErpIndustryBenefit {
  id: string;
  title: string;
  icon: ErpIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ErpIndustry {
  id: string;
  name: string;
  /** Stable across renames, so a deep link keeps pointing at the same panel. */
  slug: string;
  icon: ErpIconName;
  shortDescription: string;
  erpTitle: string;
  erpDescription: string;
  /** The industry photo. Exclusive with imageFileId. */
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  /** The dashboard screenshot. Exclusive with dashboardFileId. */
  dashboardUrl: string | null;
  dashboardFileId: string | null;
  dashboardAlt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** An industry with its media resolved and its features attached. */
export interface ResolvedErpIndustry extends ErpIndustry {
  image: string | null;
  dashboard: string | null;
  features: ErpIndustryFeature[];
}

export interface CreateErpIndustryInput {
  name: string;
  slug: string;
  icon: ErpIconName;
  shortDescription: string;
  erpTitle: string;
  erpDescription: string;
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  dashboardUrl: string | null;
  dashboardFileId: string | null;
  dashboardAlt: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateErpIndustryInput {
  name?: string;
  slug?: string;
  icon?: ErpIconName;
  shortDescription?: string;
  erpTitle?: string;
  erpDescription?: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  dashboardUrl?: string | null;
  dashboardFileId?: string | null;
  dashboardAlt?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface CreateErpIndustryFeatureInput {
  title: string;
  description: string;
  icon: ErpIconName;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpIndustryFeatureInput = Partial<CreateErpIndustryFeatureInput>;

export interface CreateErpIndustryBenefitInput {
  title: string;
  icon: ErpIconName;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpIndustryBenefitInput = Partial<CreateErpIndustryBenefitInput>;

export interface ErpIndustryFilters {
  status?: ContentStatus;
}

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The whole section in one read: the site switches panels in the browser
 * without going back to the server, so sending the industries one at a time
 * would mean a request per click for content already known.
 */
export interface PublicErpRecognitionSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  industries: Array<{
    slug: string;
    name: string;
    icon: ErpIconName;
    shortDescription: string;
    erpTitle: string;
    erpDescription: string;
    image: string | null;
    imageAlt: string | null;
    dashboard: string | null;
    dashboardAlt: string | null;
    features: Array<{ title: string; description: string; icon: ErpIconName }>;
  }>;
  /** Shared across every industry - the strip does not change with selection. */
  benefits: Array<{ title: string; icon: ErpIconName }>;
}
