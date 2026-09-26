// src/modules/product-pages/hreasy-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateHreasyFaqEntry,
  validateHreasyFaqEntryListQuery,
  validateHreasyFaqEntryStatus,
  validateReorderHreasyFaqEntries,
  validateUpdateHreasyFaqEntry,
} from '../validators/faq-section.validator';

/** The HREasy page's FAQ. */

export const getAllHreasyFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateHreasyFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'HREasy FAQ questions retrieved successfully');
};

export const getHreasyFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'HREasy FAQ question retrieved successfully');
};

export const createHreasyFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateHreasyFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'HREasy FAQ question created successfully');
};

export const updateHreasyFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateHreasyFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'HREasy FAQ question updated successfully');
};

export const updateHreasyFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'HREasy FAQ question activated' : 'HREasy FAQ question deactivated',
  );
};

export const reorderHreasyFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderHreasyFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'HREasy FAQ questions reordered successfully');
};

export const deleteHreasyFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicHreasyFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'HREasy FAQ section retrieved successfully');
};
