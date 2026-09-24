// src/modules/product-pages/fms-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateFmsFaqEntry,
  validateFmsFaqEntryListQuery,
  validateFmsFaqEntryStatus,
  validateReorderFmsFaqEntries,
  validateUpdateFmsFaqEntry,
} from '../validators/faq-section.validator';

/** The FMS page's FAQ. */

export const getAllFmsFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmsFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'FMS FAQ questions retrieved successfully');
};

export const getFmsFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'FMS FAQ question retrieved successfully');
};

export const createFmsFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateFmsFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'FMS FAQ question created successfully');
};

export const updateFmsFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmsFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'FMS FAQ question updated successfully');
};

export const updateFmsFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmsFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'FMS FAQ question activated' : 'FMS FAQ question deactivated',
  );
};

export const reorderFmsFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderFmsFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'FMS FAQ questions reordered successfully');
};

export const deleteFmsFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicFmsFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'FMS FAQ section retrieved successfully');
};
