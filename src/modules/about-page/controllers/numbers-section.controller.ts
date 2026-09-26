// src/modules/about-page/controllers/numbers-section.controller.ts

import { Request, Response } from 'express';
import * as numbersSectionService from '../services/numbers-section.service';
import { validateReplaceAboutNumbersSection } from '../validators/numbers-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getAboutNumbersSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await numbersSectionService.get();
  return ApiResponse.success(
    res,
    section,
    section
      ? 'Number section retrieved successfully'
      : 'Number section has not been set up yet',
  );
};

export const replaceAboutNumbersSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceAboutNumbersSection(req.body);
  const section = await numbersSectionService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Number section saved successfully');
};

/**
 * The website-facing read: the section's copy with its ACTIVE stat cards
 * embedded, in display order. 404 while the copy has never been authored.
 */
export const getPublicAboutNumbersSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await numbersSectionService.getPublished();
  return ApiResponse.success(res, section, 'Number section retrieved successfully');
};
