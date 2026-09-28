// src/modules/clients-page/controllers/network-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import * as service from '../services/network-section.service';
import {
  validateClientsNetworkStateListQuery,
  validateClientsNetworkStateStatus,
  validateCreateClientsNetworkState,
  validateReorderClientsNetworkStates,
  validateUpdateClientsNetworkState,
} from '../validators/network-section.validator';

/** The Clients page's operational network states. */

export const getAllClientsNetworkStatesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateClientsNetworkStateListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Network states retrieved successfully');
};

export const getClientsNetworkStateByIdController = async (req: Request, res: Response) => {
  const state = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, state, 'Network state retrieved successfully');
};

export const createClientsNetworkStateController = async (req: Request, res: Response) => {
  const dto = validateCreateClientsNetworkState(req.body);
  const state = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, state, 'Network state created successfully');
};

export const updateClientsNetworkStateController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateClientsNetworkState(req.body);
  const state = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, state, 'Network state updated successfully');
};

export const updateClientsNetworkStateStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateClientsNetworkStateStatus(req.body);
  const state = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    state,
    status === 'ACTIVE' ? 'Network state published' : 'Network state unpublished',
  );
};

export const reorderClientsNetworkStatesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderClientsNetworkStates(req.body);
  const states = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, states, 'Network states reordered successfully');
};

export const deleteClientsNetworkStateController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy and every active state in one response.
 * 200 with a null body when nothing is published - the site then keeps its own.
 */
export const getPublicClientsNetworkSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Network retrieved successfully');
};
