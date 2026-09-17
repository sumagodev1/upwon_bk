// src/modules/api-keys/controllers/api-key.controller.ts

import { Request, Response } from 'express';
import * as apiKeyService from '../services/api-key.service';
import {
  validateApiKeyListQuery,
  validateCreateApiKey,
} from '../validators/api-key.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllApiKeysController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { pagination } = validateApiKeyListQuery(req.query as Record<string, unknown>);
  const { rows, meta } = await apiKeyService.list(pagination);
  return ApiResponse.paginated(res, rows, meta, 'API keys retrieved successfully');
};

export const getApiKeyByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const apiKey = await apiKeyService.getById(id);
  return ApiResponse.success(res, apiKey, 'API key retrieved successfully');
};

export const createApiKeyController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateApiKey(req.body);
  const apiKey = await apiKeyService.create(dto, buildContext(req));
  return ApiResponse.created(
    res,
    apiKey,
    'API key created. Copy the key now - it will not be shown again.',
  );
};

export const revokeApiKeyController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await apiKeyService.revoke(id, buildContext(req));
  return ApiResponse.noContent(res);
};
