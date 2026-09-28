// src/modules/product-pages/wms-page/routes/proof-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createWmsProofCardController,
  createWmsProofSlideController,
  deleteWmsProofCardController,
  deleteWmsProofSlideController,
  getAllWmsProofCardsController,
  getPublicWmsProofSectionController,
  getWmsProofCardByIdController,
  getWmsProofSlideByIdController,
  getWmsProofSlidesController,
  reorderWmsProofCardsController,
  reorderWmsProofSlidesController,
  updateWmsProofCardController,
  updateWmsProofCardStatusController,
  updateWmsProofSlideController,
  updateWmsProofSlideStatusController,
} from '../controllers/proof-section.controller';

/**
 * Admin router for the proof row.
 *
 * The cards are a list under '/cards', and each card's slides are nested
 * under it, because a slide has no meaning apart from the card it flips
 * inside - the path says whose it is, so no request can orphan one.
 *
 * The copy that heads the row is not here: it is served by the shared
 * section-copy router under ('wms', 'proof').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

/*
 * 'cards/reorder' is declared before 'cards/:id' - Express matches in
 * registration order, so the reverse would parse it as an id and fail UUID
 * validation. The same holds for the slides' own reorder below.
 */
router.get('/cards', read, asyncHandler(getAllWmsProofCardsController));
router.post('/cards', create, asyncHandler(createWmsProofCardController));
router.put('/cards/reorder', update, asyncHandler(reorderWmsProofCardsController));
router.get('/cards/:id', read, asyncHandler(getWmsProofCardByIdController));
router.put('/cards/:id', update, asyncHandler(updateWmsProofCardController));
router.put('/cards/:id/status', update, asyncHandler(updateWmsProofCardStatusController));
router.delete('/cards/:id', destroy, asyncHandler(deleteWmsProofCardController));

router.get('/cards/:id/slides', read, asyncHandler(getWmsProofSlidesController));
router.post('/cards/:id/slides', create, asyncHandler(createWmsProofSlideController));
router.put('/cards/:id/slides/reorder', update, asyncHandler(reorderWmsProofSlidesController));
router.get('/cards/:id/slides/:slideId', read, asyncHandler(getWmsProofSlideByIdController));
router.put('/cards/:id/slides/:slideId', update, asyncHandler(updateWmsProofSlideController));
router.put(
  '/cards/:id/slides/:slideId/status',
  update,
  asyncHandler(updateWmsProofSlideStatusController),
);
router.delete(
  '/cards/:id/slides/:slideId',
  destroy,
  asyncHandler(deleteWmsProofSlideController),
);

export default router;

/** The website-facing read: the whole row in one response. */
export const publicWmsProofSectionRouter = Router();

publicWmsProofSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWmsProofSectionController),
);
