// src/modules/product-pages/vendor-portal-page/controllers/faq-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/faq-section.service';
import {
  validateCreateVmsFaqEntry,
  validateUpdateVmsFaqEntry,
  validateVmsFaqEntryListQuery,
  validateVmsFaqEntryReorder,
  validateVmsFaqStatusBody,
} from '../validators/faq-section.validator';

/**
 * The Vendor Portal page's FAQ.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides
 * something belongs in the service.
 */

export const getAllVmsFaqEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateVmsFaqEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'FAQ entries retrieved successfully');
};

export const getVmsFaqEntryByIdController = async (req: Request, res: Response) => {
  const entry = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'FAQ entry retrieved successfully');
};

export const createVmsFaqEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateVmsFaqEntry(req.body);
  const entry = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'FAQ entry created successfully');
};

export const updateVmsFaqEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateVmsFaqEntry(req.body);
  const entry = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'FAQ entry updated successfully');
};

export const updateVmsFaqEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateVmsFaqStatusBody(req.body);
  const entry = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'FAQ entry activated' : 'FAQ entry deactivated',
  );
};

export const reorderVmsFaqEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateVmsFaqEntryReorder(req.body);
  const entries = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'FAQ entries reordered successfully');
};

export const deleteVmsFaqEntryController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicVmsFaqSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'FAQ section retrieved successfully');
};
