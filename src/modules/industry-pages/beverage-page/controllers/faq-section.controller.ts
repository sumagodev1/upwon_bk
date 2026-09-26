// src/modules/industry-pages/beverage-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateBeverageFaqEntry,
  validateBeverageFaqEntryListQuery,
  validateBeverageFaqEntryStatus,
  validateReorderBeverageFaqEntries,
  validateUpdateBeverageFaqEntry,
} from '../validators/faq-section.validator';

/** The Beverages & Juices page's FAQ. */

export const getAllBeverageFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBeverageFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Beverage FAQ questions retrieved successfully');
};

export const getBeverageFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'Beverage FAQ question retrieved successfully');
};

export const createBeverageFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateBeverageFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Beverage FAQ question created successfully');
};

export const updateBeverageFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBeverageFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Beverage FAQ question updated successfully');
};

export const updateBeverageFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBeverageFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Beverage FAQ question activated' : 'Beverage FAQ question deactivated',
  );
};

export const reorderBeverageFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderBeverageFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Beverage FAQ questions reordered successfully');
};

export const deleteBeverageFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicBeverageFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'Beverage FAQ section retrieved successfully');
};
