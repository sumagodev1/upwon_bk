// src/modules/industry-pages/qsr-franchise-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateQsrFranchiseHeroSlide,
  validateQsrFranchiseHeroSlideListQuery,
  validateQsrFranchiseHeroSlideStatus,
  validateReorderQsrFranchiseHeroSlides,
  validateUpdateQsrFranchiseHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The QSR & Franchise F&B page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllQsrFranchiseHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateQsrFranchiseHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'QSR & Franchise hero slides retrieved successfully');
};

export const getQsrFranchiseHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'QSR & Franchise hero slide retrieved successfully');
};

export const createQsrFranchiseHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateQsrFranchiseHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'QSR & Franchise hero slide created successfully');
};

export const updateQsrFranchiseHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateQsrFranchiseHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'QSR & Franchise hero slide updated successfully');
};

export const updateQsrFranchiseHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateQsrFranchiseHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'QSR & Franchise hero slide activated' : 'QSR & Franchise hero slide deactivated',
  );
};

export const reorderQsrFranchiseHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderQsrFranchiseHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'QSR & Franchise hero slides reordered successfully');
};

export const deleteQsrFranchiseHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicQsrFranchiseHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'QSR & Franchise hero slides retrieved successfully');
};
