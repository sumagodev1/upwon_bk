// src/modules/product-pages/hreasy-page/routes/outcomes-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createHreasyOutcomeStatController,
  createHreasyOutcomeStoryController,
  deleteHreasyOutcomeStatController,
  deleteHreasyOutcomeStoryController,
  getAllHreasyOutcomeStoriesController,
  getHreasyOutcomeStatByIdController,
  getHreasyOutcomeStatsController,
  getHreasyOutcomeStoryByIdController,
  getPublicHreasyOutcomesSectionController,
  reorderHreasyOutcomeStatsController,
  reorderHreasyOutcomeStoriesController,
  updateHreasyOutcomeStatController,
  updateHreasyOutcomeStatStatusController,
  updateHreasyOutcomeStoryController,
  updateHreasyOutcomeStoryStatusController,
} from '../controllers/outcomes-section.controller';

/**
 * Admin router for the outcome cards.
 *
 * The cards are a list under '/stories', and each card's figures are nested
 * under it - the same layout the FMS page's outcomes use. The path says whose
 * a figure is, so no request can orphan one.
 *
 * The copy that heads the row is not here: it is served by the shared
 * section-copy router under ('hreasy', 'outcomes').
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
router.get('/stories', read, asyncHandler(getAllHreasyOutcomeStoriesController));
router.post('/stories', create, asyncHandler(createHreasyOutcomeStoryController));
router.put('/stories/reorder', update, asyncHandler(reorderHreasyOutcomeStoriesController));
router.get('/stories/:id', read, asyncHandler(getHreasyOutcomeStoryByIdController));
router.put('/stories/:id', update, asyncHandler(updateHreasyOutcomeStoryController));
router.put(
  '/stories/:id/status',
  update,
  asyncHandler(updateHreasyOutcomeStoryStatusController),
);
router.delete('/stories/:id', destroy, asyncHandler(deleteHreasyOutcomeStoryController));

router.get('/stories/:id/stats', read, asyncHandler(getHreasyOutcomeStatsController));
router.post('/stories/:id/stats', create, asyncHandler(createHreasyOutcomeStatController));
router.put(
  '/stories/:id/stats/reorder',
  update,
  asyncHandler(reorderHreasyOutcomeStatsController),
);
router.get('/stories/:id/stats/:statId', read, asyncHandler(getHreasyOutcomeStatByIdController));
router.put(
  '/stories/:id/stats/:statId',
  update,
  asyncHandler(updateHreasyOutcomeStatController),
);
router.put(
  '/stories/:id/stats/:statId/status',
  update,
  asyncHandler(updateHreasyOutcomeStatStatusController),
);
router.delete(
  '/stories/:id/stats/:statId',
  destroy,
  asyncHandler(deleteHreasyOutcomeStatController),
);

export default router;

/** The website-facing read: the whole row in one response. */
export const publicHreasyOutcomesSectionRouter = Router();

publicHreasyOutcomesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicHreasyOutcomesSectionController),
);
