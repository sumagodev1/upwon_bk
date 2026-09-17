// src/modules/organizations/controllers/organization.controller.ts

import { Request, Response } from 'express';
import * as organizationService from '../services/organization.service';
import * as subscriptionService from '../../subscriptions/services/subscription.service';
import {
  validateCreateOrganization,
  validateOrganizationListQuery,
  validateUpdateOrganization,
  validateUpdateOrganizationStatus,
} from '../validators/organization.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { parsePagination } from '../../../core/utils/pagination';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllOrganizationsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateOrganizationListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await organizationService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Organizations retrieved successfully');
};

export const getOrganizationByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const organization = await organizationService.getById(id);
  return ApiResponse.success(res, organization, 'Organization retrieved successfully');
};

export const createOrganizationController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateOrganization(req.body);
  const organization = await organizationService.create(dto, buildContext(req));
  return ApiResponse.created(res, organization, 'Organization created successfully');
};

export const updateOrganizationController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateOrganization(req.body);
  const organization = await organizationService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, organization, 'Organization updated successfully');
};

export const updateOrganizationStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateOrganizationStatus(req.body);
  const organization = await organizationService.changeStatus(id, dto, buildContext(req));
  return ApiResponse.success(res, organization, 'Organization status updated successfully');
};

export const getOrganizationSubscriptionsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const { rows, meta } = await subscriptionService.list({ organizationId: id }, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Subscriptions retrieved successfully');
};

export const deleteOrganizationController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await organizationService.softDelete(id, buildContext(req));
  return ApiResponse.noContent(res);
};
