// src/modules/social-media-links/controllers/contact-lines.controller.ts

import { Request, Response } from 'express';
import * as contactLinesService from '../services/contact-lines.service';
import {
  validateCreateSocialContactLine,
  validateReorderSocialContactLines,
  validateSocialContactLineListQuery,
  validateSocialContactLineStatus,
  validateUpdateSocialContactLine,
} from '../validators/contact-lines.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllSocialContactLinesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateSocialContactLineListQuery(req.query as Record<string, unknown>);
  const lines = await contactLinesService.list(filters);
  return ApiResponse.success(res, lines, 'Contact lines retrieved successfully');
};

export const getSocialContactLineByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const line = await contactLinesService.getById(id);
  return ApiResponse.success(res, line, 'Contact line retrieved successfully');
};

export const createSocialContactLineController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateSocialContactLine(req.body);
  const line = await contactLinesService.create(dto, buildContext(req));
  return ApiResponse.created(res, line, 'Contact line added successfully');
};

export const updateSocialContactLineController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSocialContactLine(req.body);
  const line = await contactLinesService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, line, 'Contact line updated successfully');
};

export const updateSocialContactLineStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSocialContactLineStatus(req.body);
  const line = await contactLinesService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    line,
    status === 'ACTIVE' ? 'Contact line published' : 'Contact line unpublished',
  );
};

export const reorderSocialContactLinesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderSocialContactLines(req.body);
  const lines = await contactLinesService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, lines, 'Contact lines reordered successfully');
};

export const deleteSocialContactLineController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await contactLinesService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
