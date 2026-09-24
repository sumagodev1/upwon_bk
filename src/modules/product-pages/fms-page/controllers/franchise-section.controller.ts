// src/modules/product-pages/fms-page/controllers/franchise-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/franchise-section.service';
import {
  validateCreateFmsFranchiseCategory,
  validateCreateFmsFranchiseEntry,
  validateFmsFranchiseCategoryListQuery,
  validateFmsFranchiseReorder,
  validateFmsFranchiseStatusBody,
  validateUpdateFmsFranchiseCategory,
  validateUpdateFmsFranchiseEntry,
} from '../validators/franchise-section.validator';

/**
 * The franchise category map.
 *
 * The page's icon list is already served by the proof strip's controller at
 * /fms-page/proof-section/icons - it is one allowlist for the whole page, so
 * there is no second copy of it here.
 */

// -- categories -------------------------------------------------------------

export const getAllFmsFranchiseCategoriesController = async (
  req: Request,
  res: Response,
) => {
  const { filters, pagination } = validateFmsFranchiseCategoryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listCategories(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Categories retrieved successfully');
};

export const getFmsFranchiseCategoryByIdController = async (req: Request, res: Response) => {
  const category = await service.getCategoryById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, category, 'Category retrieved successfully');
};

export const createFmsFranchiseCategoryController = async (req: Request, res: Response) => {
  const dto = validateCreateFmsFranchiseCategory(req.body);
  const category = await service.createCategory(dto, buildContext(req));
  return ApiResponse.created(res, category, 'Category created successfully');
};

export const updateFmsFranchiseCategoryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmsFranchiseCategory(req.body);
  const category = await service.updateCategory(id, dto, buildContext(req));
  return ApiResponse.success(res, category, 'Category updated successfully');
};

export const updateFmsFranchiseCategoryStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmsFranchiseStatusBody(req.body);
  const category = await service.setCategoryStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    category,
    status === 'ACTIVE' ? 'Category activated' : 'Category deactivated',
  );
};

export const reorderFmsFranchiseCategoriesController = async (
  req: Request,
  res: Response,
) => {
  const { ids } = validateFmsFranchiseReorder(req.body);
  const rows = await service.reorderCategories(ids, buildContext(req));
  return ApiResponse.success(res, rows, 'Categories reordered successfully');
};

export const deleteFmsFranchiseCategoryController = async (req: Request, res: Response) => {
  await service.removeCategory(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// -- steps and benefits, nested under their category ------------------------

/**
 * Both child lists take the same seven handlers, so they are built once and
 * bound to a service - the noun only changes what the success message says.
 *
 * Which list a request reaches is decided by the route it came in on, never
 * by anything in the request itself.
 */
const entryControllers = (entries: typeof service.steps, noun: 'Step' | 'Benefit') => {
  const plural = `${noun}s`;

  return {
    list: async (req: Request, res: Response) => {
      const rows = await entries.list(validateUuidParam(req.params.id));
      return ApiResponse.success(res, rows, `${plural} retrieved successfully`);
    },

    getById: async (req: Request, res: Response) => {
      const row = await entries.getById(
        validateUuidParam(req.params.id),
        validateUuidParam(req.params.entryId),
      );
      return ApiResponse.success(res, row, `${noun} retrieved successfully`);
    },

    create: async (req: Request, res: Response) => {
      const categoryId = validateUuidParam(req.params.id);
      const dto = validateCreateFmsFranchiseEntry(req.body);
      const row = await entries.create(categoryId, dto, buildContext(req));
      return ApiResponse.created(res, row, `${noun} created successfully`);
    },

    update: async (req: Request, res: Response) => {
      const categoryId = validateUuidParam(req.params.id);
      const entryId = validateUuidParam(req.params.entryId);
      const dto = validateUpdateFmsFranchiseEntry(req.body);
      const row = await entries.update(categoryId, entryId, dto, buildContext(req));
      return ApiResponse.success(res, row, `${noun} updated successfully`);
    },

    setStatus: async (req: Request, res: Response) => {
      const categoryId = validateUuidParam(req.params.id);
      const entryId = validateUuidParam(req.params.entryId);
      const { status } = validateFmsFranchiseStatusBody(req.body);
      const row = await entries.setStatus(categoryId, entryId, status, buildContext(req));
      return ApiResponse.success(
        res,
        row,
        status === 'ACTIVE' ? `${noun} activated` : `${noun} deactivated`,
      );
    },

    reorder: async (req: Request, res: Response) => {
      const categoryId = validateUuidParam(req.params.id);
      const { ids } = validateFmsFranchiseReorder(req.body);
      const rows = await entries.reorder(categoryId, ids, buildContext(req));
      return ApiResponse.success(res, rows, `${plural} reordered successfully`);
    },

    remove: async (req: Request, res: Response) => {
      await entries.remove(
        validateUuidParam(req.params.id),
        validateUuidParam(req.params.entryId),
        buildContext(req),
      );
      return ApiResponse.noContent(res);
    },
  };
};

export const stepControllers = entryControllers(service.steps, 'Step');
export const benefitControllers = entryControllers(service.benefits, 'Benefit');

/**
 * The website-facing read: the whole section in one response.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicFmsFranchiseSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Franchise categories retrieved successfully');
};
