// src/modules/industry-pages/non-food-fmcg-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateNonFoodFmcgFaqEntry,
  validateNonFoodFmcgFaqEntryListQuery,
  validateNonFoodFmcgFaqEntryStatus,
  validateReorderNonFoodFmcgFaqEntries,
  validateUpdateNonFoodFmcgFaqEntry,
} from '../validators/faq-section.validator';

/** The Non-Food FMCG page's FAQ. */

export const getAllNonFoodFmcgFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateNonFoodFmcgFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Non-Food FMCG FAQ questions retrieved successfully');
};

export const getNonFoodFmcgFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'Non-Food FMCG FAQ question retrieved successfully');
};

export const createNonFoodFmcgFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateNonFoodFmcgFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Non-Food FMCG FAQ question created successfully');
};

export const updateNonFoodFmcgFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateNonFoodFmcgFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Non-Food FMCG FAQ question updated successfully');
};

export const updateNonFoodFmcgFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateNonFoodFmcgFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Non-Food FMCG FAQ question activated' : 'Non-Food FMCG FAQ question deactivated',
  );
};

export const reorderNonFoodFmcgFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderNonFoodFmcgFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Non-Food FMCG FAQ questions reordered successfully');
};

export const deleteNonFoodFmcgFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicNonFoodFmcgFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'Non-Food FMCG FAQ section retrieved successfully');
};
