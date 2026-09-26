// src/modules/industry-pages/spices-agro-page/controllers/coverage-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/coverage-section.service';
import {
  validateCreateSpicesAgroCoverageCategory,
  validateSpicesAgroCoverageCategoryListQuery,
  validateSpicesAgroCoverageCategoryReorder,
  validateSpicesAgroCoverageStatusBody,
  validateUpdateSpicesAgroCoverageCategory,
} from '../validators/coverage-section.validator';

/**
 * The Spices & Agro Processing page's industry coverage grid: one photo tile
 * per business category.
 *
 * Two groups of endpoints under one section, because the page renders them as
 * one band but an editor changes them independently.
 */

export const getAllSpicesAgroCoverageCategoriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSpicesAgroCoverageCategoryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listCategories(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Categories retrieved successfully');
};

export const getSpicesAgroCoverageCategoryByIdController = async (req: Request, res: Response) => {
  const category = await service.getCategoryById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, category, 'Category retrieved successfully');
};

export const createSpicesAgroCoverageCategoryController = async (req: Request, res: Response) => {
  const dto = validateCreateSpicesAgroCoverageCategory(req.body);
  const category = await service.createCategory(dto, buildContext(req));
  return ApiResponse.created(res, category, 'Category created successfully');
};

export const updateSpicesAgroCoverageCategoryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSpicesAgroCoverageCategory(req.body);
  const category = await service.updateCategory(id, dto, buildContext(req));
  return ApiResponse.success(res, category, 'Category updated successfully');
};

export const updateSpicesAgroCoverageCategoryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSpicesAgroCoverageStatusBody(req.body);
  const category = await service.setCategoryStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    category,
    status === 'ACTIVE' ? 'Category activated' : 'Category deactivated',
  );
};

export const reorderSpicesAgroCoverageCategoriesController = async (req: Request, res: Response) => {
  const { ids } = validateSpicesAgroCoverageCategoryReorder(req.body);
  const categories = await service.reorderCategories(ids, buildContext(req));
  return ApiResponse.success(res, categories, 'Categories reordered successfully');
};

export const deleteSpicesAgroCoverageCategoryController = async (req: Request, res: Response) => {
  await service.removeCategory(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSpicesAgroCoverageSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Coverage section retrieved successfully');
};
