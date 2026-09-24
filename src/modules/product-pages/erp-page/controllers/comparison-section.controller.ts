// src/modules/product-pages/erp-page/controllers/comparison-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/comparison-section.service';
import { validateErpStatusBody } from '../validators/recognition-section.validator';
import {
  validateComparisonReorder,
  validateCreateComparisonCategory,
  validateCreateComparisonColumn,
  validateCreateComparisonRow,
  validateUpdateComparisonCategory,
  validateUpdateComparisonColumn,
  validateUpdateComparisonRow,
  validateUpsertComparisonSection,
} from '../validators/comparison-section.validator';

// ── the section ───────────────────────────────────────────────────────────

export const getComparisonSectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Comparison section retrieved successfully');
};

export const saveComparisonSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertComparisonSection(req.body);
  const section = await service.saveSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Comparison section saved successfully');
};

// ── columns ───────────────────────────────────────────────────────────────

export const getAllComparisonColumnsController = async (_req: Request, res: Response) => {
  const columns = await service.listColumns();
  return ApiResponse.success(res, columns, 'Columns retrieved successfully');
};

export const getComparisonColumnByIdController = async (req: Request, res: Response) => {
  const column = await service.getColumnById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, column, 'Column retrieved successfully');
};

export const createComparisonColumnController = async (req: Request, res: Response) => {
  const dto = validateCreateComparisonColumn(req.body);
  const column = await service.createColumn(dto, buildContext(req));
  return ApiResponse.created(res, column, 'Column created successfully');
};

export const updateComparisonColumnController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateComparisonColumn(req.body);
  const column = await service.updateColumn(id, dto, buildContext(req));
  return ApiResponse.success(res, column, 'Column updated successfully');
};

export const updateComparisonColumnStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpStatusBody(req.body);
  const column = await service.setColumnStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    column,
    status === 'ACTIVE' ? 'Column activated' : 'Column deactivated',
  );
};

export const reorderComparisonColumnsController = async (req: Request, res: Response) => {
  const { ids } = validateComparisonReorder(req.body);
  const columns = await service.reorderColumns(ids, buildContext(req));
  return ApiResponse.success(res, columns, 'Columns reordered successfully');
};

export const deleteComparisonColumnController = async (req: Request, res: Response) => {
  await service.removeColumn(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── categories ────────────────────────────────────────────────────────────

export const getAllComparisonCategoriesController = async (_req: Request, res: Response) => {
  const categories = await service.listCategories();
  return ApiResponse.success(res, categories, 'Bands retrieved successfully');
};

export const getComparisonCategoryByIdController = async (req: Request, res: Response) => {
  const category = await service.getCategoryById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, category, 'Band retrieved successfully');
};

export const createComparisonCategoryController = async (req: Request, res: Response) => {
  const dto = validateCreateComparisonCategory(req.body);
  const category = await service.createCategory(dto, buildContext(req));
  return ApiResponse.created(res, category, 'Band created successfully');
};

export const updateComparisonCategoryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateComparisonCategory(req.body);
  const category = await service.updateCategory(id, dto, buildContext(req));
  return ApiResponse.success(res, category, 'Band updated successfully');
};

export const updateComparisonCategoryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpStatusBody(req.body);
  const category = await service.setCategoryStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    category,
    status === 'ACTIVE' ? 'Band activated' : 'Band deactivated',
  );
};

export const reorderComparisonCategoriesController = async (req: Request, res: Response) => {
  const { ids } = validateComparisonReorder(req.body);
  const categories = await service.reorderCategories(ids, buildContext(req));
  return ApiResponse.success(res, categories, 'Bands reordered successfully');
};

export const deleteComparisonCategoryController = async (req: Request, res: Response) => {
  await service.removeCategory(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── rows, nested under their band ─────────────────────────────────────────

export const getComparisonRowsController = async (req: Request, res: Response) => {
  const rows = await service.listRows(validateUuidParam(req.params.id));
  return ApiResponse.success(res, rows, 'Rows retrieved successfully');
};

export const getComparisonRowByIdController = async (req: Request, res: Response) => {
  const row = await service.getRowById(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.rowId),
  );
  return ApiResponse.success(res, row, 'Row retrieved successfully');
};

export const createComparisonRowController = async (req: Request, res: Response) => {
  const categoryId = validateUuidParam(req.params.id);
  const dto = validateCreateComparisonRow(req.body);
  const row = await service.createRow(categoryId, dto, buildContext(req));
  return ApiResponse.created(res, row, 'Row created successfully');
};

export const updateComparisonRowController = async (req: Request, res: Response) => {
  const categoryId = validateUuidParam(req.params.id);
  const rowId = validateUuidParam(req.params.rowId);
  const dto = validateUpdateComparisonRow(req.body);
  const row = await service.updateRow(categoryId, rowId, dto, buildContext(req));
  return ApiResponse.success(res, row, 'Row updated successfully');
};

export const updateComparisonRowStatusController = async (req: Request, res: Response) => {
  const categoryId = validateUuidParam(req.params.id);
  const rowId = validateUuidParam(req.params.rowId);
  const { status } = validateErpStatusBody(req.body);
  const row = await service.setRowStatus(categoryId, rowId, status, buildContext(req));
  return ApiResponse.success(
    res,
    row,
    status === 'ACTIVE' ? 'Row activated' : 'Row deactivated',
  );
};

export const reorderComparisonRowsController = async (req: Request, res: Response) => {
  const categoryId = validateUuidParam(req.params.id);
  const { ids } = validateComparisonReorder(req.body);
  const rows = await service.reorderRows(categoryId, ids, buildContext(req));
  return ApiResponse.success(res, rows, 'Rows reordered successfully');
};

export const deleteComparisonRowController = async (req: Request, res: Response) => {
  await service.removeRow(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.rowId),
    buildContext(req),
  );
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the whole grid in one response.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicComparisonSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Comparison retrieved successfully');
};
