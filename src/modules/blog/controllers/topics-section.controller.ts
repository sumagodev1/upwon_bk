// src/modules/blog/controllers/topics-section.controller.ts

import { Request, Response } from 'express';
import * as topicsSectionService from '../services/topics-section.service';
import { validateReplaceBlogTopicsSection } from '../validators/topics-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getBlogTopicsSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await topicsSectionService.get();
  return ApiResponse.success(
    res,
    section,
    section
      ? 'Blog topics section retrieved successfully'
      : 'Blog topics section has not been set up yet',
  );
};

export const replaceBlogTopicsSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceBlogTopicsSection(req.body);
  const section = await topicsSectionService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Blog topics section saved successfully');
};

/** The website-facing read. 404 while the intro has never been authored. */
export const getPublicBlogTopicsSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await topicsSectionService.getPublished();
  return ApiResponse.success(res, section, 'Blog topics section retrieved successfully');
};
