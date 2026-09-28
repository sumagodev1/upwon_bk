// src/modules/product-pages/wms-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateWmsHeroSlide,
  validateWmsHeroSlideListQuery,
  validateWmsHeroSlideStatus,
  validateReorderWmsHeroSlides,
  validateUpdateWmsHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The WMS page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllWmsHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWmsHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'WMS hero slides retrieved successfully');
};

export const getWmsHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'WMS hero slide retrieved successfully');
};

export const createWmsHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateWmsHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'WMS hero slide created successfully');
};

export const updateWmsHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWmsHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'WMS hero slide updated successfully');
};

export const updateWmsHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWmsHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'WMS hero slide activated' : 'WMS hero slide deactivated',
  );
};

export const reorderWmsHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderWmsHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'WMS hero slides reordered successfully');
};

export const deleteWmsHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicWmsHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'WMS hero slides retrieved successfully');
};
