// src/modules/industry-pages/food-processing-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateFoodProcessingFaqEntry,
  validateFoodProcessingFaqEntryListQuery,
  validateFoodProcessingFaqEntryStatus,
  validateReorderFoodProcessingFaqEntries,
  validateUpdateFoodProcessingFaqEntry,
} from '../validators/faq-section.validator';

/** The Food Processing page's FAQ. */

export const getAllFoodProcessingFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFoodProcessingFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Food Processing FAQ questions retrieved successfully');
};

export const getFoodProcessingFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'Food Processing FAQ question retrieved successfully');
};

export const createFoodProcessingFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateFoodProcessingFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Food Processing FAQ question created successfully');
};

export const updateFoodProcessingFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFoodProcessingFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Food Processing FAQ question updated successfully');
};

export const updateFoodProcessingFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFoodProcessingFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Food Processing FAQ question activated' : 'Food Processing FAQ question deactivated',
  );
};

export const reorderFoodProcessingFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderFoodProcessingFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Food Processing FAQ questions reordered successfully');
};

export const deleteFoodProcessingFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicFoodProcessingFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'Food Processing FAQ section retrieved successfully');
};
