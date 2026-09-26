// src/modules/industry-pages/spices-agro-page/controllers/platform-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/platform-section.service';
import {
  validateSpicesAgroPlatformGroupListQuery,
  validateSpicesAgroPlatformGroupStatus,
  validateCreateSpicesAgroPlatformGroup,
  validateReorderSpicesAgroPlatformGroups,
  validateUpdateSpicesAgroPlatformGroup,
  validateUpsertSpicesAgroPlatformPanel,
} from '../validators/platform-section.validator';

/**
 * The Spices & Agro Processing page's connected platform section: the background panel
 * (one record) and the groups (a list).
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back.
 */

// The background panel.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getSpicesAgroPlatformPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Groups panel retrieved successfully');
};

export const updateSpicesAgroPlatformPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertSpicesAgroPlatformPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Groups panel saved successfully');
};

// The groups.

export const getAllSpicesAgroPlatformGroupsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSpicesAgroPlatformGroupListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Groups retrieved successfully');
};

export const getSpicesAgroPlatformGroupByIdController = async (req: Request, res: Response) => {
  const group = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, group, 'Group retrieved successfully');
};

export const createSpicesAgroPlatformGroupController = async (req: Request, res: Response) => {
  const dto = validateCreateSpicesAgroPlatformGroup(req.body);
  const group = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, group, 'Group created successfully');
};

export const updateSpicesAgroPlatformGroupController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSpicesAgroPlatformGroup(req.body);
  const group = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, group, 'Group updated successfully');
};

export const updateSpicesAgroPlatformGroupStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSpicesAgroPlatformGroupStatus(req.body);
  const group = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    group,
    status === 'ACTIVE' ? 'Group activated' : 'Group deactivated',
  );
};

export const reorderSpicesAgroPlatformGroupsController = async (
  req: Request,
  res: Response,
) => {
  const { ids } = validateReorderSpicesAgroPlatformGroups(req.body);
  const groups = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, groups, 'Groups reordered successfully');
};

export const deleteSpicesAgroPlatformGroupController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats that the way it treats an unreachable API, by keeping its
 * own copy.
 */
export const getPublicSpicesAgroPlatformSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Groups section retrieved successfully');
};
