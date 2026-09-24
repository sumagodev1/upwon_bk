// src/modules/product-pages/erp-page/controllers/cta-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import * as ctaService from '../services/cta-section.service';
import { validateUpsertErpCtaSection } from '../validators/cta-section.validator';

/** The ERP page's closing call to action - one record, read and replaced. */

export const getErpCtaSectionController = async (_req: Request, res: Response) => {
  const section = await ctaService.get();
  return ApiResponse.success(res, section, 'ERP CTA section retrieved successfully');
};

export const updateErpCtaSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertErpCtaSection(req.body);
  const section = await ctaService.upsert(dto, buildContext(req));
  return ApiResponse.success(res, section, 'ERP CTA section saved successfully');
};

export const getPublicErpCtaSectionController = async (_req: Request, res: Response) => {
  const section = await ctaService.getPublished();
  return ApiResponse.success(res, section, 'ERP CTA section retrieved successfully');
};
