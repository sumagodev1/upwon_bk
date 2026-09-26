// src/modules/contact-page/controllers/contact-details.controller.ts

import { Request, Response } from 'express';
import * as contactDetailsService from '../services/contact-details.service';
import { validateReplaceContactDetailsSection } from '../validators/contact-details.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getContactDetailsSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await contactDetailsService.get();
  return ApiResponse.success(
    res,
    section,
    section
      ? 'Contact details retrieved successfully'
      : 'Contact details have not been set up yet',
  );
};

export const replaceContactDetailsSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceContactDetailsSection(req.body);
  const section = await contactDetailsService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Contact details saved successfully');
};

/** The website-facing read. 404 while nothing has been authored. */
export const getPublicContactDetailsSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await contactDetailsService.getPublished();
  return ApiResponse.success(res, section, 'Contact details retrieved successfully');
};
