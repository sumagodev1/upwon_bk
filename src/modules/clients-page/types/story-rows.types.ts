// src/modules/clients-page/types/story-rows.types.ts

import { ContentStatus } from '../../../config/constants';
import { CaseSectionKey } from './cases-section.types';

/**
 * The rows of a case study's list sections - outcomes, challenges, timeline
 * steps and deliverables. The four behave identically (an ordered list of
 * required text fields, each row with its own status, under one case), so one
 * repository / service / validator / router serves all of them, driven by a
 * StoryRowKind from utils/story-row-kinds.ts.
 */

/** One text field of a row: its API name, its column, and its authoring limit. */
export interface StoryRowField {
  key: string;
  column: string;
  label: string;
  max: number;
}

export interface StoryRowKind {
  /** Also the URL segment: /clients-page/cases-section/:caseId/<key>. */
  key: Extract<CaseSectionKey, 'outcomes' | 'challenges' | 'timeline' | 'deliverables'>;
  table: string;
  /** Audit entity type. */
  entity: string;
  /** For messages - 'outcome', 'challenge'. */
  noun: string;
  fields: readonly StoryRowField[];
  /** The cap on rows per case study. */
  maxRows: number;
}

/** A row as the admin API returns it: its text fields keyed by field.key. */
export interface StoryRow {
  id: string;
  caseId: string;
  values: Record<string, string>;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoryRowInput {
  values: Record<string, string>;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateStoryRowInput {
  values: Partial<Record<string, string>>;
  displayOrder?: number;
  status?: ContentStatus;
}
