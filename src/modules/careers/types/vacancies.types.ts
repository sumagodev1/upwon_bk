// src/modules/careers/types/vacancies.types.ts

import { ContentStatus, WorkMode } from '../../../config/constants';

/** One vacancy exactly as it is stored. */
export interface CareerVacancy {
  id: string;
  title: string;
  /** The orange label above the title on the Careers page ('Engineering'). */
  department: string;
  /** Just the place - 'Nashik', 'Pan-India'. The arrangement is workMode. */
  location: string;
  workMode: WorkMode;
  description: string;
  /** One entry per bullet, in the order they are shown. May be empty. */
  requirements: string[];
  skills: string[];
  /** Free text: '3-5 years', 'Fresher'. */
  experience: string;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The admin list shape: the row plus how many people have applied.
 *
 * The count is on the list because it is a column of the Vacancy Management
 * table and because the delete confirmation needs it - an administrator must
 * be told that a role has nineteen applications before deleting it, not after.
 */
export interface CareerVacancySummary extends CareerVacancy {
  applicationCount: number;
}

/**
 * The website-facing shape: no authorship, no timestamps, no display_order.
 *
 * The id IS here, unlike every other public CMS read, because the apply form
 * in the details popup has to name the vacancy it is applying to. It is an
 * opaque handle to an already-public job advert, which is a different thing
 * from the internal ids the other public shapes drop.
 *
 * Everything the popup renders is on it, so opening a role costs no second
 * request.
 */
export interface PublicCareerVacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  workMode: WorkMode;
  experience: string;
  description: string;
  requirements: string[];
  skills: string[];
}

/** POST body. displayOrder is absent on purpose - the service appends. */
export interface CreateCareerVacancyInput {
  title: string;
  department: string;
  location: string;
  workMode: WorkMode;
  description: string;
  requirements: string[];
  skills: string[];
  experience: string;
  status: ContentStatus;
}

/** PUT body: every field optional, at least one required by the validator. */
export interface UpdateCareerVacancyInput {
  title?: string;
  department?: string;
  location?: string;
  workMode?: WorkMode;
  description?: string;
  requirements?: string[];
  skills?: string[];
  experience?: string;
  status?: ContentStatus;
}

/** The admin list's two controls. Paging is not one: see the repository. */
export interface CareerVacancyFilters {
  status?: ContentStatus;
  search?: string;
}

/** Every vacancy id, in its new order - a whole-set rewrite. */
export interface ReorderCareerVacanciesInput {
  ids: string[];
}
