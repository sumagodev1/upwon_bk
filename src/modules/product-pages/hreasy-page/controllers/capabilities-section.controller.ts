// src/modules/product-pages/hreasy-page/controllers/capabilities-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as capabilitiesService from '../services/capabilities-section.service';
import {
  validateCreateHreasyCapabilityModule,
  validateHreasyCapabilityModuleListQuery,
  validateHreasyCapabilityModuleStatus,
  validateReorderHreasyCapabilityModules,
  validateUpdateHreasyCapabilityModule,
} from '../validators/capabilities-section.validator';

/**
 * The HREasy page's lifecycle switcher.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllHreasyCapabilityModulesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateHreasyCapabilityModuleListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await capabilitiesService.list(filters, pagination);
  return ApiResponse.paginated(
    res,
    rows,
    meta,
    'HREasy capability modules retrieved successfully',
  );
};

export const getHreasyCapabilityModuleByIdController = async (req: Request, res: Response) => {
  const module = await capabilitiesService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, module, 'HREasy capability module retrieved successfully');
};

export const createHreasyCapabilityModuleController = async (req: Request, res: Response) => {
  const dto = validateCreateHreasyCapabilityModule(req.body);
  const module = await capabilitiesService.create(dto, buildContext(req));
  return ApiResponse.created(res, module, 'HREasy capability module created successfully');
};

export const updateHreasyCapabilityModuleController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateHreasyCapabilityModule(req.body);
  const module = await capabilitiesService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, module, 'HREasy capability module updated successfully');
};

export const updateHreasyCapabilityModuleStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyCapabilityModuleStatus(req.body);
  const module = await capabilitiesService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    module,
    status === 'ACTIVE'
      ? 'HREasy capability module activated'
      : 'HREasy capability module deactivated',
  );
};

export const reorderHreasyCapabilityModulesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderHreasyCapabilityModules(req.body);
  const modules = await capabilitiesService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, modules, 'HREasy capability modules reordered successfully');
};

export const deleteHreasyCapabilityModuleController = async (req: Request, res: Response) => {
  await capabilitiesService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: the section's copy and its active modules. */
export const getPublicHreasyCapabilitiesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await capabilitiesService.getPublished();
  return ApiResponse.success(
    res,
    section,
    'HREasy capabilities section retrieved successfully',
  );
};
