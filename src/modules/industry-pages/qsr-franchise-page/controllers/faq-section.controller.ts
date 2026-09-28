// src/modules/industry-pages/qsr-franchise-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateQsrFranchiseFaqEntry,
  validateQsrFranchiseFaqEntryListQuery,
  validateQsrFranchiseFaqEntryStatus,
  validateReorderQsrFranchiseFaqEntries,
  validateUpdateQsrFranchiseFaqEntry,
} from '../validators/faq-section.validator';

/** The QSR & Franchise F&B page's FAQ. */

export const getAllQsrFranchiseFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateQsrFranchiseFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'QSR & Franchise FAQ questions retrieved successfully');
};

export const getQsrFranchiseFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'QSR & Franchise FAQ question retrieved successfully');
};

export const createQsrFranchiseFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateQsrFranchiseFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'QSR & Franchise FAQ question created successfully');
};

export const updateQsrFranchiseFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateQsrFranchiseFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'QSR & Franchise FAQ question updated successfully');
};

export const updateQsrFranchiseFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateQsrFranchiseFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'QSR & Franchise FAQ question activated' : 'QSR & Franchise FAQ question deactivated',
  );
};

export const reorderQsrFranchiseFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderQsrFranchiseFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'QSR & Franchise FAQ questions reordered successfully');
};

export const deleteQsrFranchiseFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicQsrFranchiseFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'QSR & Franchise FAQ section retrieved successfully');
};
