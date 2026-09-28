// src/modules/industry-pages/dairy-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateDairyFaqEntry,
  validateDairyFaqEntryListQuery,
  validateDairyFaqEntryStatus,
  validateReorderDairyFaqEntries,
  validateUpdateDairyFaqEntry,
} from '../validators/faq-section.validator';

/** The Dairy & Ice Cream page's FAQ. */

export const getAllDairyFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateDairyFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Dairy & Ice Cream FAQ questions retrieved successfully');
};

export const getDairyFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'Dairy & Ice Cream FAQ question retrieved successfully');
};

export const createDairyFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateDairyFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Dairy & Ice Cream FAQ question created successfully');
};

export const updateDairyFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateDairyFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Dairy & Ice Cream FAQ question updated successfully');
};

export const updateDairyFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateDairyFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Dairy & Ice Cream FAQ question activated' : 'Dairy & Ice Cream FAQ question deactivated',
  );
};

export const reorderDairyFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderDairyFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Dairy & Ice Cream FAQ questions reordered successfully');
};

export const deleteDairyFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicDairyFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'Dairy & Ice Cream FAQ section retrieved successfully');
};
