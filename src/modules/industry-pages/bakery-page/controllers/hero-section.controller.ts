// src/modules/industry-pages/bakery-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateBakeryHeroSlide,
  validateBakeryHeroSlideListQuery,
  validateBakeryHeroSlideStatus,
  validateReorderBakeryHeroSlides,
  validateUpdateBakeryHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The Bakery & Confectionery page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllBakeryHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBakeryHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Bakery hero slides retrieved successfully');
};

export const getBakeryHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'Bakery hero slide retrieved successfully');
};

export const createBakeryHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateBakeryHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Bakery hero slide created successfully');
};

export const updateBakeryHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBakeryHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Bakery hero slide updated successfully');
};

export const updateBakeryHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBakeryHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Bakery hero slide activated' : 'Bakery hero slide deactivated',
  );
};

export const reorderBakeryHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderBakeryHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Bakery hero slides reordered successfully');
};

export const deleteBakeryHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicBakeryHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'Bakery hero slides retrieved successfully');
};
