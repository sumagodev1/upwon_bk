// src/modules/product-pages/pos-page/controllers/outcomes-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/outcomes-section.service';
import {
  validateCreatePosOutcomeStory,
  validatePosOutcomeReorder,
  validatePosOutcomeStatusBody,
  validatePosOutcomeStoryListQuery,
  validateUpdatePosOutcomeStory,
} from '../validators/outcomes-section.validator';

/** The POS page's customer outcomes carousel: the stories and their figures. */

// -- stories ----------------------------------------------------------------

export const getAllPosOutcomeStoriesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validatePosOutcomeStoryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStories(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Stories retrieved successfully');
};

export const getPosOutcomeStoryByIdController = async (req: Request, res: Response) => {
  const story = await service.getStoryById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, story, 'Story retrieved successfully');
};

export const createPosOutcomeStoryController = async (req: Request, res: Response) => {
  const dto = validateCreatePosOutcomeStory(req.body);
  const story = await service.createStory(dto, buildContext(req));
  return ApiResponse.created(res, story, 'Story created successfully');
};

export const updatePosOutcomeStoryController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePosOutcomeStory(req.body);
  const story = await service.updateStory(id, dto, buildContext(req));
  return ApiResponse.success(res, story, 'Story updated successfully');
};

export const updatePosOutcomeStoryStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validatePosOutcomeStatusBody(req.body);
  const story = await service.setStoryStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    story,
    status === 'ACTIVE' ? 'Story activated' : 'Story deactivated',
  );
};

export const reorderPosOutcomeStoriesController = async (req: Request, res: Response) => {
  const { ids } = validatePosOutcomeReorder(req.body);
  const stories = await service.reorderStories(ids, buildContext(req));
  return ApiResponse.success(res, stories, 'Stories reordered successfully');
};

export const deletePosOutcomeStoryController = async (req: Request, res: Response) => {
  await service.removeStory(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// -- figures, nested under their story ---------------------------------------

export const getPublicPosOutcomesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Customer outcomes retrieved successfully');
};
