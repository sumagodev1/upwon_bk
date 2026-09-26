// src/modules/industry-pages/engineering-manufacturing-page/controllers/capabilities-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/capabilities-section.service';
import {
  validateCreateEngineeringCapability,
  validateEngineeringCapabilityListQuery,
  validateEngineeringCapabilityStatus,
  validateReorderEngineeringCapabilities,
  validateUpdateEngineeringCapability,
} from '../validators/capabilities-section.validator';

/**
 * The Engineering & Manufacturing page's core capabilities.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back.
 */

export const getAllEngineeringCapabilitiesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateEngineeringCapabilityListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Capabilities retrieved successfully');
};

export const getEngineeringCapabilityByIdController = async (req: Request, res: Response) => {
  const capability = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, capability, 'Capability retrieved successfully');
};

export const createEngineeringCapabilityController = async (req: Request, res: Response) => {
  const dto = validateCreateEngineeringCapability(req.body);
  const capability = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, capability, 'Capability created successfully');
};

export const updateEngineeringCapabilityController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateEngineeringCapability(req.body);
  const capability = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, capability, 'Capability updated successfully');
};

export const updateEngineeringCapabilityStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateEngineeringCapabilityStatus(req.body);
  const capability = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    capability,
    status === 'ACTIVE' ? 'Capability activated' : 'Capability deactivated',
  );
};

export const reorderEngineeringCapabilitiesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderEngineeringCapabilities(req.body);
  const capabilities = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, capabilities, 'Capabilities reordered successfully');
};

export const deleteEngineeringCapabilityController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats that the way it treats an unreachable API, by keeping its
 * own copy.
 */
export const getPublicEngineeringCapabilitiesController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Capabilities section retrieved successfully');
};
