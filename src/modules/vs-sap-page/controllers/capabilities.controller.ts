// src/modules/vs-sap-page/controllers/capabilities.controller.ts

import { Request, Response } from 'express';
import * as capabilitiesService from '../services/capabilities.service';
import {
  validateCreateVsSapCapability,
  validateReorderVsSapCapabilities,
  validateUpdateVsSapCapability,
  validateVsSapCapabilityListQuery,
  validateVsSapCapabilityStatus,
} from '../validators/capabilities.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllVsSapCapabilitiesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateVsSapCapabilityListQuery(req.query as Record<string, unknown>);
  const capabilities = await capabilitiesService.list(filters);
  return ApiResponse.success(res, capabilities, 'Capabilities retrieved successfully');
};

export const getVsSapCapabilityByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const capability = await capabilitiesService.getById(id);
  return ApiResponse.success(res, capability, 'Capability retrieved successfully');
};

export const createVsSapCapabilityController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateVsSapCapability(req.body);
  const capability = await capabilitiesService.create(dto, buildContext(req));
  return ApiResponse.created(res, capability, 'Capability added successfully');
};

export const updateVsSapCapabilityController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateVsSapCapability(req.body);
  const capability = await capabilitiesService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, capability, 'Capability updated successfully');
};

export const updateVsSapCapabilityStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateVsSapCapabilityStatus(req.body);
  const capability = await capabilitiesService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    capability,
    status === 'ACTIVE' ? 'Capability published' : 'Capability unpublished',
  );
};

export const reorderVsSapCapabilitiesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderVsSapCapabilities(req.body);
  const capabilities = await capabilitiesService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, capabilities, 'Capabilities reordered successfully');
};

export const deleteVsSapCapabilityController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await capabilitiesService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
