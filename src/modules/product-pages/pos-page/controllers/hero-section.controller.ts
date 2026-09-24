// src/modules/product-pages/pos-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreatePosHeroSlide,
  validatePosHeroSlideListQuery,
  validatePosHeroSlideStatus,
  validateReorderPosHeroSlides,
  validateUpdatePosHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The POS page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllPosHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validatePosHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'POS hero slides retrieved successfully');
};

export const getPosHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'POS hero slide retrieved successfully');
};

export const createPosHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreatePosHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'POS hero slide created successfully');
};

export const updatePosHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePosHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'POS hero slide updated successfully');
};

export const updatePosHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validatePosHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'POS hero slide activated' : 'POS hero slide deactivated',
  );
};

export const reorderPosHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderPosHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'POS hero slides reordered successfully');
};

export const deletePosHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicPosHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'POS hero slides retrieved successfully');
};
