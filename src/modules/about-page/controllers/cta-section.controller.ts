// src/modules/about-page/controllers/cta-section.controller.ts

import { Request, Response } from 'express';
import * as ctaSectionService from '../services/cta-section.service';
import { validateReplaceAboutCtaSection } from '../validators/cta-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getAboutCtaSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await ctaSectionService.get();
  return ApiResponse.success(
    res,
    section,
    section ? 'CTA section retrieved successfully' : 'CTA section has not been set up yet',
  );
};

export const replaceAboutCtaSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceAboutCtaSection(req.body);
  const section = await ctaSectionService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'CTA section saved successfully');
};

/** The website-facing read. 404 while nothing has been authored. */
export const getPublicAboutCtaSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await ctaSectionService.getPublished();
  return ApiResponse.success(res, section, 'CTA section retrieved successfully');
};
