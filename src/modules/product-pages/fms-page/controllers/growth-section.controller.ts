// src/modules/product-pages/fms-page/controllers/growth-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/growth-section.service';
import {
  validateCreateFmsGrowthFeature,
  validateCreateFmsGrowthTier,
  validateFmsGrowthReorder,
  validateFmsGrowthStatusBody,
  validateFmsGrowthTierListQuery,
  validateUpdateFmsGrowthFeature,
  validateUpdateFmsGrowthTier,
  validateUpsertFmsGrowthSection,
} from '../validators/growth-section.validator';

/**
 * The FMS page's growth path: the line under the row, the tier cards, and the
 * ticks under each.
 */

// -- the reassurance line ---------------------------------------------------

/** Null before it has ever been set - a normal first-run state, not a 404. */
export const getFmsGrowthSectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Growth section retrieved successfully');
};

export const saveFmsGrowthSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertFmsGrowthSection(req.body);
  const section = await service.saveSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Growth section saved successfully');
};

// -- the tier cards ---------------------------------------------------------

export const getAllFmsGrowthTiersController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmsGrowthTierListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listTiers(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Tiers retrieved successfully');
};

export const getFmsGrowthTierByIdController = async (req: Request, res: Response) => {
  const tier = await service.getTierById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, tier, 'Tier retrieved successfully');
};

export const createFmsGrowthTierController = async (req: Request, res: Response) => {
  const dto = validateCreateFmsGrowthTier(req.body);
  const tier = await service.createTier(dto, buildContext(req));
  return ApiResponse.created(res, tier, 'Tier created successfully');
};

export const updateFmsGrowthTierController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmsGrowthTier(req.body);
  const tier = await service.updateTier(id, dto, buildContext(req));
  return ApiResponse.success(res, tier, 'Tier updated successfully');
};

export const updateFmsGrowthTierStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmsGrowthStatusBody(req.body);
  const tier = await service.setTierStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    tier,
    status === 'ACTIVE' ? 'Tier activated' : 'Tier deactivated',
  );
};

export const reorderFmsGrowthTiersController = async (req: Request, res: Response) => {
  const { ids } = validateFmsGrowthReorder(req.body);
  const tiers = await service.reorderTiers(ids, buildContext(req));
  return ApiResponse.success(res, tiers, 'Tiers reordered successfully');
};

export const deleteFmsGrowthTierController = async (req: Request, res: Response) => {
  await service.removeTier(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// -- the ticks, nested under their tier -------------------------------------

export const getFmsGrowthFeaturesController = async (req: Request, res: Response) => {
  const features = await service.listFeatures(validateUuidParam(req.params.id));
  return ApiResponse.success(res, features, 'Features retrieved successfully');
};

export const getFmsGrowthFeatureByIdController = async (req: Request, res: Response) => {
  const feature = await service.getFeatureById(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.featureId),
  );
  return ApiResponse.success(res, feature, 'Feature retrieved successfully');
};

export const createFmsGrowthFeatureController = async (req: Request, res: Response) => {
  const tierId = validateUuidParam(req.params.id);
  const dto = validateCreateFmsGrowthFeature(req.body);
  const feature = await service.createFeature(tierId, dto, buildContext(req));
  return ApiResponse.created(res, feature, 'Feature created successfully');
};

export const updateFmsGrowthFeatureController = async (req: Request, res: Response) => {
  const tierId = validateUuidParam(req.params.id);
  const featureId = validateUuidParam(req.params.featureId);
  const dto = validateUpdateFmsGrowthFeature(req.body);
  const feature = await service.updateFeature(tierId, featureId, dto, buildContext(req));
  return ApiResponse.success(res, feature, 'Feature updated successfully');
};

export const updateFmsGrowthFeatureStatusController = async (req: Request, res: Response) => {
  const tierId = validateUuidParam(req.params.id);
  const featureId = validateUuidParam(req.params.featureId);
  const { status } = validateFmsGrowthStatusBody(req.body);
  const feature = await service.setFeatureStatus(tierId, featureId, status, buildContext(req));
  return ApiResponse.success(
    res,
    feature,
    status === 'ACTIVE' ? 'Feature activated' : 'Feature deactivated',
  );
};

export const reorderFmsGrowthFeaturesController = async (req: Request, res: Response) => {
  const tierId = validateUuidParam(req.params.id);
  const { ids } = validateFmsGrowthReorder(req.body);
  const features = await service.reorderFeatures(tierId, ids, buildContext(req));
  return ApiResponse.success(res, features, 'Features reordered successfully');
};

export const deleteFmsGrowthFeatureController = async (req: Request, res: Response) => {
  await service.removeFeature(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.featureId),
    buildContext(req),
  );
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the whole section in one response.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicFmsGrowthSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Growth path retrieved successfully');
};
