// src/modules/product-pages/pos-page/controllers/video-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/video-section.service';
import {
  validateCreatePosVideoEntry,
  validatePosVideoEntryListQuery,
  validatePosVideoEntryReorder,
  validatePosVideoEntryStatus,
  validateUpdatePosVideoEntry,
} from '../validators/video-section.validator';

/** The POS page's video showcase: the copy above, and the one live clip. */

export const getAllPosVideoEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validatePosVideoEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Videos retrieved successfully');
};

export const getPosVideoEntryByIdController = async (req: Request, res: Response) => {
  const entry = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'Video retrieved successfully');
};

export const createPosVideoEntryController = async (req: Request, res: Response) => {
  const dto = validateCreatePosVideoEntry(req.body);
  const entry = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Video created successfully');
};

export const updatePosVideoEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePosVideoEntry(req.body);
  const entry = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Video updated successfully');
};

export const updatePosVideoEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validatePosVideoEntryStatus(req.body);
  const entry = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Video is now live' : 'Video taken off the page',
  );
};

export const reorderPosVideoEntriesController = async (req: Request, res: Response) => {
  const { ids } = validatePosVideoEntryReorder(req.body);
  const entries = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Videos reordered successfully');
};

export const deletePosVideoEntryController = async (req: Request, res: Response) => {
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
export const getPublicPosVideoSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Video section retrieved successfully');
};
