// src/modules/product-pages/hreasy-page/controllers/packages-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as packagesService from '../services/packages-section.service';
import {
  validateCreateHreasyPackageFeature,
  validateCreateHreasyPackageTier,
  validateHreasyPackageTierListQuery,
  validateHreasyPackagesReorder,
  validateHreasyPackagesStatusBody,
  validateUpdateHreasyPackageFeature,
  validateUpdateHreasyPackageTier,
} from '../validators/packages-section.validator';

/**
 * The HREasy page's tier row.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

// ── the tier cards ────────────────────────────────────────────────────────

export const getAllHreasyPackageTiersController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateHreasyPackageTierListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await packagesService.listTiers(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'HREasy package tiers retrieved successfully');
};

export const getHreasyPackageTierByIdController = async (req: Request, res: Response) => {
  const tier = await packagesService.getTierById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, tier, 'HREasy package tier retrieved successfully');
};

export const createHreasyPackageTierController = async (req: Request, res: Response) => {
  const dto = validateCreateHreasyPackageTier(req.body);
  const tier = await packagesService.createTier(dto, buildContext(req));
  return ApiResponse.created(res, tier, 'HREasy package tier created successfully');
};

export const updateHreasyPackageTierController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateHreasyPackageTier(req.body);
  const tier = await packagesService.updateTier(id, dto, buildContext(req));
  return ApiResponse.success(res, tier, 'HREasy package tier updated successfully');
};

export const updateHreasyPackageTierStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyPackagesStatusBody(req.body);
  const tier = await packagesService.setTierStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    tier,
    status === 'ACTIVE' ? 'HREasy package tier activated' : 'HREasy package tier deactivated',
  );
};

export const reorderHreasyPackageTiersController = async (req: Request, res: Response) => {
  const { ids } = validateHreasyPackagesReorder(req.body);
  const tiers = await packagesService.reorderTiers(ids, buildContext(req));
  return ApiResponse.success(res, tiers, 'HREasy package tiers reordered successfully');
};

export const deleteHreasyPackageTierController = async (req: Request, res: Response) => {
  await packagesService.removeTier(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the ticks ─────────────────────────────────────────────────────────────

export const getHreasyPackageFeaturesController = async (req: Request, res: Response) => {
  const features = await packagesService.listFeatures(validateUuidParam(req.params.id));
  return ApiResponse.success(res, features, 'HREasy package features retrieved successfully');
};

export const getHreasyPackageFeatureByIdController = async (req: Request, res: Response) => {
  const feature = await packagesService.getFeatureById(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.featureId),
  );
  return ApiResponse.success(res, feature, 'HREasy package feature retrieved successfully');
};

export const createHreasyPackageFeatureController = async (req: Request, res: Response) => {
  const tierId = validateUuidParam(req.params.id);
  const dto = validateCreateHreasyPackageFeature(req.body);
  const feature = await packagesService.createFeature(tierId, dto, buildContext(req));
  return ApiResponse.created(res, feature, 'HREasy package feature created successfully');
};

export const updateHreasyPackageFeatureController = async (req: Request, res: Response) => {
  const tierId = validateUuidParam(req.params.id);
  const featureId = validateUuidParam(req.params.featureId);
  const dto = validateUpdateHreasyPackageFeature(req.body);
  const feature = await packagesService.updateFeature(tierId, featureId, dto, buildContext(req));
  return ApiResponse.success(res, feature, 'HREasy package feature updated successfully');
};

export const updateHreasyPackageFeatureStatusController = async (
  req: Request,
  res: Response,
) => {
  const tierId = validateUuidParam(req.params.id);
  const featureId = validateUuidParam(req.params.featureId);
  const { status } = validateHreasyPackagesStatusBody(req.body);
  const feature = await packagesService.setFeatureStatus(
    tierId,
    featureId,
    status,
    buildContext(req),
  );
  return ApiResponse.success(
    res,
    feature,
    status === 'ACTIVE'
      ? 'HREasy package feature activated'
      : 'HREasy package feature deactivated',
  );
};

export const reorderHreasyPackageFeaturesController = async (req: Request, res: Response) => {
  const tierId = validateUuidParam(req.params.id);
  const { ids } = validateHreasyPackagesReorder(req.body);
  const features = await packagesService.reorderFeatures(tierId, ids, buildContext(req));
  return ApiResponse.success(res, features, 'HREasy package features reordered successfully');
};

export const deleteHreasyPackageFeatureController = async (req: Request, res: Response) => {
  await packagesService.removeFeature(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.featureId),
    buildContext(req),
  );
  return ApiResponse.noContent(res);
};

/** The website-facing read: the whole section in one response. */
export const getPublicHreasyPackagesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await packagesService.getPublished();
  return ApiResponse.success(res, section, 'HREasy packages section retrieved successfully');
};
