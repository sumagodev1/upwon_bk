// src/modules/home-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import * as faqSectionService from '../services/faq-section.service';
import {
  validateCreateFaqEntry,
  validateFaqEntryListQuery,
  validateFaqEntryStatus,
  validateReorderFaqEntries,
  validateUpdateFaqEntry,
} from '../validators/faq-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllFaqEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqSectionService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'FAQ questions retrieved successfully');
};

export const getFaqEntryByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const entry = await faqSectionService.getById(id);
  return ApiResponse.success(res, entry, 'FAQ question retrieved successfully');
};

export const createFaqEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateFaqEntry(req.body);
  const entry = await faqSectionService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'FAQ question created successfully');
};

export const updateFaqEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFaqEntry(req.body);
  const entry = await faqSectionService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'FAQ question updated successfully');
};

export const updateFaqEntryStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFaqEntryStatus(req.body);
  const entry = await faqSectionService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'FAQ question activated' : 'FAQ question deactivated',
  );
};

export const reorderFaqEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderFaqEntries(req.body);
  const entries = await faqSectionService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'FAQ questions reordered successfully');
};

export const deleteFaqEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await faqSectionService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy from the first active question, and the
 * accordion of every active question.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicFaqSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await faqSectionService.getPublished();
  return ApiResponse.success(res, section, 'FAQ section retrieved successfully');
};
