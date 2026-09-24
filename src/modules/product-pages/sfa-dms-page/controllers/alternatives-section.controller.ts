// src/modules/product-pages/sfa-dms-page/controllers/alternatives-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/alternatives-section.service';
import {
  validateCreateSfaCapabilityRow,
  validateSfaAlternativesColumn,
  validateSfaAlternativesColumnReorder,
  validateSfaAlternativesListQuery,
  validateSfaAlternativesStatusBody,
  validateSfaCapabilityRowReorder,
  validateUpdateSfaCapabilityRow,
  validateUpsertSfaAlternativesSection,
  validateUpsertSfaSummaryRow,
} from '../validators/alternatives-section.validator';

/**
 * The SFA-DMS page's comparison grid: the leader column, the competitor
 * columns, the capability rows with their scores, and the closing summary.
 *
 * The grid is stored in the shared comparison tables under
 * ('sfa-dms', 'alternatives'), which is why the endpoints here talk about
 * capabilities and scores while the ERP page's talk about bands and cells:
 * same records, two things to author.
 */

// ── the leader column ─────────────────────────────────────────────────────

/**
 * Returns 200 with a null body when the grid has never been set up, rather
 * than a 404 - that is a normal first-run answer, and the form treats it as an
 * empty state instead of an error.
 */
export const getSfaAlternativesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Comparison grid retrieved successfully');
};

export const updateSfaAlternativesSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertSfaAlternativesSection(req.body);
  const section = await service.upsertSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Comparison grid saved successfully');
};

// ── the columns ───────────────────────────────────────────────────────────

/**
 * Not paginated. The grid holds a handful of columns by design - past six it
 * stops fitting a phone - so a page size would be a control with nothing to do.
 */
export const getAllSfaAlternativesColumnsController = async (req: Request, res: Response) => {
  validateSfaAlternativesListQuery(req.query as Record<string, unknown>);
  const columns = await service.listColumns();
  return ApiResponse.success(res, columns, 'Columns retrieved successfully');
};

export const getSfaAlternativesColumnByIdController = async (req: Request, res: Response) => {
  const column = await service.getColumnById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, column, 'Column retrieved successfully');
};

export const createSfaAlternativesColumnController = async (req: Request, res: Response) => {
  const dto = validateSfaAlternativesColumn(req.body);
  const column = await service.createColumn(dto, buildContext(req));
  return ApiResponse.created(res, column, 'Column created successfully');
};

export const updateSfaAlternativesColumnController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateSfaAlternativesColumn(req.body);
  const column = await service.updateColumn(id, dto, buildContext(req));
  return ApiResponse.success(res, column, 'Column updated successfully');
};

export const reorderSfaAlternativesColumnsController = async (req: Request, res: Response) => {
  const { ids } = validateSfaAlternativesColumnReorder(req.body);
  const columns = await service.reorderColumns(ids, buildContext(req));
  return ApiResponse.success(res, columns, 'Columns reordered successfully');
};

export const deleteSfaAlternativesColumnController = async (req: Request, res: Response) => {
  await service.removeColumn(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the capability rows ───────────────────────────────────────────────────

export const getAllSfaCapabilityRowsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSfaAlternativesListQuery(
    req.query as Record<string, unknown>,
  );
  const rows = await service.listRows(filters, pagination);
  return ApiResponse.success(res, rows, 'Capabilities retrieved successfully');
};

export const getSfaCapabilityRowByIdController = async (req: Request, res: Response) => {
  const row = await service.getRowById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, row, 'Capability retrieved successfully');
};

export const createSfaCapabilityRowController = async (req: Request, res: Response) => {
  const dto = validateCreateSfaCapabilityRow(req.body);
  const row = await service.createRow(dto, buildContext(req));
  return ApiResponse.created(res, row, 'Capability created successfully');
};

export const updateSfaCapabilityRowController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSfaCapabilityRow(req.body);
  const row = await service.updateRow(id, dto, buildContext(req));
  return ApiResponse.success(res, row, 'Capability updated successfully');
};

export const updateSfaCapabilityRowStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSfaAlternativesStatusBody(req.body);
  const row = await service.setRowStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    row,
    status === 'ACTIVE' ? 'Capability activated' : 'Capability deactivated',
  );
};

export const reorderSfaCapabilityRowsController = async (req: Request, res: Response) => {
  const { ids } = validateSfaCapabilityRowReorder(req.body);
  const rows = await service.reorderRows(ids, buildContext(req));
  return ApiResponse.success(res, rows, 'Capabilities reordered successfully');
};

export const deleteSfaCapabilityRowController = async (req: Request, res: Response) => {
  await service.removeRow(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the closing summary row ───────────────────────────────────────────────

/** Null when the grid has no closing line, which is a normal state. */
export const getSfaAlternativesSummaryController = async (_req: Request, res: Response) => {
  const summary = await service.getSummary();
  return ApiResponse.success(res, summary, 'Summary row retrieved successfully');
};

export const updateSfaAlternativesSummaryController = async (req: Request, res: Response) => {
  const dto = validateUpsertSfaSummaryRow(req.body);
  const summary = await service.upsertSummary(dto, buildContext(req));
  return ApiResponse.success(res, summary, 'Summary row saved successfully');
};

export const deleteSfaAlternativesSummaryController = async (req: Request, res: Response) => {
  await service.removeSummary(buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSfaAlternativesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Comparison grid retrieved successfully');
};
