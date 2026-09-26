// src/modules/clients-page/utils/story-row-kinds.ts

import { LIMITS } from '../../../config/constants';
import { StoryRowKind } from '../types/story-rows.types';

/**
 * The four list sections of a case study story, as data. The field limits
 * mirror the column sizes in 054_clients_case_story_sections.sql.
 */

export const OUTCOMES_KIND: StoryRowKind = {
  key: 'outcomes',
  table: 'clients_case_outcomes',
  entity: 'clients_case_outcome',
  noun: 'outcome',
  fields: [
    { key: 'value', column: 'value', label: 'Figure', max: 40 },
    { key: 'label', column: 'label', label: 'Label', max: 120 },
  ],
  maxRows: LIMITS.MAX_CLIENTS_CASE_OUTCOMES,
};

export const CHALLENGES_KIND: StoryRowKind = {
  key: 'challenges',
  table: 'clients_case_challenges',
  entity: 'clients_case_challenge',
  noun: 'challenge',
  fields: [
    { key: 'title', column: 'title', label: 'Title', max: 120 },
    // 'desc' is what the site's data has always called it; the column cannot
    // be, since DESC is a reserved word.
    { key: 'desc', column: 'description', label: 'Description', max: 400 },
  ],
  maxRows: LIMITS.MAX_CLIENTS_CASE_CHALLENGES,
};

export const TIMELINE_KIND: StoryRowKind = {
  key: 'timeline',
  table: 'clients_case_timeline_steps',
  entity: 'clients_case_timeline_step',
  noun: 'timeline step',
  fields: [
    { key: 'week', column: 'week', label: 'Label', max: 40 },
    { key: 'title', column: 'title', label: 'Title', max: 120 },
    { key: 'detail', column: 'detail', label: 'Detail', max: 400 },
  ],
  maxRows: LIMITS.MAX_CLIENTS_CASE_TIMELINE_STEPS,
};

export const DELIVERABLES_KIND: StoryRowKind = {
  key: 'deliverables',
  table: 'clients_case_deliverables',
  entity: 'clients_case_deliverable',
  noun: 'deliverable',
  fields: [{ key: 'text', column: 'text', label: 'Item', max: 200 }],
  maxRows: LIMITS.MAX_CLIENTS_CASE_DELIVERABLES,
};

export const STORY_ROW_KINDS: readonly StoryRowKind[] = [
  OUTCOMES_KIND,
  CHALLENGES_KIND,
  TIMELINE_KIND,
  DELIVERABLES_KIND,
];
