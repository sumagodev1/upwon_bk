// src/modules/blog/controllers/categories.controller.ts

import { Request, Response } from 'express';
import * as categoriesService from '../services/categories.service';
import {
  validateBlogCategoryListQuery,
  validateBlogCategoryStatus,
  validateCreateBlogCategory,
  validateReorderBlogCategories,
  validateUpdateBlogCategory,
} from '../validators/categories.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllBlogCategoriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateBlogCategoryListQuery(req.query as Record<string, unknown>);
  const categories = await categoriesService.list(filters);
  return ApiResponse.success(res, categories, 'Blog categories retrieved successfully');
};

export const getBlogCategoryByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const category = await categoriesService.getById(id);
  return ApiResponse.success(res, category, 'Blog category retrieved successfully');
};

export const createBlogCategoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateBlogCategory(req.body);
  const category = await categoriesService.create(dto, buildContext(req));
  return ApiResponse.created(res, category, 'Blog category added successfully');
};

export const updateBlogCategoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBlogCategory(req.body);
  const category = await categoriesService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, category, 'Blog category updated successfully');
};

export const updateBlogCategoryStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBlogCategoryStatus(req.body);
  const category = await categoriesService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    category,
    status === 'ACTIVE' ? 'Blog category published' : 'Blog category unpublished',
  );
};

export const reorderBlogCategoriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderBlogCategories(req.body);
  const categories = await categoriesService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, categories, 'Blog categories reordered successfully');
};

export const deleteBlogCategoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await categoriesService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
