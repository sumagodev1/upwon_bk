// src/modules/industry-pages/sweets-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateSweetsFaqEntry,
  validateSweetsFaqEntryListQuery,
  validateSweetsFaqEntryStatus,
  validateReorderSweetsFaqEntries,
  validateUpdateSweetsFaqEntry,
} from '../validators/faq-section.validator';

/** The Sweets & Namkeen page's FAQ. */

export const getAllSweetsFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSweetsFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Sweets FAQ questions retrieved successfully');
};

export const getSweetsFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'Sweets FAQ question retrieved successfully');
};

export const createSweetsFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateSweetsFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Sweets FAQ question created successfully');
};

export const updateSweetsFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSweetsFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Sweets FAQ question updated successfully');
};

export const updateSweetsFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSweetsFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Sweets FAQ question activated' : 'Sweets FAQ question deactivated',
  );
};

export const reorderSweetsFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderSweetsFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Sweets FAQ questions reordered successfully');
};

export const deleteSweetsFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSweetsFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'Sweets FAQ section retrieved successfully');
};
