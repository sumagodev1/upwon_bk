// src/modules/industry-pages/non-food-fmcg-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateNonFoodFmcgHeroSlide,
  validateNonFoodFmcgHeroSlideListQuery,
  validateNonFoodFmcgHeroSlideStatus,
  validateReorderNonFoodFmcgHeroSlides,
  validateUpdateNonFoodFmcgHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The Non-Food FMCG page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllNonFoodFmcgHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateNonFoodFmcgHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Non-Food FMCG hero slides retrieved successfully');
};

export const getNonFoodFmcgHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'Non-Food FMCG hero slide retrieved successfully');
};

export const createNonFoodFmcgHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateNonFoodFmcgHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Non-Food FMCG hero slide created successfully');
};

export const updateNonFoodFmcgHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateNonFoodFmcgHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Non-Food FMCG hero slide updated successfully');
};

export const updateNonFoodFmcgHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateNonFoodFmcgHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Non-Food FMCG hero slide activated' : 'Non-Food FMCG hero slide deactivated',
  );
};

export const reorderNonFoodFmcgHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderNonFoodFmcgHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Non-Food FMCG hero slides reordered successfully');
};

export const deleteNonFoodFmcgHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicNonFoodFmcgHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'Non-Food FMCG hero slides retrieved successfully');
};
