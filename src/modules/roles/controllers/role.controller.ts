// src/modules/roles/controllers/role.controller.ts

import { Request, Response } from 'express';
import * as roleService from '../services/role.service';
import {
  validateCreateRole,
  validateReplaceRolePermissions,
  validateRoleListQuery,
  validateUpdateRole,
} from '../validators/role.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllRolesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateRoleListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await roleService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Roles retrieved successfully');
};

export const getRoleByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const role = await roleService.getById(id);
  return ApiResponse.success(res, role, 'Role retrieved successfully');
};

export const createRoleController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateRole(req.body);
  const role = await roleService.create(dto, buildContext(req));
  return ApiResponse.created(res, role, 'Role created successfully');
};

export const updateRoleController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateRole(req.body);
  const role = await roleService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, role, 'Role updated successfully');
};

export const replaceRolePermissionsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateReplaceRolePermissions(req.body);
  const role = await roleService.replacePermissions(id, dto, buildContext(req));
  return ApiResponse.success(res, role, 'Role permissions updated successfully');
};

export const deleteRoleController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await roleService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
