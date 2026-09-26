// src/modules/industry-pages/food-processing-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateFoodProcessingHeroSlide,
  validateFoodProcessingHeroSlideListQuery,
  validateFoodProcessingHeroSlideStatus,
  validateReorderFoodProcessingHeroSlides,
  validateUpdateFoodProcessingHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The Food Processing page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllFoodProcessingHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFoodProcessingHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Food Processing hero slides retrieved successfully');
};

export const getFoodProcessingHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'Food Processing hero slide retrieved successfully');
};

export const createFoodProcessingHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateFoodProcessingHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Food Processing hero slide created successfully');
};

export const updateFoodProcessingHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFoodProcessingHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Food Processing hero slide updated successfully');
};

export const updateFoodProcessingHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFoodProcessingHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Food Processing hero slide activated' : 'Food Processing hero slide deactivated',
  );
};

export const reorderFoodProcessingHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderFoodProcessingHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Food Processing hero slides reordered successfully');
};

export const deleteFoodProcessingHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicFoodProcessingHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'Food Processing hero slides retrieved successfully');
};
