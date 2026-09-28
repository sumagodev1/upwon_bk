// src/modules/knowledgebase/controllers/categories.controller.ts

import { Request, Response } from 'express';
import * as categoriesService from '../services/categories.service';
import {
  validateCreateKbCategory,
  validateKbCategoryListQuery,
  validateKbCategoryStatus,
  validateReorderKbCategories,
  validateUpdateKbCategory,
} from '../validators/categories.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllKbCategoriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateKbCategoryListQuery(req.query as Record<string, unknown>);
  const categories = await categoriesService.list(filters);
  return ApiResponse.success(res, categories, 'Knowledgebase categories retrieved successfully');
};

export const getKbCategoryByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const category = await categoriesService.getById(id);
  return ApiResponse.success(res, category, 'Knowledgebase category retrieved successfully');
};

export const createKbCategoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateKbCategory(req.body);
  const category = await categoriesService.create(dto, buildContext(req));
  return ApiResponse.created(res, category, 'Knowledgebase category added successfully');
};

export const updateKbCategoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateKbCategory(req.body);
  const category = await categoriesService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, category, 'Knowledgebase category updated successfully');
};

export const updateKbCategoryStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateKbCategoryStatus(req.body);
  const category = await categoriesService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    category,
    status === 'ACTIVE' ? 'Knowledgebase category published' : 'Knowledgebase category unpublished',
  );
};

export const reorderKbCategoriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderKbCategories(req.body);
  const categories = await categoriesService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, categories, 'Knowledgebase categories reordered successfully');
};

export const deleteKbCategoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await categoriesService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

// ── public ────────────────────────────────────────────────────────────────

/**
 * The /knowledgebase hub's cards in one read. Always a 200 - see
 * categoriesService.getPublishedIndex for how "nothing authored" is signalled.
 */
export const getPublicKbCategoriesController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const index = await categoriesService.getPublishedIndex();
  return ApiResponse.success(res, index, 'Knowledgebase categories retrieved successfully');
};
