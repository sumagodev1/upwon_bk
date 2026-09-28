// src/modules/knowledgebase/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import * as heroSectionService from '../services/hero-section.service';
import {
  validateCreateKbHeroSlide,
  validateKbHeroSlideListQuery,
  validateKbHeroSlideStatus,
  validateReorderKbHeroSlides,
  validateUpdateKbHeroSlide,
} from '../validators/hero-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllKbHeroSlidesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateKbHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroSectionService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Hero slides retrieved successfully');
};

export const getKbHeroSlideByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const slide = await heroSectionService.getById(id);
  return ApiResponse.success(res, slide, 'Hero slide retrieved successfully');
};

export const createKbHeroSlideController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateKbHeroSlide(req.body);
  const slide = await heroSectionService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Hero slide created successfully');
};

export const updateKbHeroSlideController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateKbHeroSlide(req.body);
  const slide = await heroSectionService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Hero slide updated successfully');
};

export const updateKbHeroSlideStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateKbHeroSlideStatus(req.body);
  const slide = await heroSectionService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Hero slide published' : 'Hero slide unpublished',
  );
};

export const reorderKbHeroSlidesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderKbHeroSlides(req.body);
  const slides = await heroSectionService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Hero slides reordered successfully');
};

export const deleteKbHeroSlideController = async (
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
export const getPublicKbHeroSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const slides = await heroSectionService.getPublished();
  return ApiResponse.success(res, slides, 'Hero section retrieved successfully');
};
