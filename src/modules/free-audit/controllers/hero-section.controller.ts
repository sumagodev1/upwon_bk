// src/modules/free-audit/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import * as heroSectionService from '../services/hero-section.service';
import {
  validateCreateFreeAuditHeroSlide,
  validateFreeAuditHeroSlideListQuery,
  validateFreeAuditHeroSlideStatus,
  validateReorderFreeAuditHeroSlides,
  validateUpdateFreeAuditHeroSlide,
} from '../validators/hero-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllFreeAuditHeroSlidesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateFreeAuditHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await heroSectionService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Hero slides retrieved successfully');
};

export const getFreeAuditHeroSlideByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const slide = await heroSectionService.getById(id);
  return ApiResponse.success(res, slide, 'Hero slide retrieved successfully');
};

export const createFreeAuditHeroSlideController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateFreeAuditHeroSlide(req.body);
  const slide = await heroSectionService.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Hero slide created successfully');
};

export const updateFreeAuditHeroSlideController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFreeAuditHeroSlide(req.body);
  const slide = await heroSectionService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Hero slide updated successfully');
};

export const updateFreeAuditHeroSlideStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFreeAuditHeroSlideStatus(req.body);
  const slide = await heroSectionService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Hero slide published' : 'Hero slide unpublished',
  );
};

export const reorderFreeAuditHeroSlidesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderFreeAuditHeroSlides(req.body);
  const slides = await heroSectionService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Hero slides reordered successfully');
};

export const deleteFreeAuditHeroSlideController = async (
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
export const getPublicFreeAuditHeroSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const slides = await heroSectionService.getPublished();
  return ApiResponse.success(res, slides, 'Hero section retrieved successfully');
};
