// src/modules/industry-pages/fmcg-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateFmcgFaqEntry,
  validateFmcgFaqEntryListQuery,
  validateFmcgFaqEntryStatus,
  validateReorderFmcgFaqEntries,
  validateUpdateFmcgFaqEntry,
} from '../validators/faq-section.validator';

/** The FMCG Distribution page's FAQ. */

export const getAllFmcgFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmcgFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'FMCG FAQ questions retrieved successfully');
};

export const getFmcgFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'FMCG FAQ question retrieved successfully');
};

export const createFmcgFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateFmcgFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'FMCG FAQ question created successfully');
};

export const updateFmcgFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmcgFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'FMCG FAQ question updated successfully');
};

export const updateFmcgFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmcgFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'FMCG FAQ question activated' : 'FMCG FAQ question deactivated',
  );
};

export const reorderFmcgFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderFmcgFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'FMCG FAQ questions reordered successfully');
};

export const deleteFmcgFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicFmcgFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'FMCG FAQ section retrieved successfully');
};
