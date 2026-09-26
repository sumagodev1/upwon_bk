// src/modules/industry-pages/engineering-manufacturing-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateEngineeringHeroSlide,
  validateEngineeringHeroSlideListQuery,
  validateEngineeringHeroSlideStatus,
  validateReorderEngineeringHeroSlides,
  validateUpdateEngineeringHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The Engineering & Manufacturing page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllEngineeringHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateEngineeringHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Engineering hero slides retrieved successfully');
};

export const getEngineeringHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'Engineering hero slide retrieved successfully');
};

export const createEngineeringHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateEngineeringHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Engineering hero slide created successfully');
};

export const updateEngineeringHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateEngineeringHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Engineering hero slide updated successfully');
};

export const updateEngineeringHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateEngineeringHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Engineering hero slide activated' : 'Engineering hero slide deactivated',
  );
};

export const reorderEngineeringHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderEngineeringHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Engineering hero slides reordered successfully');
};

export const deleteEngineeringHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicEngineeringHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'Engineering hero slides retrieved successfully');
};
