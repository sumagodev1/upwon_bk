// src/modules/product-pages/erp-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as trustService from '../services/trust-section.service';
import {
  validateCreateErpTrustEntry,
  validateErpTrustEntryListQuery,
  validateErpTrustEntryStatus,
  validateReorderErpTrustEntries,
  validateUpdateErpTrustEntry,
} from '../validators/trust-section.validator';

/** The ERP page's proof strip: the brand marquee and the scale counters. */

export const getAllErpTrustEntriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateErpTrustEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await trustService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'ERP trust entries retrieved successfully');
};

export const getErpTrustEntryByIdController = async (req: Request, res: Response) => {
  const entry = await trustService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, entry, 'ERP trust entry retrieved successfully');
};

export const createErpTrustEntryController = async (req: Request, res: Response) => {
  const dto = validateCreateErpTrustEntry(req.body);
  const entry = await trustService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'ERP trust entry created successfully');
};

export const updateErpTrustEntryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateErpTrustEntry(req.body);
  const entry = await trustService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'ERP trust entry updated successfully');
};

export const updateErpTrustEntryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpTrustEntryStatus(req.body);
  const entry = await trustService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'ERP trust entry activated' : 'ERP trust entry deactivated',
  );
};

export const reorderErpTrustEntriesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderErpTrustEntries(req.body);
  const entries = await trustService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'ERP trust entries reordered successfully');
};

export const deleteErpTrustEntryController = async (req: Request, res: Response) => {
  await trustService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: the copy, the marquee and the counters, merged. */
export const getPublicErpTrustSectionController = async (_req: Request, res: Response) => {
  const section = await trustService.getPublished();
  return ApiResponse.success(res, section, 'ERP trust section retrieved successfully');
};
