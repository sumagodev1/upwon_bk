// src/modules/product-pages/fms-page/controllers/alternatives-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/alternatives-section.service';
import {
  validateCreateFmsAlternativeRow,
  validateCreateFmsAlternativesColumn,
  validateFmsAlternativesReorder,
  validateFmsAlternativesStatusBody,
  validateUpdateFmsAlternativeRow,
  validateUpdateFmsAlternativesColumn,
  validateUpsertFmsAlternativesSection,
} from '../validators/alternatives-section.validator';

/**
 * The FMS page's comparison grid: the leader column, the competitor columns,
 * and the criteria rows.
 */

// -- the leader column ------------------------------------------------------

/** Null before the grid has ever been authored - a normal first-run state. */
export const getFmsAlternativesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Comparison grid retrieved successfully');
};

export const updateFmsAlternativesSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertFmsAlternativesSection(req.body);
  const section = await service.upsertSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Comparison grid saved successfully');
};

// -- the columns ------------------------------------------------------------

export const getAllFmsAlternativesColumnsController = async (_req: Request, res: Response) => {
  const columns = await service.listColumns();
  return ApiResponse.success(res, columns, 'Columns retrieved successfully');
};

export const getFmsAlternativesColumnByIdController = async (req: Request, res: Response) => {
  const column = await service.getColumnById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, column, 'Column retrieved successfully');
};

export const createFmsAlternativesColumnController = async (req: Request, res: Response) => {
  const dto = validateCreateFmsAlternativesColumn(req.body);
  const column = await service.createColumn(dto, buildContext(req));
  return ApiResponse.created(res, column, 'Column created successfully');
};

export const updateFmsAlternativesColumnController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmsAlternativesColumn(req.body);
  const column = await service.updateColumn(id, dto, buildContext(req));
  return ApiResponse.success(res, column, 'Column updated successfully');
};

export const updateFmsAlternativesColumnStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmsAlternativesStatusBody(req.body);
  const column = await service.setColumnStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    column,
    status === 'ACTIVE' ? 'Column activated' : 'Column deactivated',
  );
};

export const reorderFmsAlternativesColumnsController = async (req: Request, res: Response) => {
  const { ids } = validateFmsAlternativesReorder(req.body);
  const columns = await service.reorderColumns(ids, buildContext(req));
  return ApiResponse.success(res, columns, 'Columns reordered successfully');
};

export const deleteFmsAlternativesColumnController = async (req: Request, res: Response) => {
  await service.removeColumn(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// -- the rows ---------------------------------------------------------------

export const getAllFmsAlternativeRowsController = async (_req: Request, res: Response) => {
  const rows = await service.listRows();
  return ApiResponse.success(res, rows, 'Rows retrieved successfully');
};

export const getFmsAlternativeRowByIdController = async (req: Request, res: Response) => {
  const row = await service.getRowById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, row, 'Row retrieved successfully');
};

export const createFmsAlternativeRowController = async (req: Request, res: Response) => {
  const dto = validateCreateFmsAlternativeRow(req.body);
  const row = await service.createRow(dto, buildContext(req));
  return ApiResponse.created(res, row, 'Row created successfully');
};

export const updateFmsAlternativeRowController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmsAlternativeRow(req.body);
  const row = await service.updateRow(id, dto, buildContext(req));
  return ApiResponse.success(res, row, 'Row updated successfully');
};

export const updateFmsAlternativeRowStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmsAlternativesStatusBody(req.body);
  const row = await service.setRowStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    row,
    status === 'ACTIVE' ? 'Row activated' : 'Row deactivated',
  );
};

export const reorderFmsAlternativeRowsController = async (req: Request, res: Response) => {
  const { ids } = validateFmsAlternativesReorder(req.body);
  const rows = await service.reorderRows(ids, buildContext(req));
  return ApiResponse.success(res, rows, 'Rows reordered successfully');
};

export const deleteFmsAlternativeRowController = async (req: Request, res: Response) => {
  await service.removeRow(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the whole grid in one response.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own table.
 */
export const getPublicFmsAlternativesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Comparison grid retrieved successfully');
};
