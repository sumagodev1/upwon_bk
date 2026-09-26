// src/modules/about-page/controllers/team-section.controller.ts

import { Request, Response } from 'express';
import * as teamSectionService from '../services/team-section.service';
import { validateReplaceAboutTeamSection } from '../validators/team-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getAboutTeamSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await teamSectionService.get();
  return ApiResponse.success(
    res,
    section,
    section
      ? 'People section retrieved successfully'
      : 'People section has not been set up yet',
  );
};

export const replaceAboutTeamSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceAboutTeamSection(req.body);
  const section = await teamSectionService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'People section saved successfully');
};

/**
 * The website-facing read: the section's copy with its ACTIVE people embedded, in
 * display order. 404 while the copy has never been authored.
 */
export const getPublicAboutTeamSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await teamSectionService.getPublished();
  return ApiResponse.success(res, section, 'People section retrieved successfully');
};
