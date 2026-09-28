// src/modules/product-pages/vendor-portal-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateVmsHeroSlide,
  validateVmsHeroSlideListQuery,
  validateVmsHeroSlideStatus,
  validateReorderVmsHeroSlides,
  validateUpdateVmsHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The Vendor Portal page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllVmsHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateVmsHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Vendor Portal hero slides retrieved successfully');
};

export const getVmsHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'Vendor Portal hero slide retrieved successfully');
};

export const createVmsHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateVmsHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Vendor Portal hero slide created successfully');
};

export const updateVmsHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateVmsHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Vendor Portal hero slide updated successfully');
};

export const updateVmsHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateVmsHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Vendor Portal hero slide activated' : 'Vendor Portal hero slide deactivated',
  );
};

export const reorderVmsHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderVmsHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Vendor Portal hero slides reordered successfully');
};

export const deleteVmsHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicVmsHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'Vendor Portal hero slides retrieved successfully');
};
