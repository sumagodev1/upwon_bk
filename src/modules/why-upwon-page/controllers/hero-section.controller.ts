// src/modules/why-upwon-page/controllers/hero-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import * as service from '../services/hero-section.service';
import { validateUpsertWhyUpwonHeroSection } from '../validators/hero-section.validator';

/** The Why UpWon page's hero: one record, read and replaced. */

/**
 * Returns 200 with a null body when the hero has never been authored, rather
 * than a 404 - that is a normal first-run answer, and the form treats it as an
 * empty state instead of an error.
 */
export const getWhyUpwonHeroSectionController = async (_req: Request, res: Response) => {
  const section = await service.get();
  return ApiResponse.success(res, section, 'Why UpWon hero retrieved successfully');
};

export const updateWhyUpwonHeroSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertWhyUpwonHeroSection(req.body);
  const section = await service.upsert(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Why UpWon hero saved successfully');
};

/**
 * The website-facing read: the copy and the hero in one call.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicWhyUpwonHeroSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Why UpWon hero retrieved successfully');
};
