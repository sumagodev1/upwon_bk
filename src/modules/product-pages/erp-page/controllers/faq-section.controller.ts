// src/modules/product-pages/erp-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateErpFaqEntry,
  validateErpFaqEntryListQuery,
  validateErpFaqEntryStatus,
  validateReorderErpFaqEntries,
  validateUpdateErpFaqEntry,
} from '../validators/faq-section.validator';

/** The ERP page's FAQ. */

export const getAllErpFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateErpFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'ERP FAQ questions retrieved successfully');
};

export const getErpFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'ERP FAQ question retrieved successfully');
};

export const createErpFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateErpFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'ERP FAQ question created successfully');
};

export const updateErpFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateErpFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'ERP FAQ question updated successfully');
};

export const updateErpFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'ERP FAQ question activated' : 'ERP FAQ question deactivated',
  );
};

export const reorderErpFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderErpFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'ERP FAQ questions reordered successfully');
};

export const deleteErpFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicErpFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'ERP FAQ section retrieved successfully');
};
