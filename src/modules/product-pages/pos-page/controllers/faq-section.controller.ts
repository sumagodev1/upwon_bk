// src/modules/product-pages/pos-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreatePosFaqEntry,
  validatePosFaqEntryListQuery,
  validatePosFaqEntryStatus,
  validateReorderPosFaqEntries,
  validateUpdatePosFaqEntry,
} from '../validators/faq-section.validator';

/** The POS page's FAQ. */

export const getAllPosFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validatePosFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'POS FAQ questions retrieved successfully');
};

export const getPosFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'POS FAQ question retrieved successfully');
};

export const createPosFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreatePosFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'POS FAQ question created successfully');
};

export const updatePosFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePosFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'POS FAQ question updated successfully');
};

export const updatePosFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validatePosFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'POS FAQ question activated' : 'POS FAQ question deactivated',
  );
};

export const reorderPosFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderPosFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'POS FAQ questions reordered successfully');
};

export const deletePosFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicPosFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'POS FAQ section retrieved successfully');
};
