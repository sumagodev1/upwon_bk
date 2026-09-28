// src/modules/industry-pages/sweets-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateSweetsHeroSlide,
  validateSweetsHeroSlideListQuery,
  validateSweetsHeroSlideStatus,
  validateReorderSweetsHeroSlides,
  validateUpdateSweetsHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The Sweets & Namkeen page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllSweetsHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSweetsHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Sweets hero slides retrieved successfully');
};

export const getSweetsHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'Sweets hero slide retrieved successfully');
};

export const createSweetsHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateSweetsHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Sweets hero slide created successfully');
};

export const updateSweetsHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSweetsHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Sweets hero slide updated successfully');
};

export const updateSweetsHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSweetsHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Sweets hero slide activated' : 'Sweets hero slide deactivated',
  );
};

export const reorderSweetsHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderSweetsHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Sweets hero slides reordered successfully');
};

export const deleteSweetsHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicSweetsHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'Sweets hero slides retrieved successfully');
};
