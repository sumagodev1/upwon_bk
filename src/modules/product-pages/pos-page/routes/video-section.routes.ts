// src/modules/product-pages/pos-page/routes/video-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createPosVideoEntryController,
  deletePosVideoEntryController,
  getAllPosVideoEntriesController,
  getPosVideoEntryByIdController,
  getPublicPosVideoSectionController,
  reorderPosVideoEntriesController,
  updatePosVideoEntryController,
  updatePosVideoEntryStatusController,
} from '../controllers/video-section.controller';

/**
 * Admin router for the video showcase.
 *
 * A list, though the page renders one player: the others are drafts and
 * retired clips, and the status toggle is what swaps them over.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllPosVideoEntriesController));
router.post('/', create, asyncHandler(createPosVideoEntryController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderPosVideoEntriesController));
router.get('/:id', read, asyncHandler(getPosVideoEntryByIdController));
router.put('/:id', update, asyncHandler(updatePosVideoEntryController));
router.put('/:id/status', update, asyncHandler(updatePosVideoEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deletePosVideoEntryController));

export default router;

/** The website-facing read: the copy and the one live video, in one call. */
export const publicPosVideoSectionRouter = Router();

publicPosVideoSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicPosVideoSectionController),
);
