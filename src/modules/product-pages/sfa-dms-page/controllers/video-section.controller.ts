// src/modules/product-pages/sfa-dms-page/controllers/video-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/video-section.service';
import {
  validateCreateSfaVideoEntry,
  validateSfaVideoEntryListQuery,
  validateSfaVideoEntryReorder,
  validateSfaVideoEntryStatus,
  validateUpdateSfaVideoEntry,
} from '../validators/video-section.validator';

/** The SFA-DMS page's video showcase: the copy above, and the one live clip. */

export const getAllSfaVideoEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSfaVideoEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Videos retrieved successfully');
};

export const getSfaVideoEntryByIdController = async (req: Request, res: Response) => {
  const entry = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'Video retrieved successfully');
};

export const createSfaVideoEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateSfaVideoEntry(req.body);
  const entry = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Video created successfully');
};

export const updateSfaVideoEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSfaVideoEntry(req.body);
  const entry = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Video updated successfully');
};

export const updateSfaVideoEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSfaVideoEntryStatus(req.body);
  const entry = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Video is now live' : 'Video taken off the page',
  );
};

export const reorderSfaVideoEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateSfaVideoEntryReorder(req.body);
  const entries = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Videos reordered successfully');
};

export const deleteSfaVideoEntryController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy and the one live video.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSfaVideoSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Video section retrieved successfully');
};
