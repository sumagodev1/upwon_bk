// src/modules/home-page/controllers/industries-section.controller.ts

import { Request, Response } from 'express';
import * as industriesSectionService from '../services/industries-section.service';
import {
  validateCreateIndustriesEntry,
  validateIndustriesEntryListQuery,
  validateIndustriesEntryStatus,
  validateReorderIndustriesEntries,
  validateUpdateIndustriesEntry,
} from '../validators/industries-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllIndustriesEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateIndustriesEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await industriesSectionService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Industries entries retrieved successfully');
};

export const getIndustriesEntryByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const entry = await industriesSectionService.getById(id);
  return ApiResponse.success(res, entry, 'Industries entry retrieved successfully');
};

export const createIndustriesEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateIndustriesEntry(req.body);
  const entry = await industriesSectionService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Industries entry created successfully');
};

export const updateIndustriesEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateIndustriesEntry(req.body);
  const entry = await industriesSectionService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Industries entry updated successfully');
};

export const updateIndustriesEntryStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateIndustriesEntryStatus(req.body);
  const entry = await industriesSectionService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Industries entry activated' : 'Industries entry deactivated',
  );
};

export const reorderIndustriesEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderIndustriesEntries(req.body);
  const entries = await industriesSectionService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Industries entries reordered successfully');
};

export const deleteIndustriesEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await industriesSectionService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the first active entry with a usable video.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicIndustriesSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await industriesSectionService.getPublished();
  return ApiResponse.success(res, section, 'Industries section retrieved successfully');
};
