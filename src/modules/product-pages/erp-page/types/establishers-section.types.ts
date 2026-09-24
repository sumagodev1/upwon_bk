// src/modules/product-pages/erp-page/types/establishers-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { ErpIconName } from '../utils/icons';

/**
 * "Compliant by Design. Connected to What You Already Use."
 *
 * Two panels under one heading: a grid of compliance badges on the left, and
 * the integration sphere on the right.
 *
 * Only the badges are stored here. The sphere draws the same logos as the home
 * page's platform integrations section, read through that module rather than
 * kept as a second list - the same partners, saying the same thing, so two
 * lists would only give somebody the chance to update one of them.
 *
 * The eyebrow, heading and description live once in page_section_copy under
 * ('erp', 'establishers').
 */

export interface ErpEstablisherBadge {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: ErpIconName;
  title: string;
  subtext: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateErpEstablisherBadgeInput {
  icon: ErpIconName;
  title: string;
  subtext: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpEstablisherBadgeInput = Partial<CreateErpEstablisherBadgeInput>;

export interface ErpEstablisherBadgeFilters {
  status?: ContentStatus;
}

/**
 * The website-facing shape.
 *
 * The whole section in one read: the copy, the badges, and the sphere's logos
 * assembled from the integrations module.
 */
export interface PublicErpEstablishersSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  badges: Array<{ icon: ErpIconName; title: string; subtext: string }>;
  /** The same logos the home page sphere pins, in the same order. */
  logos: Array<{ image: string; alt: string | null }>;
  /** The mark at the centre of the sphere. Null leaves the site's own default. */
  centreLogo: string | null;
}
