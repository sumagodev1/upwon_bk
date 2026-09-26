// src/modules/industry-pages/dairy-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateDairyHeroSlide,
  validateDairyHeroSlideListQuery,
  validateDairyHeroSlideStatus,
  validateReorderDairyHeroSlides,
  validateUpdateDairyHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The Dairy & Ice Cream page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllDairyHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateDairyHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Dairy & Ice Cream hero slides retrieved successfully');
};

export const getDairyHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'Dairy & Ice Cream hero slide retrieved successfully');
};

export const createDairyHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateDairyHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Dairy & Ice Cream hero slide created successfully');
};

export const updateDairyHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateDairyHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Dairy & Ice Cream hero slide updated successfully');
};

export const updateDairyHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateDairyHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Dairy & Ice Cream hero slide activated' : 'Dairy & Ice Cream hero slide deactivated',
  );
};

export const reorderDairyHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderDairyHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Dairy & Ice Cream hero slides reordered successfully');
};

export const deleteDairyHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicDairyHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'Dairy & Ice Cream hero slides retrieved successfully');
};
