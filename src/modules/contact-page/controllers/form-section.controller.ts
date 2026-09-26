// src/modules/contact-page/controllers/form-section.controller.ts

import { Request, Response } from 'express';
import * as formSectionService from '../services/form-section.service';
import { validateReplaceContactFormSection } from '../validators/form-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getContactFormSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await formSectionService.get();
  return ApiResponse.success(
    res,
    section,
    section ? 'Enquiry form retrieved successfully' : 'Enquiry form has not been set up yet',
  );
};

export const replaceContactFormSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceContactFormSection(req.body);
  const section = await formSectionService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Enquiry form saved successfully');
};

/** The website-facing read. 404 while nothing has been authored. */
export const getPublicContactFormSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await formSectionService.getPublished();
  return ApiResponse.success(res, section, 'Enquiry form retrieved successfully');
};
