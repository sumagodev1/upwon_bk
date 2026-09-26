// src/modules/industry-pages/bakery-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateBakeryFaqEntry,
  validateBakeryFaqEntryListQuery,
  validateBakeryFaqEntryStatus,
  validateReorderBakeryFaqEntries,
  validateUpdateBakeryFaqEntry,
} from '../validators/faq-section.validator';

/** The Bakery & Confectionery page's FAQ. */

export const getAllBakeryFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBakeryFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Bakery FAQ questions retrieved successfully');
};

export const getBakeryFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'Bakery FAQ question retrieved successfully');
};

export const createBakeryFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateBakeryFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Bakery FAQ question created successfully');
};

export const updateBakeryFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBakeryFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Bakery FAQ question updated successfully');
};

export const updateBakeryFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBakeryFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Bakery FAQ question activated' : 'Bakery FAQ question deactivated',
  );
};

export const reorderBakeryFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderBakeryFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Bakery FAQ questions reordered successfully');
};

export const deleteBakeryFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicBakeryFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'Bakery FAQ section retrieved successfully');
};
