// src/modules/careers/controllers/vacancies.controller.ts

import { Request, Response } from 'express';
import * as vacanciesService from '../services/vacancies.service';
import {
  validateCareerVacancyListQuery,
  validateCareerVacancyStatus,
  validateCreateCareerVacancy,
  validateReorderCareerVacancies,
  validateUpdateCareerVacancy,
} from '../validators/vacancies.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllCareerVacanciesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateCareerVacancyListQuery(req.query as Record<string, unknown>);
  const vacancies = await vacanciesService.list(filters);
  return ApiResponse.success(res, vacancies, 'Vacancies retrieved successfully');
};

export const getCareerVacancyByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const vacancy = await vacanciesService.getById(id);
  return ApiResponse.success(res, vacancy, 'Vacancy retrieved successfully');
};

export const createCareerVacancyController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateCareerVacancy(req.body);
  const vacancy = await vacanciesService.create(dto, buildContext(req));
  return ApiResponse.created(res, vacancy, 'Vacancy created successfully');
};

export const updateCareerVacancyController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateCareerVacancy(req.body);
  const vacancy = await vacanciesService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, vacancy, 'Vacancy updated successfully');
};

export const updateCareerVacancyStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateCareerVacancyStatus(req.body);
  const vacancy = await vacanciesService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    vacancy,
    status === 'ACTIVE' ? 'Vacancy published' : 'Vacancy unpublished',
  );
};

export const reorderCareerVacanciesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderCareerVacancies(req.body);
  const vacancies = await vacanciesService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, vacancies, 'Vacancies reordered successfully');
};

/**
 * Answers 200 with a message rather than 204.
 *
 * Deleting a vacancy leaves its applications behind, and an administrator who
 * has just removed a role needs to be told that in words - "the applications
 * are still in the inbox" is not something a 204 can say, and it is the only
 * part of this operation that is not obvious.
 */
export const deleteCareerVacancyController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { applicationsRetained } = await vacanciesService.remove(id, buildContext(req));

  const message =
    applicationsRetained === 0
      ? 'Vacancy deleted'
      : `Vacancy deleted. ${applicationsRetained} application${
          applicationsRetained === 1 ? '' : 's'
        } for it remain in Vacancy Applications, filed under the title it was advertised with.`;

  return ApiResponse.success(res, { applicationsRetained }, message);
};

// ── public ────────────────────────────────────────────────────────────────

/**
 * The Careers page's Open Roles list: ACTIVE vacancies, in display order, in
 * the narrowed public shape. Unauthenticated - the caller is a visitor in a
 * browser.
 */
export const getPublicCareerVacanciesController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const vacancies = await vacanciesService.listPublished();
  return ApiResponse.success(res, vacancies, 'Vacancies retrieved successfully');
};
