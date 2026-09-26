// src/modules/insider-page/controllers/stories.controller.ts

import { Request, Response } from 'express';
import * as storiesService from '../services/stories.service';
import {
  validateCreateInsiderStory,
  validateInsiderStoryStatus,
  validateReorderInsiderStories,
  validateUpdateInsiderStory,
} from '../validators/stories.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

/** Both ids of a /issues/:issueId/stories/:storyId route, validated together. */
const storyParams = (req: Request): { issueId: string; storyId: string } => ({
  issueId: validateUuidParam(req.params.issueId, 'issueId'),
  storyId: validateUuidParam(req.params.storyId, 'storyId'),
});

export const getInsiderStoryByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { issueId, storyId } = storyParams(req);
  const story = await storiesService.getById(issueId, storyId);
  return ApiResponse.success(res, story, 'Story retrieved successfully');
};

export const createInsiderStoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const issueId = validateUuidParam(req.params.issueId, 'issueId');
  const dto = validateCreateInsiderStory(req.body);
  const story = await storiesService.create(issueId, dto, buildContext(req));
  return ApiResponse.created(res, story, 'Story created successfully');
};

export const updateInsiderStoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { issueId, storyId } = storyParams(req);
  const dto = validateUpdateInsiderStory(req.body);
  const story = await storiesService.update(issueId, storyId, dto, buildContext(req));
  return ApiResponse.success(res, story, 'Story updated successfully');
};

export const updateInsiderStoryStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { issueId, storyId } = storyParams(req);
  const { status } = validateInsiderStoryStatus(req.body);
  const story = await storiesService.setStatus(issueId, storyId, status, buildContext(req));
  return ApiResponse.success(
    res,
    story,
    status === 'ACTIVE' ? 'Story published' : 'Story unpublished',
  );
};

export const reorderInsiderStoriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const issueId = validateUuidParam(req.params.issueId, 'issueId');
  const { ids } = validateReorderInsiderStories(req.body);
  const stories = await storiesService.reorder(issueId, ids, buildContext(req));
  return ApiResponse.success(res, stories, 'Stories reordered successfully');
};

export const deleteInsiderStoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { issueId, storyId } = storyParams(req);
  await storiesService.remove(issueId, storyId, buildContext(req));
  return ApiResponse.noContent(res);
};
