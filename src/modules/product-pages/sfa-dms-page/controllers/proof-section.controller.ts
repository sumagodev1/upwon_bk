// src/modules/product-pages/sfa-dms-page/controllers/proof-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/proof-section.service';
import {
  validateCreateSfaProofLogo,
  validateCreateSfaProofStat,
  validateSfaProofLogoListQuery,
  validateSfaProofLogoReorder,
  validateSfaProofStatListQuery,
  validateSfaProofStatReorder,
  validateSfaProofStatusBody,
  validateUpdateSfaProofLogo,
  validateUpdateSfaProofStat,
  validateUpsertSfaProofPanel,
} from '../validators/proof-section.validator';

/**
 * The SFA-DMS page's proof section: the card, its logos and the numbers.
 *
 * Three groups of endpoints under one section, because the page renders them
 * as one band but an editor changes them independently.
 */

// ── the left card ─────────────────────────────────────────────────────────

/**
 * Returns 200 with a null body when the card has never been authored, rather
 * than a 404 - that is a normal first-run answer, and the form treats it as an
 * empty state instead of an error.
 */
export const getSfaProofPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Proof panel retrieved successfully');
};

export const upsertSfaProofPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertSfaProofPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Proof panel saved successfully');
};

// ── the customer logos ────────────────────────────────────────────────────

export const getAllSfaProofLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSfaProofLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Logos retrieved successfully');
};

export const getSfaProofLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Logo retrieved successfully');
};

export const createSfaProofLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateSfaProofLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Logo created successfully');
};

export const updateSfaProofLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSfaProofLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Logo updated successfully');
};

export const updateSfaProofLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSfaProofStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Logo activated' : 'Logo deactivated',
  );
};

export const reorderSfaProofLogosController = async (req: Request, res: Response) => {
  const { ids } = validateSfaProofLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Logos reordered successfully');
};

export const deleteSfaProofLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the numbers ───────────────────────────────────────────────────────────

export const getAllSfaProofStatsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSfaProofStatListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStats(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Statistics retrieved successfully');
};

export const getSfaProofStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'Statistic retrieved successfully');
};

export const createSfaProofStatController = async (req: Request, res: Response) => {
  const dto = validateCreateSfaProofStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Statistic created successfully');
};

export const updateSfaProofStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSfaProofStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Statistic updated successfully');
};

export const updateSfaProofStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSfaProofStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Statistic activated' : 'Statistic deactivated',
  );
};

export const reorderSfaProofStatsController = async (req: Request, res: Response) => {
  const { ids } = validateSfaProofStatReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Statistics reordered successfully');
};

export const deleteSfaProofStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSfaProofSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Proof section retrieved successfully');
};
