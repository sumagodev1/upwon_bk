// src/modules/product-pages/wms-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateWmsFaqEntry,
  validateWmsFaqEntryListQuery,
  validateWmsFaqEntryStatus,
  validateReorderWmsFaqEntries,
  validateUpdateWmsFaqEntry,
} from '../validators/faq-section.validator';

/** The WMS page's FAQ. */

export const getAllWmsFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWmsFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'WMS FAQ questions retrieved successfully');
};

export const getWmsFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'WMS FAQ question retrieved successfully');
};

export const createWmsFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateWmsFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'WMS FAQ question created successfully');
};

export const updateWmsFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWmsFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'WMS FAQ question updated successfully');
};

export const updateWmsFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWmsFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'WMS FAQ question activated' : 'WMS FAQ question deactivated',
  );
};

export const reorderWmsFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderWmsFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'WMS FAQ questions reordered successfully');
};

export const deleteWmsFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicWmsFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'WMS FAQ section retrieved successfully');
};
