// src/modules/industry-pages/bakery-page/controllers/helps-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/helps-section.service';
import {
  validateBakeryHelpVisualListQuery,
  validateBakeryHelpVisualStatus,
  validateCreateBakeryHelpVisual,
  validateReorderBakeryHelpVisuals,
  validateUpdateBakeryHelpVisual,
} from '../validators/helps-section.validator';

/** The Bakery & Confectionery page's How UpWON Helps diagrams. */

export const getAllBakeryHelpVisualsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBakeryHelpVisualListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Bakery diagrams retrieved successfully');
};

export const getBakeryHelpVisualByIdController = async (req: Request, res: Response) => {
  const visual = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, visual, 'Bakery diagram retrieved successfully');
};

export const createBakeryHelpVisualController = async (req: Request, res: Response) => {
  const dto = validateCreateBakeryHelpVisual(req.body);
  const visual = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, visual, 'Bakery diagram created successfully');
};

export const updateBakeryHelpVisualController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBakeryHelpVisual(req.body);
  const visual = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, visual, 'Bakery diagram updated successfully');
};

export const updateBakeryHelpVisualStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBakeryHelpVisualStatus(req.body);
  const visual = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    visual,
    status === 'ACTIVE' ? 'Bakery diagram is now live' : 'Bakery diagram deactivated',
  );
};

export const reorderBakeryHelpVisualsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderBakeryHelpVisuals(req.body);
  const visuals = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, visuals, 'Bakery diagrams reordered successfully');
};

export const deleteBakeryHelpVisualController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicBakeryHelpsSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Bakery How UpWON Helps section retrieved successfully');
};
