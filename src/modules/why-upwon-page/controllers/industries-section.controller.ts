// src/modules/why-upwon-page/controllers/industries-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import * as service from '../services/industries-section.service';
import {
  validateCreateWhyUpwonIndustry,
  validateWhyUpwonIndustryListQuery,
  validateWhyUpwonIndustryReorder,
  validateWhyUpwonIndustryStatusBody,
  validateUpdateWhyUpwonIndustry,
} from '../validators/industries-section.validator';

/**
 * The Why UpWon page's industry trust section: one card per industry.
 */

export const getAllWhyUpwonIndustriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWhyUpwonIndustryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listIndustries(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Industries retrieved successfully');
};

export const getWhyUpwonIndustryByIdController = async (req: Request, res: Response) => {
  const industry = await service.getIndustryById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, industry, 'Industry retrieved successfully');
};

export const createWhyUpwonIndustryController = async (req: Request, res: Response) => {
  const dto = validateCreateWhyUpwonIndustry(req.body);
  const industry = await service.createIndustry(dto, buildContext(req));
  return ApiResponse.created(res, industry, 'Industry created successfully');
};

export const updateWhyUpwonIndustryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWhyUpwonIndustry(req.body);
  const industry = await service.updateIndustry(id, dto, buildContext(req));
  return ApiResponse.success(res, industry, 'Industry updated successfully');
};

export const updateWhyUpwonIndustryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWhyUpwonIndustryStatusBody(req.body);
  const industry = await service.setIndustryStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    industry,
    status === 'ACTIVE' ? 'Industry activated' : 'Industry deactivated',
  );
};

export const reorderWhyUpwonIndustriesController = async (req: Request, res: Response) => {
  const { ids } = validateWhyUpwonIndustryReorder(req.body);
  const industries = await service.reorderIndustries(ids, buildContext(req));
  return ApiResponse.success(res, industries, 'Industries reordered successfully');
};

export const deleteWhyUpwonIndustryController = async (req: Request, res: Response) => {
  await service.removeIndustry(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicWhyUpwonIndustrySectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Industry trust section retrieved successfully');
};
