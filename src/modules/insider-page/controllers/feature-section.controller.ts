// src/modules/insider-page/controllers/feature-section.controller.ts

import { Request, Response } from 'express';
import * as featureSectionService from '../services/feature-section.service';
import { validateReplaceInsiderFeatureSection } from '../validators/feature-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getInsiderFeatureSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await featureSectionService.get();
  return ApiResponse.success(
    res,
    section,
    section ? 'Feature section retrieved successfully' : 'Feature section has not been set up yet',
  );
};

export const replaceInsiderFeatureSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceInsiderFeatureSection(req.body);
  const section = await featureSectionService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Feature section saved successfully');
};

/**
 * The website-facing read. `data: null` is a deliberate answer - "hidden" -
 * not an absence; see featureSectionService.getPublished.
 */
export const getPublicInsiderFeatureSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await featureSectionService.getPublished();
  return ApiResponse.success(
    res,
    section,
    section ? 'Feature section retrieved successfully' : 'Feature section is hidden',
  );
};
