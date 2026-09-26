// src/modules/industry-pages/fmcg-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateFmcgHeroSlide,
  validateFmcgHeroSlideListQuery,
  validateFmcgHeroSlideStatus,
  validateReorderFmcgHeroSlides,
  validateUpdateFmcgHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The FMCG Distribution page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllFmcgHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmcgHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'FMCG hero slides retrieved successfully');
};

export const getFmcgHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'FMCG hero slide retrieved successfully');
};

export const createFmcgHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateFmcgHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'FMCG hero slide created successfully');
};

export const updateFmcgHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmcgHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'FMCG hero slide updated successfully');
};

export const updateFmcgHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmcgHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'FMCG hero slide activated' : 'FMCG hero slide deactivated',
  );
};

export const reorderFmcgHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderFmcgHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'FMCG hero slides reordered successfully');
};

export const deleteFmcgHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicFmcgHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'FMCG hero slides retrieved successfully');
};
