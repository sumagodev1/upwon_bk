// src/modules/admins/controllers/admin.controller.ts

import { Request, Response } from 'express';
import * as adminService from '../services/admin.service';
import {
  validateAdminListQuery,
  validateCreateAdmin,
  validateReplaceAdminRoles,
  validateUpdateAdmin,
  validateUpdateAdminStatus,
} from '../validators/admin.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

/**
 * Thin by construction. Every handler: extract -> validate -> delegate ->
 * respond. No SQL, no business branching, no try/catch - asyncHandler routes
 * rejections to the centralized error middleware.
 */

// Get all admins
export const getAllAdminsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateAdminListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await adminService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Admins retrieved successfully');
};

// Get admin by id
export const getAdminByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const admin = await adminService.getById(id);
  return ApiResponse.success(res, admin, 'Admin retrieved successfully');
};

// Create admin
export const createAdminController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateAdmin(req.body);
  const admin = await adminService.create(dto, buildContext(req));
  return ApiResponse.created(res, admin, 'Admin created successfully');
};

// Update admin profile
export const updateAdminController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateAdmin(req.body);
  const admin = await adminService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, admin, 'Admin updated successfully');
};

// Activate / deactivate / suspend admin
export const updateAdminStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateAdminStatus(req.body);
  const admin = await adminService.changeStatus(id, dto, buildContext(req));
  return ApiResponse.success(res, admin, 'Admin status updated successfully');
};

// Replace the admin's entire role set
export const replaceAdminRolesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateReplaceAdminRoles(req.body);
  const admin = await adminService.replaceRoles(id, dto, buildContext(req));
  return ApiResponse.success(res, admin, 'Admin roles updated successfully');
};

// Soft delete admin
export const deleteAdminController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await adminService.softDelete(id, buildContext(req));
  return ApiResponse.noContent(res);
};
