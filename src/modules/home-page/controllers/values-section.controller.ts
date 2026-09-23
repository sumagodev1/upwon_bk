// src/modules/home-page/controllers/values-section.controller.ts

import { Request, Response } from 'express';
import * as valuesSectionService from '../services/values-section.service';
import {
  validateCreateValuesEntry,
  validateReorderValuesEntries,
  validateUpdateValuesEntry,
  validateValuesEntryListQuery,
  validateValuesEntryStatus,
} from '../validators/values-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllValuesEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateValuesEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await valuesSectionService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Values cards retrieved successfully');
};

export const getValuesEntryByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const entry = await valuesSectionService.getById(id);
  return ApiResponse.success(res, entry, 'Values card retrieved successfully');
};

export const createValuesEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateValuesEntry(req.body);
  const entry = await valuesSectionService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Values card created successfully');
};

export const updateValuesEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateValuesEntry(req.body);
  const entry = await valuesSectionService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Values card updated successfully');
};

export const updateValuesEntryStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateValuesEntryStatus(req.body);
  const entry = await valuesSectionService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Values card activated' : 'Values card deactivated',
  );
};

export const reorderValuesEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderValuesEntries(req.body);
  const entries = await valuesSectionService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Values cards reordered successfully');
};

export const deleteValuesEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await valuesSectionService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy from the first active card, and the grid
 * of every active card that still has an image.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicValuesSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await valuesSectionService.getPublished();
  return ApiResponse.success(res, section, 'Values section retrieved successfully');
};
