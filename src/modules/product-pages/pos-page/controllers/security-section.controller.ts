// src/modules/product-pages/pos-page/controllers/security-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/security-section.service';
import {
  validateCreatePosSecurityAssurance,
  validateCreatePosSecurityBadge,
  validateCreatePosSecurityLogo,
  validatePosSecurityAssuranceReorder,
  validatePosSecurityBadgeReorder,
  validatePosSecurityListQuery,
  validatePosSecurityLogoReorder,
  validatePosSecurityStatusBody,
  validateUpdatePosSecurityAssurance,
  validateUpdatePosSecurityBadge,
  validateUpdatePosSecurityLogo,
  validateUpsertPosSecuritySection,
} from '../validators/security-section.validator';

/**
 * The POS page's security band.
 *
 * Four groups of endpoints under one section, because the page renders them
 * as one band but an editor changes them independently: the furniture, the
 * compliance badges, the sphere's marks and the assurances.
 *
 * The icon picker is served by the proof strip's /proof-section/icons - one
 * allowlist per page, so one endpoint for it.
 */

// The furniture.

export const getPosSecuritySectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Security section retrieved successfully');
};

export const savePosSecuritySectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertPosSecuritySection(req.body);
  const section = await service.saveSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Security section saved successfully');
};

// The compliance badges.

export const getAllPosSecurityBadgesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validatePosSecurityListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listBadges(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Badges retrieved successfully');
};

export const getPosSecurityBadgeByIdController = async (req: Request, res: Response) => {
  const badge = await service.getBadgeById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, badge, 'Badge retrieved successfully');
};

export const createPosSecurityBadgeController = async (req: Request, res: Response) => {
  const dto = validateCreatePosSecurityBadge(req.body);
  const badge = await service.createBadge(dto, buildContext(req));
  return ApiResponse.created(res, badge, 'Badge created successfully');
};

export const updatePosSecurityBadgeController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePosSecurityBadge(req.body);
  const badge = await service.updateBadge(id, dto, buildContext(req));
  return ApiResponse.success(res, badge, 'Badge updated successfully');
};

export const updatePosSecurityBadgeStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validatePosSecurityStatusBody(req.body);
  const badge = await service.setBadgeStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    badge,
    status === 'ACTIVE' ? 'Badge activated' : 'Badge deactivated',
  );
};

export const reorderPosSecurityBadgesController = async (req: Request, res: Response) => {
  const { ids } = validatePosSecurityBadgeReorder(req.body);
  const badges = await service.reorderBadges(ids, buildContext(req));
  return ApiResponse.success(res, badges, 'Badges reordered successfully');
};

export const deletePosSecurityBadgeController = async (req: Request, res: Response) => {
  await service.removeBadge(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The sphere's marks.

export const getAllPosSecurityLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validatePosSecurityListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Logos retrieved successfully');
};

export const getPosSecurityLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Logo retrieved successfully');
};

export const createPosSecurityLogoController = async (req: Request, res: Response) => {
  const dto = validateCreatePosSecurityLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Logo created successfully');
};

export const updatePosSecurityLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePosSecurityLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Logo updated successfully');
};

export const updatePosSecurityLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validatePosSecurityStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Logo activated' : 'Logo deactivated',
  );
};

export const reorderPosSecurityLogosController = async (req: Request, res: Response) => {
  const { ids } = validatePosSecurityLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Logos reordered successfully');
};

export const deletePosSecurityLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The assurances.

export const getAllPosSecurityAssurancesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validatePosSecurityListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listAssurances(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Assurances retrieved successfully');
};

export const getPosSecurityAssuranceByIdController = async (req: Request, res: Response) => {
  const assurance = await service.getAssuranceById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, assurance, 'Assurance retrieved successfully');
};

export const createPosSecurityAssuranceController = async (req: Request, res: Response) => {
  const dto = validateCreatePosSecurityAssurance(req.body);
  const assurance = await service.createAssurance(dto, buildContext(req));
  return ApiResponse.created(res, assurance, 'Assurance created successfully');
};

export const updatePosSecurityAssuranceController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePosSecurityAssurance(req.body);
  const assurance = await service.updateAssurance(id, dto, buildContext(req));
  return ApiResponse.success(res, assurance, 'Assurance updated successfully');
};

export const updatePosSecurityAssuranceStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validatePosSecurityStatusBody(req.body);
  const assurance = await service.setAssuranceStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    assurance,
    status === 'ACTIVE' ? 'Assurance activated' : 'Assurance deactivated',
  );
};

export const reorderPosSecurityAssurancesController = async (req: Request, res: Response) => {
  const { ids } = validatePosSecurityAssuranceReorder(req.body);
  const assurances = await service.reorderAssurances(ids, buildContext(req));
  return ApiResponse.success(res, assurances, 'Assurances reordered successfully');
};

export const deletePosSecurityAssuranceController = async (req: Request, res: Response) => {
  await service.removeAssurance(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicPosSecuritySectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Security band retrieved successfully');
};
