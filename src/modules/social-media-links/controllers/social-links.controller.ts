// src/modules/social-media-links/controllers/social-links.controller.ts

import { Request, Response } from 'express';
import * as socialLinksService from '../services/social-links.service';
import {
  validateCreateSocialLink,
  validateReorderSocialLinks,
  validateSocialLinkListQuery,
  validateSocialLinkStatus,
  validateUpdateSocialLink,
} from '../validators/social-links.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllSocialLinksController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateSocialLinkListQuery(req.query as Record<string, unknown>);
  const links = await socialLinksService.list(filters);
  return ApiResponse.success(res, links, 'Social links retrieved successfully');
};

export const getSocialLinkByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const link = await socialLinksService.getById(id);
  return ApiResponse.success(res, link, 'Social link retrieved successfully');
};

export const createSocialLinkController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateSocialLink(req.body);
  const link = await socialLinksService.create(dto, buildContext(req));
  return ApiResponse.created(res, link, 'Social link added successfully');
};

export const updateSocialLinkController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSocialLink(req.body);
  const link = await socialLinksService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, link, 'Social link updated successfully');
};

export const updateSocialLinkStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSocialLinkStatus(req.body);
  const link = await socialLinksService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    link,
    status === 'ACTIVE' ? 'Social link published' : 'Social link unpublished',
  );
};

export const reorderSocialLinksController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderSocialLinks(req.body);
  const links = await socialLinksService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, links, 'Social links reordered successfully');
};

export const deleteSocialLinkController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await socialLinksService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
