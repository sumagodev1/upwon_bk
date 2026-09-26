// src/modules/contact-page/controllers/enquiries.controller.ts

import { Request, Response } from 'express';
import * as enquiriesService from '../services/enquiries.service';
import {
  validateContactEnquiryListQuery,
  validateCreateContactEnquiry,
} from '../validators/enquiries.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

/**
 * The public submit. Unauthenticated by necessity - see the route file.
 *
 * The published choices are loaded first so the validator can check the three
 * choice fields against what the form is offering right now; that is a service
 * call, not SQL, so this stays as thin as every other controller here.
 *
 * The response is a receipt, never the stored row: echoing it back would hand
 * an anonymous caller a confirmation of exactly what was recorded about them,
 * and give a scraper a way to probe what the column accepted.
 */
export const createPublicContactEnquiryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const choices = await enquiriesService.publishedChoices();
  const dto = validateCreateContactEnquiry(req.body, choices);
  const id = await enquiriesService.submit(dto, buildContext(req));
  return ApiResponse.created(
    res,
    { received: true, id },
    'Enquiry received. A solution lead will be in touch.',
  );
};

/** The admin inbox: newest first, searchable, with an optional date window. */
export const listContactEnquiriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateContactEnquiryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await enquiriesService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Enquiries retrieved successfully');
};

export const getContactEnquiryByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const enquiry = await enquiriesService.getById(id);
  return ApiResponse.success(res, enquiry, 'Enquiry retrieved successfully');
};

export const deleteContactEnquiryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await enquiriesService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
