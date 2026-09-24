// src/modules/home-page/controllers/integrations-section.controller.ts

import { Request, Response } from 'express';
import * as integrationsSectionService from '../services/integrations-section.service';
import {
  validateCreateIntegrationsEntry,
  validateIntegrationsEntryListQuery,
  validateIntegrationsEntryStatus,
  validateReorderIntegrationsEntries,
  validateUpdateIntegrationsEntry,
} from '../validators/integrations-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllIntegrationsEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateIntegrationsEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await integrationsSectionService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Integration logos retrieved successfully');
};

export const getIntegrationsEntryByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const entry = await integrationsSectionService.getById(id);
  return ApiResponse.success(res, entry, 'Integration logo retrieved successfully');
};

export const createIntegrationsEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateIntegrationsEntry(req.body);
  const entry = await integrationsSectionService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Integration logo created successfully');
};

export const updateIntegrationsEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateIntegrationsEntry(req.body);
  const entry = await integrationsSectionService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Integration logo updated successfully');
};

export const updateIntegrationsEntryStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateIntegrationsEntryStatus(req.body);
  const entry = await integrationsSectionService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Integration logo activated' : 'Integration logo deactivated',
  );
};

export const reorderIntegrationsEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderIntegrationsEntries(req.body);
  const entries = await integrationsSectionService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Integration logos reordered successfully');
};

export const deleteIntegrationsEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await integrationsSectionService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy and centre logo from the first active
 * entry, and every active entry whose logo still resolves.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicIntegrationsSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await integrationsSectionService.getPublished();
  return ApiResponse.success(res, section, 'Integrations section retrieved successfully');
};
