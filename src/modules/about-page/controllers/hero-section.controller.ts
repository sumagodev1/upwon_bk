// src/modules/about-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import * as heroSectionService from '../services/hero-section.service';
import { validateReplaceAboutHeroSection } from '../validators/hero-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getAboutHeroSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await heroSectionService.get();
  return ApiResponse.success(
    res,
    section,
    section ? 'Hero section retrieved successfully' : 'Hero section has not been set up yet',
  );
};

export const replaceAboutHeroSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceAboutHeroSection(req.body);
  const section = await heroSectionService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Hero section saved successfully');
};

/** The website-facing read. 404 while nothing has been authored. */
export const getPublicAboutHeroSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await heroSectionService.getPublished();
  return ApiResponse.success(res, section, 'Hero section retrieved successfully');
};
