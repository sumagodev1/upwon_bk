// src/modules/product-pages/sfa-dms-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateSfaHeroSlide,
  validateSfaHeroSlideListQuery,
  validateSfaHeroSlideStatus,
  validateReorderSfaHeroSlides,
  validateUpdateSfaHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The SFA-DMS page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllSfaHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSfaHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'SFA-DMS hero slides retrieved successfully');
};

export const getSfaHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'SFA-DMS hero slide retrieved successfully');
};

export const createSfaHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateSfaHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'SFA-DMS hero slide created successfully');
};

export const updateSfaHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSfaHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'SFA-DMS hero slide updated successfully');
};

export const updateSfaHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSfaHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'SFA-DMS hero slide activated' : 'SFA-DMS hero slide deactivated',
  );
};

export const reorderSfaHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderSfaHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'SFA-DMS hero slides reordered successfully');
};

export const deleteSfaHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicSfaHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'SFA-DMS hero slides retrieved successfully');
};
