// src/modules/free-audit/controllers/applications.controller.ts

import { Request, Response } from 'express';
import * as applicationsService from '../services/applications.service';
import {
  validateCreateFreeAuditApplication,
  validateFreeAuditApplicationListQuery,
} from '../validators/applications.validator';
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
export const createPublicFreeAuditApplicationController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateFreeAuditApplication(req.body);
  const id = await applicationsService.submit(dto, buildContext(req));
  return ApiResponse.created(
    res,
    { received: true, id },
    'Request received. We will be in touch to schedule your free operational audit.',
  );
};

/** The admin list: newest first, searchable, with an optional date window. */
export const listFreeAuditApplicationsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateFreeAuditApplicationListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await applicationsService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Free audit applications retrieved successfully');
};

export const getFreeAuditApplicationByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const application = await applicationsService.getById(id);
  return ApiResponse.success(res, application, 'Free audit application retrieved successfully');
};

export const deleteFreeAuditApplicationController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await applicationsService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
