// src/modules/product-pages/sfa-dms-page/controllers/compliance-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/compliance-section.service';
import {
  validateCreateSfaComplianceBadge,
  validateSfaComplianceBadgeListQuery,
  validateSfaComplianceBadgeReorder,
  validateSfaComplianceStatusBody,
  validateUpdateSfaComplianceBadge,
  validateUpsertSfaComplianceSection,
} from '../validators/compliance-section.validator';

/**
 * The SFA-DMS page's trust establishers: the compliance panel beside the
 * integration sphere.
 *
 * Only the panel headers and the badges are editable here. The sphere draws
 * the home page's integration logos, so it is edited on that section's screen.
 */

// ── the two panel headers ─────────────────────────────────────────────────

/**
 * Returns 200 with a null body when the panels have never been configured,
 * rather than a 404 - that is a normal first-run answer, and the form treats it
 * as an empty state instead of an error.
 */
export const getSfaComplianceSectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Compliance panels retrieved successfully');
};

export const updateSfaComplianceSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertSfaComplianceSection(req.body);
  const section = await service.upsertSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Compliance panels saved successfully');
};

// ── the badges ────────────────────────────────────────────────────────────

export const getAllSfaComplianceBadgesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSfaComplianceBadgeListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listBadges(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Badges retrieved successfully');
};

export const getSfaComplianceBadgeByIdController = async (req: Request, res: Response) => {
  const badge = await service.getBadgeById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, badge, 'Badge retrieved successfully');
};

export const createSfaComplianceBadgeController = async (req: Request, res: Response) => {
  const dto = validateCreateSfaComplianceBadge(req.body);
  const badge = await service.createBadge(dto, buildContext(req));
  return ApiResponse.created(res, badge, 'Badge created successfully');
};

export const updateSfaComplianceBadgeController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSfaComplianceBadge(req.body);
  const badge = await service.updateBadge(id, dto, buildContext(req));
  return ApiResponse.success(res, badge, 'Badge updated successfully');
};

export const updateSfaComplianceBadgeStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSfaComplianceStatusBody(req.body);
  const badge = await service.setBadgeStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    badge,
    status === 'ACTIVE' ? 'Badge activated' : 'Badge deactivated',
  );
};

export const reorderSfaComplianceBadgesController = async (req: Request, res: Response) => {
  const { ids } = validateSfaComplianceBadgeReorder(req.body);
  const badges = await service.reorderBadges(ids, buildContext(req));
  return ApiResponse.success(res, badges, 'Badges reordered successfully');
};

export const deleteSfaComplianceBadgeController = async (req: Request, res: Response) => {
  await service.removeBadge(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSfaComplianceSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Trust establishers retrieved successfully');
};
