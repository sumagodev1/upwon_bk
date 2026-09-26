// src/modules/careers/validators/vacancies.validator.ts

import { CONTENT_STATUSES, LIMITS, WORK_MODES } from '../../../config/constants';
import { validator } from '../../../core/utils/validation';
import {
  CareerVacancyFilters,
  CreateCareerVacancyInput,
  ReorderCareerVacanciesInput,
  UpdateCareerVacancyInput,
} from '../types/vacancies.types';

/**
 * Authoring limits, matched against the trimmed text.
 *
 * These are the numbers the admin form's counters are written against and the
 * ones 019_career_vacancies.sql sizes its columns to. Changing one means
 * changing all three.
 */
const TITLE_MIN = 3;
const TITLE_MAX = 200;
const DEPARTMENT_MIN = 2;
const DEPARTMENT_MAX = 80;
const LOCATION_MIN = 2;
const LOCATION_MAX = 120;
const EXPERIENCE_MIN = 1;
const EXPERIENCE_MAX = 60;
/** Long enough for a real description of a role, short enough for a popup. */
const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 5000;
/** One bullet, not a paragraph - these render as list items. */
const BULLET_MAX = 300;

export function validateCreateCareerVacancy(body: unknown): CreateCareerVacancyInput {
  const v = validator(body);

  const dto: CreateCareerVacancyInput = {
    title: v.requiredString('title', { min: TITLE_MIN, max: TITLE_MAX }),
    department: v.requiredString('department', { min: DEPARTMENT_MIN, max: DEPARTMENT_MAX }),
    location: v.requiredString('location', { min: LOCATION_MIN, max: LOCATION_MAX }),
    workMode: v.requiredEnum('workMode', WORK_MODES),
    description: v.requiredString('description', {
      min: DESCRIPTION_MIN,
      max: DESCRIPTION_MAX,
    }),
    // textList trims entries and drops the blank ones, so the empty row an
    // editor leaves behind never saves. Empty is a legal answer for both: the
    // popup omits a heading it has no bullets for, which reads better than a
    // heading over nothing.
    requirements: v.textList('requirements', {
      max: LIMITS.MAX_VACANCY_REQUIREMENTS,
      maxLength: BULLET_MAX,
    }),
    skills: v.textList('skills', {
      max: LIMITS.MAX_VACANCY_SKILLS,
      maxLength: BULLET_MAX,
    }),
    experience: v.requiredString('experience', { min: EXPERIENCE_MIN, max: EXPERIENCE_MAX }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * A full edit of one vacancy.
 *
 * displayOrder is not here and has no input in the form: position is changed
 * with the reorder arrows, which rewrite the whole set at once. A typed
 * position lets two rows claim 3 and leaves the tie to created_at, which is
 * not what the person typing it meant.
 */
export function validateUpdateCareerVacancy(body: unknown): UpdateCareerVacancyInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'title',
    'department',
    'location',
    'workMode',
    'description',
    'requirements',
    'skills',
    'experience',
    'status',
  ]);

  /*
   * Both lists are replaced whole, never merged bullet by bullet. Absent means
   * "leave it alone"; present and empty means "clear it", which is a real
   * edit and must not be turned back into "leave it alone" by treating [] as
   * nothing.
   */
  const requirements = v.has('requirements')
    ? v.textList('requirements', {
        max: LIMITS.MAX_VACANCY_REQUIREMENTS,
        maxLength: BULLET_MAX,
      })
    : undefined;

  const skills = v.has('skills')
    ? v.textList('skills', { max: LIMITS.MAX_VACANCY_SKILLS, maxLength: BULLET_MAX })
    : undefined;

  const dto: UpdateCareerVacancyInput = {
    title: v.optionalString('title', { min: TITLE_MIN, max: TITLE_MAX }),
    department: v.optionalString('department', {
      min: DEPARTMENT_MIN,
      max: DEPARTMENT_MAX,
    }),
    location: v.optionalString('location', { min: LOCATION_MIN, max: LOCATION_MAX }),
    workMode: v.optionalEnum('workMode', WORK_MODES),
    description: v.optionalString('description', {
      min: DESCRIPTION_MIN,
      max: DESCRIPTION_MAX,
    }),
    requirements,
    skills,
    experience: v.optionalString('experience', {
      min: EXPERIENCE_MIN,
      max: EXPERIENCE_MAX,
    }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/** Publish / unpublish, kept separate from the edit form's save. */
export function validateCareerVacancyStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** Every vacancy id, in its new order - a whole-set rewrite. */
export function validateReorderCareerVacancies(body: unknown): ReorderCareerVacanciesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_VACANCIES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one vacancy id', 'REQUIRED');

  // uuidArray dedupes silently; a duplicated id would become a partial reorder
  // with two rows fighting over one position.
  const raw = (body as { ids?: unknown } | null)?.ids;
  v.custom(
    !Array.isArray(raw) || raw.length === ids.length,
    'ids',
    'ids must not contain duplicates',
    'DUPLICATE_IDS',
  );

  v.assert();
  return { ids };
}

/** The admin list: a search box and a status filter, no paging. */
export function validateCareerVacancyListQuery(
  query: Record<string, unknown>,
): CareerVacancyFilters {
  const v = validator(query);
  const filters: CareerVacancyFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
    search: v.optionalString('search', { max: 120 }),
  };
  v.assert();
  return filters;
}
