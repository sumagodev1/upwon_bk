// src/modules/why-upwon-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import * as service from '../services/hero-section.service';
import {
  validateCreateWhyUpwonHeroSlide,
  validateUpdateWhyUpwonHeroSlide,
  validateWhyUpwonHeroSlideListQuery,
  validateWhyUpwonHeroSlideReorder,
  validateWhyUpwonHeroStatusBody,
} from '../validators/hero-section.validator';

/**
 * The Why UpWon page's hero slider.
 *
 * A list since 082 - it was a single record before that, which made it the
 * one hero in the CMS an editor could not add a second slide to.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides
 * something belongs in the service.
 */

export const getAllWhyUpwonHeroSlidesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWhyUpwonHeroSlideListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Hero slides retrieved successfully');
};

export const getWhyUpwonHeroSlideByIdController = async (req: Request, res: Response) => {
  const slide = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slide, 'Hero slide retrieved successfully');
};

export const createWhyUpwonHeroSlideController = async (req: Request, res: Response) => {
  const dto = validateCreateWhyUpwonHeroSlide(req.body);
  const slide = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, slide, 'Hero slide created successfully');
};

export const updateWhyUpwonHeroSlideController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWhyUpwonHeroSlide(req.body);
  const slide = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'Hero slide updated successfully');
};

export const updateWhyUpwonHeroSlideStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWhyUpwonHeroStatusBody(req.body);
  const slide = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'Hero slide activated' : 'Hero slide deactivated',
  );
};

export const reorderWhyUpwonHeroSlidesController = async (req: Request, res: Response) => {
  const { ids } = validateWhyUpwonHeroSlideReorder(req.body);
  const slides = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, slides, 'Hero slides reordered successfully');
};

export const deleteWhyUpwonHeroSlideController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the published slides, in order.
 *
 * Returns 200 with an empty array when nothing is published, rather than a
 * 404 - that is a normal answer here, and the site treats it the way it
 * treats an unreachable API, by keeping the hero it ships.
 */
export const getPublicWhyUpwonHeroSectionController = async (_req: Request, res: Response) => {
  const slides = await service.getPublished();
  return ApiResponse.success(res, slides, 'Why UpWon hero retrieved successfully');
};
