// src/modules/industry-pages/engineering-manufacturing-page/controllers/cta-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import * as service from '../services/cta-section.service';
import { validateUpsertEngineeringCtaSection } from '../validators/cta-section.validator';

/** The Engineering & Manufacturing page's closing band: one record, read and replaced. */

/**
 * Returns 200 with a null body when the band has never been authored, rather
 * than a 404 - that is a normal first-run answer, and the form treats it as an
 * empty state instead of an error.
 */
export const getEngineeringCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.get();
  return ApiResponse.success(res, section, 'Engineering closing band retrieved successfully');
};

export const updateEngineeringCtaSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertEngineeringCtaSection(req.body);
  const section = await service.upsert(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Engineering closing band saved successfully');
};

/**
 * The website-facing read: the copy and the band in one call.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicEngineeringCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Engineering closing band retrieved successfully');
};
