// src/modules/industry-pages/engineering-manufacturing-page/controllers/coverage-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/coverage-section.service';
import {
  validateCreateEngineeringCoverageCategory,
  validateEngineeringCoverageCategoryListQuery,
  validateEngineeringCoverageCategoryStatus,
  validateReorderEngineeringCoverageCategories,
  validateUpdateEngineeringCoverageCategory,
  validateUpsertEngineeringCoveragePanel,
} from '../validators/coverage-section.validator';

/**
 * The Engineering & Manufacturing page's industry coverage section: the
 * background panel (one record) and the categories (a list).
 */

// The background panel.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getEngineeringCoveragePanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Coverage panel retrieved successfully');
};

export const updateEngineeringCoveragePanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertEngineeringCoveragePanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Coverage panel saved successfully');
};

// The categories.

export const getAllEngineeringCoverageCategoriesController = async (
  req: Request,
  res: Response,
) => {
  const { filters, pagination } = validateEngineeringCoverageCategoryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listCategories(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Categories retrieved successfully');
};

export const getEngineeringCoverageCategoryByIdController = async (
  req: Request,
  res: Response,
) => {
  const category = await service.getCategoryById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, category, 'Category retrieved successfully');
};

export const createEngineeringCoverageCategoryController = async (
  req: Request,
  res: Response,
) => {
  const dto = validateCreateEngineeringCoverageCategory(req.body);
  const category = await service.createCategory(dto, buildContext(req));
  return ApiResponse.created(res, category, 'Category created successfully');
};

export const updateEngineeringCoverageCategoryController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateEngineeringCoverageCategory(req.body);
  const category = await service.updateCategory(id, dto, buildContext(req));
  return ApiResponse.success(res, category, 'Category updated successfully');
};

export const updateEngineeringCoverageCategoryStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateEngineeringCoverageCategoryStatus(req.body);
  const category = await service.setCategoryStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    category,
    status === 'ACTIVE' ? 'Category activated' : 'Category deactivated',
  );
};

export const reorderEngineeringCoverageCategoriesController = async (
  req: Request,
  res: Response,
) => {
  const { ids } = validateReorderEngineeringCoverageCategories(req.body);
  const categories = await service.reorderCategories(ids, buildContext(req));
  return ApiResponse.success(res, categories, 'Categories reordered successfully');
};

export const deleteEngineeringCoverageCategoryController = async (
  req: Request,
  res: Response,
) => {
  await service.removeCategory(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats that the way it treats an unreachable API, by keeping its
 * own copy.
 */
export const getPublicEngineeringCoverageSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Coverage section retrieved successfully');
};
