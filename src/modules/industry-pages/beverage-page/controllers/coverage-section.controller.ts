// src/modules/industry-pages/beverage-page/controllers/coverage-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/coverage-section.service';
import {
  validateBeverageCoverageCategoryListQuery,
  validateBeverageCoverageCategoryStatus,
  validateCreateBeverageCoverageCategory,
  validateReorderBeverageCoverageCategories,
  validateUpdateBeverageCoverageCategory,
} from '../validators/coverage-section.validator';

/**
 * The Beverages & Juices page's industry coverage grid.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back.
 */

export const getAllBeverageCoverageCategoriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBeverageCoverageCategoryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Categories retrieved successfully');
};

export const getBeverageCoverageCategoryByIdController = async (req: Request, res: Response) => {
  const category = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, category, 'Category retrieved successfully');
};

export const createBeverageCoverageCategoryController = async (req: Request, res: Response) => {
  const dto = validateCreateBeverageCoverageCategory(req.body);
  const category = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, category, 'Category created successfully');
};

export const updateBeverageCoverageCategoryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBeverageCoverageCategory(req.body);
  const category = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, category, 'Category updated successfully');
};

export const updateBeverageCoverageCategoryStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBeverageCoverageCategoryStatus(req.body);
  const category = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    category,
    status === 'ACTIVE' ? 'Category activated' : 'Category deactivated',
  );
};

export const reorderBeverageCoverageCategoriesController = async (
  req: Request,
  res: Response,
) => {
  const { ids } = validateReorderBeverageCoverageCategories(req.body);
  const categories = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, categories, 'Categories reordered successfully');
};

export const deleteBeverageCoverageCategoryController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats that the way it treats an unreachable API, by keeping its
 * own copy.
 */
export const getPublicBeverageCoverageSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Coverage section retrieved successfully');
};
