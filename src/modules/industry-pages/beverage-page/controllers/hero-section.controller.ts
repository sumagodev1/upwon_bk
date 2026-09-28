// src/modules/industry-pages/beverage-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateBeverageHeroSlide,
  validateBeverageHeroSlideListQuery,
  validateBeverageHeroSlideStatus,
  validateReorderBeverageHeroSlides,
  validateUpdateBeverageHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The Beverages & Juices page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllBeverageHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBeverageHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Beverage hero slides retrieved successfully');
};

export const getBeverageHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'Beverage hero slide retrieved successfully');
};

export const createBeverageHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateBeverageHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Beverage hero slide created successfully');
};

export const updateBeverageHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBeverageHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Beverage hero slide updated successfully');
};

export const updateBeverageHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBeverageHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Beverage hero slide activated' : 'Beverage hero slide deactivated',
  );
};

export const reorderBeverageHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderBeverageHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Beverage hero slides reordered successfully');
};

export const deleteBeverageHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicBeverageHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'Beverage hero slides retrieved successfully');
};
