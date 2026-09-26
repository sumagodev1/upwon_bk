// src/modules/blog/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import * as heroSectionService from '../services/hero-section.service';
import { validateReplaceBlogHeroSection } from '../validators/hero-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getBlogHeroSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await heroSectionService.get();
  return ApiResponse.success(
    res,
    section,
    section ? 'Blog hero retrieved successfully' : 'Blog hero has not been set up yet',
  );
};

export const replaceBlogHeroSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceBlogHeroSection(req.body);
  const section = await heroSectionService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Blog hero saved successfully');
};

/** The website-facing read. 404 while the hero has never been authored. */
export const getPublicBlogHeroSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await heroSectionService.getPublished();
  return ApiResponse.success(res, section, 'Blog hero retrieved successfully');
};
