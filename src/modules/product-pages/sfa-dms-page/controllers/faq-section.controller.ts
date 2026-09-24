// src/modules/product-pages/sfa-dms-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateSfaFaqEntry,
  validateSfaFaqEntryListQuery,
  validateSfaFaqEntryStatus,
  validateReorderSfaFaqEntries,
  validateUpdateSfaFaqEntry,
} from '../validators/faq-section.validator';

/** The SFA-DMS page's FAQ. */

export const getAllSfaFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSfaFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'SFA-DMS FAQ questions retrieved successfully');
};

export const getSfaFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'SFA-DMS FAQ question retrieved successfully');
};

export const createSfaFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateSfaFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'SFA-DMS FAQ question created successfully');
};

export const updateSfaFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSfaFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'SFA-DMS FAQ question updated successfully');
};

export const updateSfaFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSfaFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'SFA-DMS FAQ question activated' : 'SFA-DMS FAQ question deactivated',
  );
};

export const reorderSfaFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderSfaFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'SFA-DMS FAQ questions reordered successfully');
};

export const deleteSfaFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSfaFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'SFA-DMS FAQ section retrieved successfully');
};
