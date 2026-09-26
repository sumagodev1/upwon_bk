// src/modules/product-pages/hreasy-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateHreasyHeroSlide,
  validateHreasyHeroSlideListQuery,
  validateHreasyHeroSlideStatus,
  validateReorderHreasyHeroSlides,
  validateUpdateHreasyHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The HREasy page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllHreasyHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateHreasyHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'HREasy hero slides retrieved successfully');
};

export const getHreasyHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'HREasy hero slide retrieved successfully');
};

export const createHreasyHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateHreasyHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'HREasy hero slide created successfully');
};

export const updateHreasyHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateHreasyHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'HREasy hero slide updated successfully');
};

export const updateHreasyHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'HREasy hero slide activated' : 'HREasy hero slide deactivated',
  );
};

export const reorderHreasyHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderHreasyHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'HREasy hero slides reordered successfully');
};

export const deleteHreasyHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicHreasyHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'HREasy hero slides retrieved successfully');
};
