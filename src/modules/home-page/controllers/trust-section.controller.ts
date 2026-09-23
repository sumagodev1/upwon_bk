// src/modules/home-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import * as trustSectionService from '../services/trust-section.service';
import {
  validateCreateTrustEntry,
  validateReorderTrustEntries,
  validateTrustEntryListQuery,
  validateTrustEntryStatus,
  validateUpdateTrustEntry,
} from '../validators/trust-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllTrustEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateTrustEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await trustSectionService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Trust entries retrieved successfully');
};

export const getTrustEntryByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const entry = await trustSectionService.getById(id);
  return ApiResponse.success(res, entry, 'Trust entry retrieved successfully');
};

export const createTrustEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateTrustEntry(req.body);
  const entry = await trustSectionService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Trust entry created successfully');
};

export const updateTrustEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateTrustEntry(req.body);
  const entry = await trustSectionService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Trust entry updated successfully');
};

export const updateTrustEntryStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateTrustEntryStatus(req.body);
  const entry = await trustSectionService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Trust entry activated' : 'Trust entry deactivated',
  );
};

export const reorderTrustEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderTrustEntries(req.body);
  const entries = await trustSectionService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Trust entries reordered successfully');
};

export const deleteTrustEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await trustSectionService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read.
 *
 * Folds the entries back into the one card the site renders. Returns 200 with
 * a null body when nothing is published, rather than a 404 - that is a normal
 * answer here, and the site treats it the way it treats an unreachable API, by
 * keeping its own copy.
 */
export const getPublicTrustSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await trustSectionService.getPublished();
  return ApiResponse.success(res, section, 'Trust section retrieved successfully');
};
