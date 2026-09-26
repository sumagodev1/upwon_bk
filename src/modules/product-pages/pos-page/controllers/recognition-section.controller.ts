// src/modules/product-pages/pos-page/controllers/recognition-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/recognition-section.service';
import {
  validateCreatePosRecognitionCategory,
  validatePosRecognitionCategoryListQuery,
  validatePosRecognitionCategoryReorder,
  validatePosRecognitionStatusBody,
  validateUpdatePosRecognitionCategory,
} from '../validators/recognition-section.validator';

/**
 * The POS page's category map: the cards naming each kind of counter.
 *
 * The icon picker is served by the proof strip's /proof-section/icons - one
 * allowlist per page, so one endpoint for it rather than a copy under every
 * section that draws an icon.
 */

export const getAllPosRecognitionCategoriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validatePosRecognitionCategoryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Categories retrieved successfully');
};

export const getPosRecognitionCategoryByIdController = async (req: Request, res: Response) => {
  const category = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, category, 'Category retrieved successfully');
};

export const createPosRecognitionCategoryController = async (req: Request, res: Response) => {
  const dto = validateCreatePosRecognitionCategory(req.body);
  const category = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, category, 'Category created successfully');
};

export const updatePosRecognitionCategoryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePosRecognitionCategory(req.body);
  const category = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, category, 'Category updated successfully');
};

export const updatePosRecognitionCategoryStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validatePosRecognitionStatusBody(req.body);
  const category = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    category,
    status === 'ACTIVE' ? 'Category activated' : 'Category deactivated',
  );
};

export const reorderPosRecognitionCategoriesController = async (req: Request, res: Response) => {
  const { ids } = validatePosRecognitionCategoryReorder(req.body);
  const categories = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, categories, 'Categories reordered successfully');
};

export const deletePosRecognitionCategoryController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicPosRecognitionSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Category map retrieved successfully');
};
