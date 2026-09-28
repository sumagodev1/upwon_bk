// src/modules/industry-pages/spices-agro-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateSpicesAgroHeroSlide,
  validateSpicesAgroHeroSlideListQuery,
  validateSpicesAgroHeroSlideStatus,
  validateReorderSpicesAgroHeroSlides,
  validateUpdateSpicesAgroHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The Spices & Agro Processing page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllSpicesAgroHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSpicesAgroHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Spices & Agro hero slides retrieved successfully');
};

export const getSpicesAgroHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'Spices & Agro hero slide retrieved successfully');
};

export const createSpicesAgroHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateSpicesAgroHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Spices & Agro hero slide created successfully');
};

export const updateSpicesAgroHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSpicesAgroHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Spices & Agro hero slide updated successfully');
};

export const updateSpicesAgroHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSpicesAgroHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Spices & Agro hero slide activated' : 'Spices & Agro hero slide deactivated',
  );
};

export const reorderSpicesAgroHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderSpicesAgroHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Spices & Agro hero slides reordered successfully');
};

export const deleteSpicesAgroHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicSpicesAgroHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'Spices & Agro hero slides retrieved successfully');
};
