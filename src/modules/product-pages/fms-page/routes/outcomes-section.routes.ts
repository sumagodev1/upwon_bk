// src/modules/product-pages/fms-page/routes/outcomes-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmsOutcomeStatController,
  createFmsOutcomeStoryController,
  deleteFmsOutcomeStatController,
  deleteFmsOutcomeStoryController,
  getAllFmsOutcomeStoriesController,
  getFmsOutcomeStatByIdController,
  getFmsOutcomeStatsController,
  getFmsOutcomeStoryByIdController,
  getPublicFmsOutcomesSectionController,
  reorderFmsOutcomeStatsController,
  reorderFmsOutcomeStoriesController,
  updateFmsOutcomeStatController,
  updateFmsOutcomeStatStatusController,
  updateFmsOutcomeStoryController,
  updateFmsOutcomeStoryStatusController,
} from '../controllers/outcomes-section.controller';

/**
 * Admin router for the customer outcomes carousel.
 *
 * Figures are nested under their story because they have no meaning apart from
 * it - the path says whose they are, so no request can orphan one.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

/*
 * 'stories/reorder' is declared before 'stories/:id' - Express matches in
 * registration order, so the reverse would parse it as an id and fail UUID
 * validation. The same holds for the figures' own reorder below.
 */
router.get('/stories', read, asyncHandler(getAllFmsOutcomeStoriesController));
router.post('/stories', create, asyncHandler(createFmsOutcomeStoryController));
router.put('/stories/reorder', update, asyncHandler(reorderFmsOutcomeStoriesController));
router.get('/stories/:id', read, asyncHandler(getFmsOutcomeStoryByIdController));
router.put('/stories/:id', update, asyncHandler(updateFmsOutcomeStoryController));
router.put(
  '/stories/:id/status',
  update,
  asyncHandler(updateFmsOutcomeStoryStatusController),
);
router.delete('/stories/:id', destroy, asyncHandler(deleteFmsOutcomeStoryController));

router.get('/stories/:id/stats', read, asyncHandler(getFmsOutcomeStatsController));
router.post('/stories/:id/stats', create, asyncHandler(createFmsOutcomeStatController));
router.put(
  '/stories/:id/stats/reorder',
  update,
  asyncHandler(reorderFmsOutcomeStatsController),
);
router.get('/stories/:id/stats/:statId', read, asyncHandler(getFmsOutcomeStatByIdController));
router.put('/stories/:id/stats/:statId', update, asyncHandler(updateFmsOutcomeStatController));
router.put(
  '/stories/:id/stats/:statId/status',
  update,
  asyncHandler(updateFmsOutcomeStatStatusController),
);
router.delete(
  '/stories/:id/stats/:statId',
  destroy,
  asyncHandler(deleteFmsOutcomeStatController),
);

export default router;

/** The website-facing read: the whole carousel in one response. */
export const publicFmsOutcomesSectionRouter = Router();

publicFmsOutcomesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmsOutcomesSectionController),
);
