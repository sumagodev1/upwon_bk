// src/modules/product-pages/fms-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateFmsHeroSlide,
  validateFmsHeroSlideListQuery,
  validateFmsHeroSlideStatus,
  validateReorderFmsHeroSlides,
  validateUpdateFmsHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The FMS page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllFmsHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmsHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'FMS hero slides retrieved successfully');
};

export const getFmsHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'FMS hero slide retrieved successfully');
};

export const createFmsHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateFmsHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'FMS hero slide created successfully');
};

export const updateFmsHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmsHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'FMS hero slide updated successfully');
};

export const updateFmsHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmsHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'FMS hero slide activated' : 'FMS hero slide deactivated',
  );
};

export const reorderFmsHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderFmsHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'FMS hero slides reordered successfully');
};

export const deleteFmsHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicFmsHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'FMS hero slides retrieved successfully');
};
