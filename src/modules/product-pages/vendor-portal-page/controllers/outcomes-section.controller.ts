// src/modules/product-pages/vendor-portal-page/controllers/outcomes-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/outcomes-section.service';
import {
  validateCreateVmsOutcomeVideo,
  validateUpdateVmsOutcomeVideo,
  validateVmsOutcomeStatusBody,
  validateVmsOutcomeVideoListQuery,
  validateVmsOutcomeVideoReorder,
} from '../validators/outcomes-section.validator';

/**
 * The Vendor Portal page's customer-outcome showcase.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides
 * something belongs in the service.
 */

export const getAllVmsOutcomeVideosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateVmsOutcomeVideoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Outcome videos retrieved successfully');
};

export const getVmsOutcomeVideoByIdController = async (req: Request, res: Response) => {
  const video = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, video, 'Outcome video retrieved successfully');
};

export const createVmsOutcomeVideoController = async (req: Request, res: Response) => {
  const dto = validateCreateVmsOutcomeVideo(req.body);
  const video = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, video, 'Outcome video created successfully');
};

export const updateVmsOutcomeVideoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateVmsOutcomeVideo(req.body);
  const video = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, video, 'Outcome video updated successfully');
};

export const updateVmsOutcomeVideoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateVmsOutcomeStatusBody(req.body);
  const video = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    video,
    status === 'ACTIVE' ? 'Outcome video activated' : 'Outcome video deactivated',
  );
};

export const reorderVmsOutcomeVideosController = async (req: Request, res: Response) => {
  const { ids } = validateVmsOutcomeVideoReorder(req.body);
  const videos = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, videos, 'Outcome videos reordered successfully');
};

export const deleteVmsOutcomeVideoController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicVmsOutcomesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Outcomes section retrieved successfully');
};
