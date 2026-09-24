// src/modules/product-pages/fms-page/controllers/outcomes-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/outcomes-section.service';
import {
  validateCreateFmsOutcomeStat,
  validateCreateFmsOutcomeStory,
  validateFmsOutcomeReorder,
  validateFmsOutcomeStatusBody,
  validateFmsOutcomeStoryListQuery,
  validateUpdateFmsOutcomeStat,
  validateUpdateFmsOutcomeStory,
} from '../validators/outcomes-section.validator';

/** The FMS page's customer outcomes carousel: the stories and their figures. */

// -- stories ----------------------------------------------------------------

export const getAllFmsOutcomeStoriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmsOutcomeStoryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStories(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Stories retrieved successfully');
};

export const getFmsOutcomeStoryByIdController = async (req: Request, res: Response) => {
  const story = await service.getStoryById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, story, 'Story retrieved successfully');
};

export const createFmsOutcomeStoryController = async (req: Request, res: Response) => {
  const dto = validateCreateFmsOutcomeStory(req.body);
  const story = await service.createStory(dto, buildContext(req));
  return ApiResponse.created(res, story, 'Story created successfully');
};

export const updateFmsOutcomeStoryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmsOutcomeStory(req.body);
  const story = await service.updateStory(id, dto, buildContext(req));
  return ApiResponse.success(res, story, 'Story updated successfully');
};

export const updateFmsOutcomeStoryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmsOutcomeStatusBody(req.body);
  const story = await service.setStoryStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    story,
    status === 'ACTIVE' ? 'Story activated' : 'Story deactivated',
  );
};

export const reorderFmsOutcomeStoriesController = async (req: Request, res: Response) => {
  const { ids } = validateFmsOutcomeReorder(req.body);
  const stories = await service.reorderStories(ids, buildContext(req));
  return ApiResponse.success(res, stories, 'Stories reordered successfully');
};

export const deleteFmsOutcomeStoryController = async (req: Request, res: Response) => {
  await service.removeStory(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// -- figures, nested under their story ---------------------------------------

export const getFmsOutcomeStatsController = async (req: Request, res: Response) => {
  const stats = await service.listStats(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stats, 'Figures retrieved successfully');
};

export const getFmsOutcomeStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.statId),
  );
  return ApiResponse.success(res, stat, 'Figure retrieved successfully');
};

export const createFmsOutcomeStatController = async (req: Request, res: Response) => {
  const storyId = validateUuidParam(req.params.id);
  const dto = validateCreateFmsOutcomeStat(req.body);
  const stat = await service.createStat(storyId, dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Figure created successfully');
};

export const updateFmsOutcomeStatController = async (req: Request, res: Response) => {
  const storyId = validateUuidParam(req.params.id);
  const statId = validateUuidParam(req.params.statId);
  const dto = validateUpdateFmsOutcomeStat(req.body);
  const stat = await service.updateStat(storyId, statId, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Figure updated successfully');
};

export const updateFmsOutcomeStatStatusController = async (req: Request, res: Response) => {
  const storyId = validateUuidParam(req.params.id);
  const statId = validateUuidParam(req.params.statId);
  const { status } = validateFmsOutcomeStatusBody(req.body);
  const stat = await service.setStatStatus(storyId, statId, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Figure activated' : 'Figure deactivated',
  );
};

export const reorderFmsOutcomeStatsController = async (req: Request, res: Response) => {
  const storyId = validateUuidParam(req.params.id);
  const { ids } = validateFmsOutcomeReorder(req.body);
  const stats = await service.reorderStats(storyId, ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Figures reordered successfully');
};

export const deleteFmsOutcomeStatController = async (req: Request, res: Response) => {
  await service.removeStat(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.statId),
    buildContext(req),
  );
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the whole carousel in one response.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicFmsOutcomesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Customer outcomes retrieved successfully');
};
