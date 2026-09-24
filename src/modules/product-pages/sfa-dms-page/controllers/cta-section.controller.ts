// src/modules/product-pages/sfa-dms-page/controllers/cta-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import * as service from '../services/cta-section.service';
import { validateUpsertSfaCtaSection } from '../validators/cta-section.validator';

/** The SFA-DMS page's closing band - one record, read and replaced. */

export const getSfaCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.get();
  return ApiResponse.success(res, section, 'SFA-DMS CTA section retrieved successfully');
};

export const updateSfaCtaSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertSfaCtaSection(req.body);
  const section = await service.upsert(dto, buildContext(req));
  return ApiResponse.success(res, section, 'SFA-DMS CTA section saved successfully');
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSfaCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'SFA-DMS CTA section retrieved successfully');
};
