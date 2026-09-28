// src/modules/product-pages/wms-page/routes/recognition-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createWmsRecognitionCardController,
  deleteWmsRecognitionCardController,
  getAllWmsRecognitionCardsController,
  getPublicWmsRecognitionSectionController,
  getWmsRecognitionCardByIdController,
  reorderWmsRecognitionCardsController,
  updateWmsRecognitionCardController,
  updateWmsRecognitionCardStatusController,
} from '../controllers/recognition-section.controller';

/**
 * Admin router for the warehouse-type map.
 *
 * One group, unlike the proof row's two: the section is a heading and a grid,
 * and the grid is a single list.
 *
 * The copy that heads it is not here - it is served by the shared
 * section-copy router under ('wms', 'recognition').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllWmsRecognitionCardsController));
router.post('/', create, asyncHandler(createWmsRecognitionCardController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderWmsRecognitionCardsController));
router.get('/:id', read, asyncHandler(getWmsRecognitionCardByIdController));
router.put('/:id', update, asyncHandler(updateWmsRecognitionCardController));
router.put('/:id/status', update, asyncHandler(updateWmsRecognitionCardStatusController));
router.delete('/:id', destroy, asyncHandler(deleteWmsRecognitionCardController));

export default router;

/** The website-facing read: the copy and the cards, in one call. */
export const publicWmsRecognitionSectionRouter = Router();

publicWmsRecognitionSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWmsRecognitionSectionController),
);
