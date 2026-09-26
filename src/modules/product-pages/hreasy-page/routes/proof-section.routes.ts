// src/modules/product-pages/hreasy-page/routes/proof-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createHreasyProofCellController,
  createHreasyProofTileController,
  deleteHreasyProofCellController,
  deleteHreasyProofTileController,
  getAllHreasyProofCellsController,
  getAllHreasyProofTilesController,
  getHreasyProofCellByIdController,
  getHreasyProofOptionsController,
  getHreasyProofTileByIdController,
  getPublicHreasyProofSectionController,
  reorderHreasyProofCellsController,
  updateHreasyProofCellController,
  updateHreasyProofCellStatusController,
  updateHreasyProofTileController,
  updateHreasyProofTileStatusController,
} from '../controllers/proof-section.controller';

/**
 * Admin router for the proof bento.
 *
 * Two groups under one mount: the cards are the content and the columns are
 * the arrangement. They are one band on the page but two separate edits,
 * which is why they are not one form.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/options', read, asyncHandler(getHreasyProofOptionsController));

/*
 * A card has its own status but no order of its own: where it sits is the
 * column's decision, while whether it may be drawn at all is the card's. So
 * there is a /status here, but no /reorder.
 */
router.get('/tiles', read, asyncHandler(getAllHreasyProofTilesController));
router.post('/tiles', create, asyncHandler(createHreasyProofTileController));
router.get('/tiles/:id', read, asyncHandler(getHreasyProofTileByIdController));
router.put('/tiles/:id', update, asyncHandler(updateHreasyProofTileController));
router.put('/tiles/:id/status', update, asyncHandler(updateHreasyProofTileStatusController));
router.delete('/tiles/:id', destroy, asyncHandler(deleteHreasyProofTileController));

// The columns.
router.get('/cells', read, asyncHandler(getAllHreasyProofCellsController));
router.post('/cells', create, asyncHandler(createHreasyProofCellController));
/*
 * Declared before '/cells/:id' - Express matches in registration order, so
 * the reverse would make 'reorder' get parsed as an id and fail UUID
 * validation.
 */
router.put('/cells/reorder', update, asyncHandler(reorderHreasyProofCellsController));
router.get('/cells/:id', read, asyncHandler(getHreasyProofCellByIdController));
router.put('/cells/:id', update, asyncHandler(updateHreasyProofCellController));
router.put('/cells/:id/status', update, asyncHandler(updateHreasyProofCellStatusController));
router.delete('/cells/:id', destroy, asyncHandler(deleteHreasyProofCellController));

export default router;

/** The website-facing read: the copy and the whole bento, in one call. */
export const publicHreasyProofSectionRouter = Router();

publicHreasyProofSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicHreasyProofSectionController),
);
