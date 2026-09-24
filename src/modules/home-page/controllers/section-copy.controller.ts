// src/modules/home-page/controllers/section-copy.controller.ts

import { Request, Response } from 'express';
import * as sectionCopyService from '../services/section-copy.service';
import {
  validateSectionKeyParams,
  validateUpsertSectionCopy,
} from '../validators/section-copy.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

/**
 * Returns the section's copy, or 200 with a null body when it has never been
 * authored - which is what the panel's form needs to know to start empty.
 */
export const getSectionCopyController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { pageKey, sectionKey } = validateSectionKeyParams(
    req.params.pageKey,
    req.params.sectionKey,
  );
  const copy = await sectionCopyService.get(pageKey, sectionKey);
  return ApiResponse.success(res, copy, 'Section copy retrieved successfully');
};

export const updateSectionCopyController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { pageKey, sectionKey } = validateSectionKeyParams(
    req.params.pageKey,
    req.params.sectionKey,
  );
  const dto = validateUpsertSectionCopy(req.body);
  const copy = await sectionCopyService.upsert(pageKey, sectionKey, dto, buildContext(req));
  return ApiResponse.success(res, copy, 'Section copy saved successfully');
};
