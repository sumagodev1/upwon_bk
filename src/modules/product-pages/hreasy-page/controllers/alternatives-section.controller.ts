// src/modules/product-pages/hreasy-page/controllers/alternatives-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as alternativesService from '../services/alternatives-section.service';
import {
  validateCreateHreasyAlternativeRow,
  validateCreateHreasyAlternativesColumn,
  validateHreasyAlternativesReorder,
  validateHreasyAlternativesStatusBody,
  validateUpdateHreasyAlternativeRow,
  validateUpdateHreasyAlternativesColumn,
  validateUpsertHreasyAlternativesSection,
} from '../validators/alternatives-section.validator';

/**
 * The HREasy page's comparison grid.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

// ── the leader column ─────────────────────────────────────────────────────

export const getHreasyAlternativesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await alternativesService.getSection();
  return ApiResponse.success(res, section, 'HREasy comparison grid retrieved successfully');
};

export const updateHreasyAlternativesSectionController = async (
  req: Request,
  res: Response,
) => {
  const dto = validateUpsertHreasyAlternativesSection(req.body);
  const section = await alternativesService.upsertSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'HREasy comparison grid updated successfully');
};

// ── the columns ───────────────────────────────────────────────────────────

export const getAllHreasyAlternativesColumnsController = async (
  _req: Request,
  res: Response,
) => {
  const columns = await alternativesService.listColumns();
  return ApiResponse.success(res, columns, 'HREasy comparison columns retrieved successfully');
};

export const getHreasyAlternativesColumnByIdController = async (
  req: Request,
  res: Response,
) => {
  const column = await alternativesService.getColumnById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, column, 'HREasy comparison column retrieved successfully');
};

export const createHreasyAlternativesColumnController = async (
  req: Request,
  res: Response,
) => {
  const dto = validateCreateHreasyAlternativesColumn(req.body);
  const column = await alternativesService.createColumn(dto, buildContext(req));
  return ApiResponse.created(res, column, 'HREasy comparison column created successfully');
};

export const updateHreasyAlternativesColumnController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateHreasyAlternativesColumn(req.body);
  const column = await alternativesService.updateColumn(id, dto, buildContext(req));
  return ApiResponse.success(res, column, 'HREasy comparison column updated successfully');
};

export const updateHreasyAlternativesColumnStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyAlternativesStatusBody(req.body);
  const column = await alternativesService.setColumnStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    column,
    status === 'ACTIVE' ? 'Comparison column activated' : 'Comparison column deactivated',
  );
};

export const reorderHreasyAlternativesColumnsController = async (
  req: Request,
  res: Response,
) => {
  const { ids } = validateHreasyAlternativesReorder(req.body);
  const columns = await alternativesService.reorderColumns(ids, buildContext(req));
  return ApiResponse.success(res, columns, 'HREasy comparison columns reordered successfully');
};

export const deleteHreasyAlternativesColumnController = async (
  req: Request,
  res: Response,
) => {
  await alternativesService.removeColumn(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the rows ──────────────────────────────────────────────────────────────

export const getAllHreasyAlternativeRowsController = async (_req: Request, res: Response) => {
  const rows = await alternativesService.listRows();
  return ApiResponse.success(res, rows, 'HREasy comparison rows retrieved successfully');
};

export const getHreasyAlternativeRowByIdController = async (req: Request, res: Response) => {
  const row = await alternativesService.getRowById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, row, 'HREasy comparison row retrieved successfully');
};

export const createHreasyAlternativeRowController = async (req: Request, res: Response) => {
  const dto = validateCreateHreasyAlternativeRow(req.body);
  const row = await alternativesService.createRow(dto, buildContext(req));
  return ApiResponse.created(res, row, 'HREasy comparison row created successfully');
};

export const updateHreasyAlternativeRowController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateHreasyAlternativeRow(req.body);
  const row = await alternativesService.updateRow(id, dto, buildContext(req));
  return ApiResponse.success(res, row, 'HREasy comparison row updated successfully');
};

export const updateHreasyAlternativeRowStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyAlternativesStatusBody(req.body);
  const row = await alternativesService.setRowStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    row,
    status === 'ACTIVE' ? 'Comparison row activated' : 'Comparison row deactivated',
  );
};

export const reorderHreasyAlternativeRowsController = async (req: Request, res: Response) => {
  const { ids } = validateHreasyAlternativesReorder(req.body);
  const rows = await alternativesService.reorderRows(ids, buildContext(req));
  return ApiResponse.success(res, rows, 'HREasy comparison rows reordered successfully');
};

export const deleteHreasyAlternativeRowController = async (req: Request, res: Response) => {
  await alternativesService.removeRow(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: the whole grid in one response. */
export const getPublicHreasyAlternativesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await alternativesService.getPublished();
  return ApiResponse.success(res, section, 'HREasy alternatives section retrieved successfully');
};
