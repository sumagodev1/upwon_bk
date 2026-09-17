// src/modules/settings/controllers/setting.controller.ts

import { Request, Response } from 'express';
import * as settingService from '../services/setting.service';
import {
  validateSettingKey,
  validateUpdateSettings,
} from '../validators/setting.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getAllSettingsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const settings = await settingService.list(buildContext(req));
  return ApiResponse.success(res, settings, 'Settings retrieved successfully');
};

export const getSettingByKeyController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const key = validateSettingKey(req.params.key);
  const setting = await settingService.getByKey(key, buildContext(req));
  return ApiResponse.success(res, setting, 'Setting retrieved successfully');
};

export const updateSettingsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const updates = validateUpdateSettings(req.body);
  const settings = await settingService.updateMany(updates, buildContext(req));
  return ApiResponse.success(res, settings, 'Settings updated successfully');
};
