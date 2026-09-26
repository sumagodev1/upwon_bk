// src/modules/product-pages/pos-page/controllers/alternatives-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/alternatives-section.service';
import {
  validateCreatePosAlternativeRow,
  validateCreatePosAlternativesColumn,
  validatePosAlternativesReorder,
  validatePosAlternativesStatusBody,
  validateUpdatePosAlternativeRow,
  validateUpdatePosAlternativesColumn,
  validateUpsertPosAlternativesSection,
} from '../validators/alternatives-section.validator';

/**
 * The POS page's comparison grid: the leader column, the competitor columns,
 * and the criteria rows.
 */

// -- the leader column ------------------------------------------------------

/** Null before the grid has ever been authored - a normal first-run state. */
export const getPosAlternativesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Comparison grid retrieved successfully');
};

export const updatePosAlternativesSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertPosAlternativesSection(req.body);
  const section = await service.upsertSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Comparison grid saved successfully');
};

// -- the columns ------------------------------------------------------------

export const getAllPosAlternativesColumnsController = async (_req: Request, res: Response) => {
  const columns = await service.listColumns();
  return ApiResponse.success(res, columns, 'Columns retrieved successfully');
};

export const getPosAlternativesColumnByIdController = async (req: Request, res: Response) => {
  const column = await service.getColumnById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, column, 'Column retrieved successfully');
};

export const createPosAlternativesColumnController = async (req: Request, res: Response) => {
  const dto = validateCreatePosAlternativesColumn(req.body);
  const column = await service.createColumn(dto, buildContext(req));
  return ApiResponse.created(res, column, 'Column created successfully');
};

export const updatePosAlternativesColumnController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePosAlternativesColumn(req.body);
  const column = await service.updateColumn(id, dto, buildContext(req));
  return ApiResponse.success(res, column, 'Column updated successfully');
};

export const updatePosAlternativesColumnStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validatePosAlternativesStatusBody(req.body);
  const column = await service.setColumnStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    column,
    status === 'ACTIVE' ? 'Column activated' : 'Column deactivated',
  );
};

export const reorderPosAlternativesColumnsController = async (req: Request, res: Response) => {
  const { ids } = validatePosAlternativesReorder(req.body);
  const columns = await service.reorderColumns(ids, buildContext(req));
  return ApiResponse.success(res, columns, 'Columns reordered successfully');
};

export const deletePosAlternativesColumnController = async (req: Request, res: Response) => {
  await service.removeColumn(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// -- the rows ---------------------------------------------------------------

export const getAllPosAlternativeRowsController = async (_req: Request, res: Response) => {
  const rows = await service.listRows();
  return ApiResponse.success(res, rows, 'Rows retrieved successfully');
};

export const getPosAlternativeRowByIdController = async (req: Request, res: Response) => {
  const row = await service.getRowById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, row, 'Row retrieved successfully');
};

export const createPosAlternativeRowController = async (req: Request, res: Response) => {
  const dto = validateCreatePosAlternativeRow(req.body);
  const row = await service.createRow(dto, buildContext(req));
  return ApiResponse.created(res, row, 'Row created successfully');
};

export const updatePosAlternativeRowController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePosAlternativeRow(req.body);
  const row = await service.updateRow(id, dto, buildContext(req));
  return ApiResponse.success(res, row, 'Row updated successfully');
};

export const updatePosAlternativeRowStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validatePosAlternativesStatusBody(req.body);
  const row = await service.setRowStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    row,
    status === 'ACTIVE' ? 'Row activated' : 'Row deactivated',
  );
};

export const reorderPosAlternativeRowsController = async (req: Request, res: Response) => {
  const { ids } = validatePosAlternativesReorder(req.body);
  const rows = await service.reorderRows(ids, buildContext(req));
  return ApiResponse.success(res, rows, 'Rows reordered successfully');
};

export const deletePosAlternativeRowController = async (req: Request, res: Response) => {
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
export const getPublicPosAlternativesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Comparison grid retrieved successfully');
};
