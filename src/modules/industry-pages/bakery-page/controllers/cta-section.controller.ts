// src/modules/industry-pages/bakery-page/controllers/cta-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import { ERP_ICON_NAMES } from '../../../product-pages/erp-page/utils/icons';
import * as service from '../services/cta-section.service';
import {
  validateBakeryCtaFeatureListQuery,
  validateBakeryCtaFeatureStatus,
  validateCreateBakeryCtaFeature,
  validateReorderBakeryCtaFeatures,
  validateUpdateBakeryCtaFeature,
  validateUpsertBakeryCtaSection,
} from '../validators/cta-section.validator';

/** The Bakery & Confectionery page's closing band and the marks under it. */

// ── the band ──────────────────────────────────────────────────────────────

/**
 * Returns 200 with a null body when the band has never been authored, rather
 * than a 404 - that is a normal first-run answer, and the form treats it as an
 * empty state instead of an error.
 */
export const getBakeryCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.get();
  return ApiResponse.success(res, section, 'Bakery closing band retrieved successfully');
};

export const updateBakeryCtaSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertBakeryCtaSection(req.body);
  const section = await service.upsert(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Bakery closing band saved successfully');
};

// ── the capability marks ──────────────────────────────────────────────────

/**
 * The icons a mark may use - the ERP page's allowlist, which the site already
 * maps to components. Served so the picker offers exactly what the validator
 * accepts.
 */
export const getBakeryCtaIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, ERP_ICON_NAMES, 'Available icons retrieved successfully');

export const getAllBakeryCtaFeaturesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBakeryCtaFeatureListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listFeatures(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Bakery CTA features retrieved successfully');
};

export const getBakeryCtaFeatureByIdController = async (req: Request, res: Response) => {
  const feature = await service.getFeatureById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, feature, 'Bakery CTA feature retrieved successfully');
};

export const createBakeryCtaFeatureController = async (req: Request, res: Response) => {
  const dto = validateCreateBakeryCtaFeature(req.body);
  const feature = await service.createFeature(dto, buildContext(req));
  return ApiResponse.created(res, feature, 'Bakery CTA feature created successfully');
};

export const updateBakeryCtaFeatureController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBakeryCtaFeature(req.body);
  const feature = await service.updateFeature(id, dto, buildContext(req));
  return ApiResponse.success(res, feature, 'Bakery CTA feature updated successfully');
};

export const updateBakeryCtaFeatureStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBakeryCtaFeatureStatus(req.body);
  const feature = await service.setFeatureStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    feature,
    status === 'ACTIVE' ? 'Bakery CTA feature activated' : 'Bakery CTA feature deactivated',
  );
};

export const reorderBakeryCtaFeaturesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderBakeryCtaFeatures(req.body);
  const features = await service.reorderFeatures(ids, buildContext(req));
  return ApiResponse.success(res, features, 'Bakery CTA features reordered successfully');
};

export const deleteBakeryCtaFeatureController = async (req: Request, res: Response) => {
  await service.removeFeature(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The copy, the band and its marks in one call.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicBakeryCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Bakery closing band retrieved successfully');
};
