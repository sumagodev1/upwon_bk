// src/modules/industry-pages/spices-agro-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateSpicesAgroFaqEntry,
  validateSpicesAgroFaqEntryListQuery,
  validateSpicesAgroFaqEntryStatus,
  validateReorderSpicesAgroFaqEntries,
  validateUpdateSpicesAgroFaqEntry,
} from '../validators/faq-section.validator';

/** The Spices & Agro Processing page's FAQ. */

export const getAllSpicesAgroFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSpicesAgroFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Spices & Agro FAQ questions retrieved successfully');
};

export const getSpicesAgroFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'Spices & Agro FAQ question retrieved successfully');
};

export const createSpicesAgroFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateSpicesAgroFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Spices & Agro FAQ question created successfully');
};

export const updateSpicesAgroFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSpicesAgroFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Spices & Agro FAQ question updated successfully');
};

export const updateSpicesAgroFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSpicesAgroFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Spices & Agro FAQ question activated' : 'Spices & Agro FAQ question deactivated',
  );
};

export const reorderSpicesAgroFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderSpicesAgroFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Spices & Agro FAQ questions reordered successfully');
};

export const deleteSpicesAgroFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSpicesAgroFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'Spices & Agro FAQ section retrieved successfully');
};
