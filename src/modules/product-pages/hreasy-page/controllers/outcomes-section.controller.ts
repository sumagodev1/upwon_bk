// src/modules/product-pages/hreasy-page/controllers/outcomes-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as outcomesService from '../services/outcomes-section.service';
import {
  validateCreateHreasyOutcomeStat,
  validateCreateHreasyOutcomeStory,
  validateHreasyOutcomeStoryListQuery,
  validateHreasyOutcomesReorder,
  validateHreasyOutcomesStatusBody,
  validateUpdateHreasyOutcomeStat,
  validateUpdateHreasyOutcomeStory,
} from '../validators/outcomes-section.validator';

/**
 * The HREasy page's outcome cards.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

// ── the story cards ───────────────────────────────────────────────────────

export const getAllHreasyOutcomeStoriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateHreasyOutcomeStoryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await outcomesService.listStories(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'HREasy outcome stories retrieved successfully');
};

export const getHreasyOutcomeStoryByIdController = async (req: Request, res: Response) => {
  const story = await outcomesService.getStoryById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, story, 'HREasy outcome story retrieved successfully');
};

export const createHreasyOutcomeStoryController = async (req: Request, res: Response) => {
  const dto = validateCreateHreasyOutcomeStory(req.body);
  const story = await outcomesService.createStory(dto, buildContext(req));
  return ApiResponse.created(res, story, 'HREasy outcome story created successfully');
};

export const updateHreasyOutcomeStoryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateHreasyOutcomeStory(req.body);
  const story = await outcomesService.updateStory(id, dto, buildContext(req));
  return ApiResponse.success(res, story, 'HREasy outcome story updated successfully');
};

export const updateHreasyOutcomeStoryStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyOutcomesStatusBody(req.body);
  const story = await outcomesService.setStoryStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    story,
    status === 'ACTIVE' ? 'HREasy outcome story activated' : 'HREasy outcome story deactivated',
  );
};

export const reorderHreasyOutcomeStoriesController = async (req: Request, res: Response) => {
  const { ids } = validateHreasyOutcomesReorder(req.body);
  const stories = await outcomesService.reorderStories(ids, buildContext(req));
  return ApiResponse.success(res, stories, 'HREasy outcome stories reordered successfully');
};

export const deleteHreasyOutcomeStoryController = async (req: Request, res: Response) => {
  await outcomesService.removeStory(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the figures ───────────────────────────────────────────────────────────

export const getHreasyOutcomeStatsController = async (req: Request, res: Response) => {
  const stats = await outcomesService.listStats(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stats, 'HREasy outcome figures retrieved successfully');
};

export const getHreasyOutcomeStatByIdController = async (req: Request, res: Response) => {
  const stat = await outcomesService.getStatById(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.statId),
  );
  return ApiResponse.success(res, stat, 'HREasy outcome figure retrieved successfully');
};

export const createHreasyOutcomeStatController = async (req: Request, res: Response) => {
  const storyId = validateUuidParam(req.params.id);
  const dto = validateCreateHreasyOutcomeStat(req.body);
  const stat = await outcomesService.createStat(storyId, dto, buildContext(req));
  return ApiResponse.created(res, stat, 'HREasy outcome figure created successfully');
};

export const updateHreasyOutcomeStatController = async (req: Request, res: Response) => {
  const storyId = validateUuidParam(req.params.id);
  const statId = validateUuidParam(req.params.statId);
  const dto = validateUpdateHreasyOutcomeStat(req.body);
  const stat = await outcomesService.updateStat(storyId, statId, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'HREasy outcome figure updated successfully');
};

export const updateHreasyOutcomeStatStatusController = async (req: Request, res: Response) => {
  const storyId = validateUuidParam(req.params.id);
  const statId = validateUuidParam(req.params.statId);
  const { status } = validateHreasyOutcomesStatusBody(req.body);
  const stat = await outcomesService.setStatStatus(storyId, statId, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'HREasy outcome figure activated' : 'HREasy outcome figure deactivated',
  );
};

export const reorderHreasyOutcomeStatsController = async (req: Request, res: Response) => {
  const storyId = validateUuidParam(req.params.id);
  const { ids } = validateHreasyOutcomesReorder(req.body);
  const stats = await outcomesService.reorderStats(storyId, ids, buildContext(req));
  return ApiResponse.success(res, stats, 'HREasy outcome figures reordered successfully');
};

export const deleteHreasyOutcomeStatController = async (req: Request, res: Response) => {
  await outcomesService.removeStat(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.statId),
    buildContext(req),
  );
  return ApiResponse.noContent(res);
};

/** The website-facing read: the whole row in one response. */
export const getPublicHreasyOutcomesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await outcomesService.getPublished();
  return ApiResponse.success(res, section, 'HREasy outcomes section retrieved successfully');
};
