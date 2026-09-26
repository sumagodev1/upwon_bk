// src/modules/partner-program/controllers/applications.controller.ts

import { Request, Response } from 'express';
import * as applicationsService from '../services/applications.service';
import {
  validateCreatePartnerApplication,
  validatePartnerApplicationListQuery,
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
export const createPublicPartnerApplicationController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreatePartnerApplication(req.body);
  const id = await applicationsService.submit(dto, buildContext(req));
  return ApiResponse.created(
    res,
    { received: true, id },
    'Application received. The partnerships team will be in touch within 2 business days.',
  );
};

/** The admin list: newest first, searchable, with an optional date window. */
export const listPartnerApplicationsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validatePartnerApplicationListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await applicationsService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Applications retrieved successfully');
};

export const getPartnerApplicationByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const application = await applicationsService.getById(id);
  return ApiResponse.success(res, application, 'Application retrieved successfully');
};

export const deletePartnerApplicationController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await applicationsService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
