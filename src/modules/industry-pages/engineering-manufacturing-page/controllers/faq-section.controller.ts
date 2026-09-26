// src/modules/industry-pages/engineering-manufacturing-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as faqService from '../services/faq-section.service';
import {
  validateCreateEngineeringFaqEntry,
  validateEngineeringFaqEntryListQuery,
  validateEngineeringFaqEntryStatus,
  validateReorderEngineeringFaqEntries,
  validateUpdateEngineeringFaqEntry,
} from '../validators/faq-section.validator';

/** The Engineering & Manufacturing page's FAQ. */

export const getAllEngineeringFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateEngineeringFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await faqService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Engineering FAQ questions retrieved successfully');
};

export const getEngineeringFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await faqService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'Engineering FAQ question retrieved successfully');
};

export const createEngineeringFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateEngineeringFaqEntry(req.body);
  const entry = await faqService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Engineering FAQ question created successfully');
};

export const updateEngineeringFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateEngineeringFaqEntry(req.body);
  const entry = await faqService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Engineering FAQ question updated successfully');
};

export const updateEngineeringFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateEngineeringFaqEntryStatus(req.body);
  const entry = await faqService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Engineering FAQ question activated' : 'Engineering FAQ question deactivated',
  );
};

export const reorderEngineeringFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderEngineeringFaqEntries(req.body);
  const entries = await faqService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Engineering FAQ questions reordered successfully');
};

export const deleteEngineeringFaqEntryController = async (req: Request, res: Response) => {
  await faqService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicEngineeringFaqSectionController = async (_req: Request, res: Response) => {
  const section = await faqService.getPublished();
  return ApiResponse.success(res, section, 'Engineering FAQ section retrieved successfully');
};
