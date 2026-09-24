// src/modules/product-pages/erp-page/controllers/recognition-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import { ERP_ICON_NAMES } from '../utils/icons';
import * as service from '../services/recognition-section.service';
import {
  validateCreateErpIndustry,
  validateCreateErpIndustryBenefit,
  validateCreateErpIndustryFeature,
  validateErpIndustryListQuery,
  validateErpReorder,
  validateErpStatusBody,
  validateUpdateErpIndustry,
  validateUpdateErpIndustryBenefit,
  validateUpdateErpIndustryFeature,
} from '../validators/recognition-section.validator';

/**
 * The icons an administrator may pick.
 *
 * Served rather than duplicated as a constant in the panel, so the picker can
 * never offer a name the server would reject.
 */
export const getErpIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, ERP_ICON_NAMES, 'Available icons retrieved successfully');

// ── industries ────────────────────────────────────────────────────────────

export const getAllErpIndustriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateErpIndustryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listIndustries(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Industries retrieved successfully');
};

export const getErpIndustryByIdController = async (req: Request, res: Response) => {
  const industry = await service.getIndustryById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, industry, 'Industry retrieved successfully');
};

export const createErpIndustryController = async (req: Request, res: Response) => {
  const dto = validateCreateErpIndustry(req.body);
  const industry = await service.createIndustry(dto, buildContext(req));
  return ApiResponse.created(res, industry, 'Industry created successfully');
};

export const updateErpIndustryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateErpIndustry(req.body);
  const industry = await service.updateIndustry(id, dto, buildContext(req));
  return ApiResponse.success(res, industry, 'Industry updated successfully');
};

export const updateErpIndustryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpStatusBody(req.body);
  const industry = await service.setIndustryStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    industry,
    status === 'ACTIVE' ? 'Industry activated' : 'Industry deactivated',
  );
};

export const reorderErpIndustriesController = async (req: Request, res: Response) => {
  const { ids } = validateErpReorder(req.body);
  const rows = await service.reorderIndustries(ids, buildContext(req));
  return ApiResponse.success(res, rows, 'Industries reordered successfully');
};

export const deleteErpIndustryController = async (req: Request, res: Response) => {
  await service.removeIndustry(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── features, nested under their industry ─────────────────────────────────

export const getErpIndustryFeaturesController = async (req: Request, res: Response) => {
  const features = await service.listFeatures(validateUuidParam(req.params.id));
  return ApiResponse.success(res, features, 'Features retrieved successfully');
};

export const getErpIndustryFeatureByIdController = async (req: Request, res: Response) => {
  const feature = await service.getFeatureById(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.featureId),
  );
  return ApiResponse.success(res, feature, 'Feature retrieved successfully');
};

export const createErpIndustryFeatureController = async (req: Request, res: Response) => {
  const industryId = validateUuidParam(req.params.id);
  const dto = validateCreateErpIndustryFeature(req.body);
  const feature = await service.createFeature(industryId, dto, buildContext(req));
  return ApiResponse.created(res, feature, 'Feature created successfully');
};

export const updateErpIndustryFeatureController = async (req: Request, res: Response) => {
  const industryId = validateUuidParam(req.params.id);
  const featureId = validateUuidParam(req.params.featureId);
  const dto = validateUpdateErpIndustryFeature(req.body);
  const feature = await service.updateFeature(industryId, featureId, dto, buildContext(req));
  return ApiResponse.success(res, feature, 'Feature updated successfully');
};

export const updateErpIndustryFeatureStatusController = async (req: Request, res: Response) => {
  const industryId = validateUuidParam(req.params.id);
  const featureId = validateUuidParam(req.params.featureId);
  const { status } = validateErpStatusBody(req.body);
  const feature = await service.setFeatureStatus(
    industryId,
    featureId,
    status,
    buildContext(req),
  );
  return ApiResponse.success(
    res,
    feature,
    status === 'ACTIVE' ? 'Feature activated' : 'Feature deactivated',
  );
};

export const reorderErpIndustryFeaturesController = async (req: Request, res: Response) => {
  const industryId = validateUuidParam(req.params.id);
  const { ids } = validateErpReorder(req.body);
  const features = await service.reorderFeatures(industryId, ids, buildContext(req));
  return ApiResponse.success(res, features, 'Features reordered successfully');
};

export const deleteErpIndustryFeatureController = async (req: Request, res: Response) => {
  await service.removeFeature(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.featureId),
    buildContext(req),
  );
  return ApiResponse.noContent(res);
};

// ── benefits ──────────────────────────────────────────────────────────────

export const getAllErpIndustryBenefitsController = async (_req: Request, res: Response) => {
  const benefits = await service.listBenefits();
  return ApiResponse.success(res, benefits, 'Benefits retrieved successfully');
};

export const getErpIndustryBenefitByIdController = async (req: Request, res: Response) => {
  const benefit = await service.getBenefitById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, benefit, 'Benefit retrieved successfully');
};

export const createErpIndustryBenefitController = async (req: Request, res: Response) => {
  const dto = validateCreateErpIndustryBenefit(req.body);
  const benefit = await service.createBenefit(dto, buildContext(req));
  return ApiResponse.created(res, benefit, 'Benefit created successfully');
};

export const updateErpIndustryBenefitController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateErpIndustryBenefit(req.body);
  const benefit = await service.updateBenefit(id, dto, buildContext(req));
  return ApiResponse.success(res, benefit, 'Benefit updated successfully');
};

export const updateErpIndustryBenefitStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpStatusBody(req.body);
  const benefit = await service.setBenefitStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    benefit,
    status === 'ACTIVE' ? 'Benefit activated' : 'Benefit deactivated',
  );
};

export const reorderErpIndustryBenefitsController = async (req: Request, res: Response) => {
  const { ids } = validateErpReorder(req.body);
  const benefits = await service.reorderBenefits(ids, buildContext(req));
  return ApiResponse.success(res, benefits, 'Benefits reordered successfully');
};

export const deleteErpIndustryBenefitController = async (req: Request, res: Response) => {
  await service.removeBenefit(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the whole section in one response.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicErpRecognitionSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Industry recognition retrieved successfully');
};
