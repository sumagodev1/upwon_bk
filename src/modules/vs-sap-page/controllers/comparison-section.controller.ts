// src/modules/vs-sap-page/controllers/comparison-section.controller.ts

import { Request, Response } from 'express';
import * as comparisonSectionService from '../services/comparison-section.service';
import { validateReplaceVsSapComparisonSection } from '../validators/comparison-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getVsSapComparisonSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await comparisonSectionService.get();
  return ApiResponse.success(
    res,
    section,
    section
      ? 'Capability comparison section retrieved successfully'
      : 'Capability comparison section has not been set up yet',
  );
};

export const replaceVsSapComparisonSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceVsSapComparisonSection(req.body);
  const section = await comparisonSectionService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Capability comparison section saved successfully');
};

/**
 * The website-facing read: the table's copy and TCO row with its ACTIVE
 * capability rows embedded, in display order. 404 while the copy has never
 * been authored.
 */
export const getPublicVsSapComparisonSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await comparisonSectionService.getPublished();
  return ApiResponse.success(
    res,
    section,
    'Capability comparison section retrieved successfully',
  );
};
