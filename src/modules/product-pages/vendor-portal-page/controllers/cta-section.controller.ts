// src/modules/product-pages/vendor-portal-page/controllers/cta-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { VMS_ICON_NAMES } from '../utils/icons';
import * as service from '../services/cta-section.service';
import { validateUpsertVmsCtaSection } from '../validators/cta-section.validator';

/**
 * The Vendor Portal page's closing band.
 *
 * A singleton, so there is no list and no delete: it is read and it is
 * written whole.
 */

/** Null when the band has never been authored - a normal first-run state. */
export const getVmsCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.get();
  return ApiResponse.success(res, section, 'CTA section retrieved successfully');
};

export const upsertVmsCtaSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertVmsCtaSection(req.body);
  const section = await service.upsert(dto, buildContext(req));
  return ApiResponse.success(res, section, 'CTA section saved successfully');
};

/**
 * The icon allowlist for this page, served once here.
 *
 * The band's own buttons carry no icon - both draw the same arrow - but the
 * proof strip's metric tiles do, and one page means one allowlist. It lives
 * on this router because the band is the page's fixed, always-present
 * section; every section that draws an icon reads it from here.
 */
export const getVmsIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, [...VMS_ICON_NAMES], 'Icons retrieved successfully');

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicVmsCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'CTA section retrieved successfully');
};
