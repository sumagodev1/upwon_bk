// src/modules/permissions/controllers/permission.controller.ts

import { Request, Response } from 'express';
import * as permissionService from '../services/permission.service';
import { ApiResponse } from '../../../core/utils/ApiResponse';

export const listPermissionsController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const permissions = await permissionService.listAll();
  return ApiResponse.success(res, permissions, 'Permissions retrieved successfully');
};

export const listGroupedPermissionsController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const groups = await permissionService.listGroupedByModule();
  return ApiResponse.success(res, groups, 'Permissions retrieved successfully');
};
