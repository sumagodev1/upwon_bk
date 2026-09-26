// src/modules/about-page/controllers/discovery-calls.controller.ts

import { Request, Response } from 'express';
import * as discoveryCallsService from '../services/discovery-calls.service';
import {
  validateAboutDiscoveryCallListQuery,
  validateCreateAboutDiscoveryCall,
} from '../validators/discovery-calls.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

/**
 * The public submit. Unauthenticated by necessity - see the route file.
 *
 * The response is a receipt, never the stored row: echoing it back would hand an
 * anonymous caller a confirmation of exactly what was recorded about them, and
 * give a scraper a way to probe what the columns accepted.
 */
export const createPublicAboutDiscoveryCallController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateAboutDiscoveryCall(req.body);
  const id = await discoveryCallsService.submit(dto, buildContext(req));
  return ApiResponse.created(
    res,
    { received: true, id },
    'Request received. One of our domain leads will reach out within 4 hours to confirm your discovery call.',
  );
};

/** The admin list: newest first, searchable, with an optional date window. */
export const listAboutDiscoveryCallsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateAboutDiscoveryCallListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await discoveryCallsService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Discovery calls retrieved successfully');
};

export const getAboutDiscoveryCallByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const call = await discoveryCallsService.getById(id);
  return ApiResponse.success(res, call, 'Discovery call retrieved successfully');
};

export const deleteAboutDiscoveryCallController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await discoveryCallsService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
