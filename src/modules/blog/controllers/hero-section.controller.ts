// src/modules/blog/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import * as heroSectionService from '../services/hero-section.service';
import {
  validateBlogHeroSlideListQuery,
  validateBlogHeroSlideStatus,
  validateCreateBlogHeroSlide,
  validateReorderBlogHeroSlides,
  validateUpdateBlogHeroSlide,
} from '../validators/hero-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllBlogHeroSlidesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateBlogHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroSectionService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Hero slides retrieved successfully');
};

export const getBlogHeroSlideByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const slide = await heroSectionService.getById(id);
  return ApiResponse.success(res, slide, 'Hero slide retrieved successfully');
};

export const createBlogHeroSlideController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateBlogHeroSlide(req.body);
  const slide = await heroSectionService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Hero slide created successfully');
};

export const updateBlogHeroSlideController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBlogHeroSlide(req.body);
  const slide = await heroSectionService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Hero slide updated successfully');
};

export const updateBlogHeroSlideStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBlogHeroSlideStatus(req.body);
  const slide = await heroSectionService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Hero slide published' : 'Hero slide unpublished',
  );
};

export const reorderBlogHeroSlidesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderBlogHeroSlides(req.body);
  const slides = await heroSectionService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Hero slides reordered successfully');
};

export const deleteBlogHeroSlideController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await heroSectionService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read. Unauthenticated - see the public router in
 * routes/hero-section.routes.ts.
 */
export const getPublicBlogHeroSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const slides = await heroSectionService.getPublished();
  return ApiResponse.success(res, slides, 'Hero section retrieved successfully');
};
