// src/modules/product-pages/pos-page/routes/outcomes-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createPosOutcomeStoryController,
  deletePosOutcomeStoryController,
  getAllPosOutcomeStoriesController,
  getPosOutcomeStoryByIdController,
  getPublicPosOutcomesSectionController,
  reorderPosOutcomeStoriesController,
  updatePosOutcomeStoryController,
  updatePosOutcomeStoryStatusController,
} from '../controllers/outcomes-section.controller';

/**
 * Admin router for the outcome marquee.
 *
 * One group, unlike the FMS page's two: that page's cards carry a row of
 * figures with their own endpoints, and these carry a quote and nothing else.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/stories', read, asyncHandler(getAllPosOutcomeStoriesController));
router.post('/stories', create, asyncHandler(createPosOutcomeStoryController));
/*
 * Declared before '/stories/:id' - Express matches in registration order, so
 * the reverse would make 'reorder' get parsed as an id and fail UUID
 * validation.
 */
router.put('/stories/reorder', update, asyncHandler(reorderPosOutcomeStoriesController));
router.get('/stories/:id', read, asyncHandler(getPosOutcomeStoryByIdController));
router.put('/stories/:id', update, asyncHandler(updatePosOutcomeStoryController));
router.put(
  '/stories/:id/status',
  update,
  asyncHandler(updatePosOutcomeStoryStatusController),
);
router.delete('/stories/:id', destroy, asyncHandler(deletePosOutcomeStoryController));

export default router;

/** The website-facing read: the copy and the cards, in one call. */
export const publicPosOutcomesSectionRouter = Router();

publicPosOutcomesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicPosOutcomesSectionController),
);
