// src/modules/home-page/controllers/cta-section.controller.ts

import { Request, Response } from 'express';
import * as ctaSectionService from '../services/cta-section.service';
import { validateUpsertCtaSection } from '../validators/cta-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

/**
 * Returns the band, or 200 with a null body when it has never been authored -
 * which is what the panel's form needs to know to start empty.
 */
export const getCtaSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await ctaSectionService.get();
  return ApiResponse.success(res, section, 'CTA section retrieved successfully');
};

export const updateCtaSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateUpsertCtaSection(req.body);
  const section = await ctaSectionService.upsert(dto, buildContext(req));
  return ApiResponse.success(res, section, 'CTA section saved successfully');
};

/**
 * The website-facing read: the copy and the band, merged.
 *
 * Returns 200 with a null body when either half is missing, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicCtaSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await ctaSectionService.getPublished();
  return ApiResponse.success(res, section, 'CTA section retrieved successfully');
};
