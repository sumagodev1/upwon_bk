// src/modules/why-upwon-page/controllers/results-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import { WHY_UPWON_ICON_NAMES } from '../utils/icons';
import * as service from '../services/results-section.service';
import {
  validateWhyUpwonResultListQuery,
  validateWhyUpwonResultStatus,
  validateCreateWhyUpwonResult,
  validateReorderWhyUpwonResults,
  validateUpdateWhyUpwonResult,
  validateUpsertWhyUpwonResultsPanel,
} from '../validators/results-section.validator';

/**
 * The Why UpWon page's core results: the visuals panel
 * (one record) and the results (a list).
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. The icon names the picker offers
 * are served here too - this is the page's first icon section.
 */

/** The icon names the picker offers, which are exactly what the validator accepts. */
export const getWhyUpwonResultsIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, WHY_UPWON_ICON_NAMES, 'Icons retrieved successfully');

// The visuals panel.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getWhyUpwonResultsPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Results panel retrieved successfully');
};

export const updateWhyUpwonResultsPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertWhyUpwonResultsPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Results panel saved successfully');
};

// The results.

export const getAllWhyUpwonResultsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWhyUpwonResultListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Results retrieved successfully');
};

export const getWhyUpwonResultByIdController = async (req: Request, res: Response) => {
  const result = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, result, 'Result retrieved successfully');
};

export const createWhyUpwonResultController = async (req: Request, res: Response) => {
  const dto = validateCreateWhyUpwonResult(req.body);
  const result = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, result, 'Result created successfully');
};

export const updateWhyUpwonResultController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWhyUpwonResult(req.body);
  const result = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, result, 'Result updated successfully');
};

export const updateWhyUpwonResultStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWhyUpwonResultStatus(req.body);
  const result = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    result,
    status === 'ACTIVE' ? 'Result activated' : 'Result deactivated',
  );
};

export const reorderWhyUpwonResultsController = async (
  req: Request,
  res: Response,
) => {
  const { ids } = validateReorderWhyUpwonResults(req.body);
  const results = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, results, 'Results reordered successfully');
};

export const deleteWhyUpwonResultController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats that the way it treats an unreachable API, by keeping its
 * own copy.
 */
export const getPublicWhyUpwonResultsSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Results section retrieved successfully');
};
