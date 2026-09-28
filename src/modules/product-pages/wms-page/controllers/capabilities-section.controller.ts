// src/modules/product-pages/wms-page/controllers/capabilities-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/capabilities-section.service';
import {
  validateCreateWmsCapabilityModule,
  validateUpdateWmsCapabilityModule,
  validateWmsCapabilityModuleListQuery,
  validateWmsCapabilityModuleReorder,
  validateWmsCapabilityStatusBody,
} from '../validators/capabilities-section.validator';

/**
 * The WMS page's capability stack: the bands from receiving to dispatch.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides
 * something belongs in the service.
 *
 * The eyebrow, heading and subtext above the stack are not here - they are
 * served by the shared section-copy router under ('wms', 'capabilities').
 */

export const getAllWmsCapabilityModulesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWmsCapabilityModuleListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'WMS capabilities retrieved successfully');
};

export const getWmsCapabilityModuleByIdController = async (req: Request, res: Response) => {
  const module = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, module, 'WMS capability retrieved successfully');
};

export const createWmsCapabilityModuleController = async (req: Request, res: Response) => {
  const dto = validateCreateWmsCapabilityModule(req.body);
  const module = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, module, 'WMS capability created successfully');
};

export const updateWmsCapabilityModuleController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWmsCapabilityModule(req.body);
  const module = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, module, 'WMS capability updated successfully');
};

export const updateWmsCapabilityModuleStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWmsCapabilityStatusBody(req.body);
  const module = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    module,
    status === 'ACTIVE' ? 'WMS capability activated' : 'WMS capability deactivated',
  );
};

export const reorderWmsCapabilityModulesController = async (req: Request, res: Response) => {
  const { ids } = validateWmsCapabilityModuleReorder(req.body);
  const modules = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, modules, 'WMS capabilities reordered successfully');
};

export const deleteWmsCapabilityModuleController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicWmsCapabilitiesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'WMS capabilities section retrieved successfully');
};
