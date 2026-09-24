// src/modules/product-pages/erp-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as heroService from '../services/hero-section.service';
import {
  validateCreateErpHeroSlide,
  validateErpHeroSlideListQuery,
  validateErpHeroSlideStatus,
  validateReorderErpHeroSlides,
  validateUpdateErpHeroSlide,
} from '../validators/hero-section.validator';

/**
 * The ERP page's hero slider.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllErpHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateErpHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'ERP hero slides retrieved successfully');
};

export const getErpHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await heroService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'ERP hero slide retrieved successfully');
};

export const createErpHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateErpHeroSlide(req.body);
  const slide = await heroService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'ERP hero slide created successfully');
};

export const updateErpHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateErpHeroSlide(req.body);
  const slide = await heroService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'ERP hero slide updated successfully');
};

export const updateErpHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpHeroSlideStatus(req.body);
  const slide = await heroService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'ERP hero slide activated' : 'ERP hero slide deactivated',
  );
};

export const reorderErpHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderErpHeroSlides(req.body);
  const slides = await heroService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'ERP hero slides reordered successfully');
};

export const deleteErpHeroSlideController = async (req: Request, res: Response) => {
  await heroService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: every active slide, in order. */
export const getPublicErpHeroSlidesController = async (_req: Request, res: Response) => {
  const slides = await heroService.getPublished();
  return ApiResponse.success(res, slides, 'ERP hero slides retrieved successfully');
};
