// src/modules/product-pages/erp-page/types/journey-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { ErpIconName } from '../utils/icons';

/**
 * "UPWON ERP - Benefits for Everyone".
 *
 * An audience list on the left and a proof panel on the right that swaps with
 * the selection. Almost everything on the right therefore belongs to the
 * audience rather than to the section: its headline metric, the person it is
 * attributed to, its measurable outcomes and its beyond-the-numbers points.
 *
 * The exception is the three-up row of company-wide figures, which is the same
 * whichever audience is chosen - so those are a list of their own.
 *
 * The eyebrow, heading and description live once in page_section_copy under
 * ('erp', 'benefits').
 */

export interface ErpJourneyOutcome {
  id: string;
  personaId: string;
  text: string;
  icon: ErpIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ErpJourneyPoint {
  id: string;
  personaId: string;
  text: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ErpJourneyStat {
  id: string;
  value: string;
  prefix: string | null;
  suffix: string | null;
  label: string;
  description: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ErpJourneyPersona {
  id: string;
  role: string;
  context: string;
  title: string;
  description: string;
  /** Set to animate the figure up from zero. Exclusive with metricText. */
  metricCountTo: number | null;
  /** Set for a figure that cannot count, like a range. Exclusive with metricCountTo. */
  metricText: string | null;
  metricPrefix: string | null;
  metricSuffix: string | null;
  metricLabel: string;
  authorDesignation: string;
  authorCompany: string;
  /** The portrait. Exclusive with avatarFileId. */
  avatarUrl: string | null;
  avatarFileId: string | null;
  avatarAlt: string | null;
  /** Behind the initials when the portrait is missing or fails to load. */
  avatarColor: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A persona with its portrait resolved and its two lists attached. */
export interface ResolvedErpJourneyPersona extends ErpJourneyPersona {
  avatar: string | null;
  outcomes: ErpJourneyOutcome[];
  points: ErpJourneyPoint[];
}

export interface CreateErpJourneyPersonaInput {
  role: string;
  context: string;
  title: string;
  description: string;
  metricCountTo: number | null;
  metricText: string | null;
  metricPrefix: string | null;
  metricSuffix: string | null;
  metricLabel: string;
  authorDesignation: string;
  authorCompany: string;
  avatarUrl: string | null;
  avatarFileId: string | null;
  avatarAlt: string | null;
  avatarColor: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpJourneyPersonaInput = Partial<CreateErpJourneyPersonaInput>;

export interface CreateErpJourneyOutcomeInput {
  text: string;
  icon: ErpIconName;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpJourneyOutcomeInput = Partial<CreateErpJourneyOutcomeInput>;

export interface CreateErpJourneyPointInput {
  text: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpJourneyPointInput = Partial<CreateErpJourneyPointInput>;

export interface CreateErpJourneyStatInput {
  value: string;
  prefix: string | null;
  suffix: string | null;
  label: string;
  description: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpJourneyStatInput = Partial<CreateErpJourneyStatInput>;

export interface ErpJourneyPersonaFilters {
  status?: ContentStatus;
}

/**
 * The website-facing shape.
 *
 * The whole section in one read: the site swaps panels in the browser as the
 * pointer moves down the list, so fetching per selection would be a request
 * for content already in hand - and a visible stall on a hover.
 */
export interface PublicErpJourneySection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  personas: Array<{
    /** Composed here as "For the {role} · {context}", so the site prints it. */
    eyebrow: string;
    title: string;
    description: string;
    metric: {
      countTo: number | null;
      text: string | null;
      prefix: string | null;
      suffix: string | null;
    };
    metricLabel: string;
    authorDesignation: string;
    authorCompany: string;
    avatar: string | null;
    avatarAlt: string | null;
    avatarColor: string;
    outcomes: Array<{ text: string; icon: ErpIconName }>;
    points: string[];
  }>;
  /** Shared across every persona - the three-up row does not change. */
  stats: Array<{ value: string; label: string }>;
}
