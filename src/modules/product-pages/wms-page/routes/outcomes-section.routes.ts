// src/modules/product-pages/wms-page/routes/outcomes-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createWmsOutcomeCardController,
  deleteWmsOutcomeCardController,
  getAllWmsOutcomeCardsController,
  getPublicWmsOutcomesSectionController,
  getWmsOutcomeCardByIdController,
  reorderWmsOutcomeCardsController,
  updateWmsOutcomeCardController,
  updateWmsOutcomeCardStatusController,
} from '../controllers/outcomes-section.controller';

/**
 * Admin router for the customer-outcomes row.
 *
 * One group: the section is a heading over a list, and the list is flat.
 *
 * No '/icons' here - the page's icon allowlist is served once, by the closing
 * band's router, and every section that draws an icon reads it from there.
 *
 * The copy that heads the row is not here either - it is served by the shared
 * section-copy router under ('wms', 'outcomes').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllWmsOutcomeCardsController));
router.post('/', create, asyncHandler(createWmsOutcomeCardController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderWmsOutcomeCardsController));
router.get('/:id', read, asyncHandler(getWmsOutcomeCardByIdController));
router.put('/:id', update, asyncHandler(updateWmsOutcomeCardController));
router.put('/:id/status', update, asyncHandler(updateWmsOutcomeCardStatusController));
router.delete('/:id', destroy, asyncHandler(deleteWmsOutcomeCardController));

export default router;

/** The website-facing read: the copy and the cards, in one call. */
export const publicWmsOutcomesSectionRouter = Router();

publicWmsOutcomesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWmsOutcomesSectionController),
);
