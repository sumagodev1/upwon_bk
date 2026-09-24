// src/modules/product-pages/erp-page/routes/outcomes-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createErpOutcomeCardController,
  deleteErpOutcomeCardController,
  getAllErpOutcomeCardsController,
  getErpOutcomeCardByIdController,
  getPublicErpOutcomesSectionController,
  reorderErpOutcomeCardsController,
  updateErpOutcomeCardController,
  updateErpOutcomeCardStatusController,
} from '../controllers/outcomes-section.controller';

/** Admin router for the customer outcomes carousel: a list of cards. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllErpOutcomeCardsController));
router.post('/', create, asyncHandler(createErpOutcomeCardController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderErpOutcomeCardsController));
router.get('/:id', read, asyncHandler(getErpOutcomeCardByIdController));
router.put('/:id', update, asyncHandler(updateErpOutcomeCardController));
router.put('/:id/status', update, asyncHandler(updateErpOutcomeCardStatusController));
router.delete('/:id', destroy, asyncHandler(deleteErpOutcomeCardController));

export default router;

/** The website-facing read: the copy and its cards, in one response. */
export const publicErpOutcomesSectionRouter = Router();

publicErpOutcomesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicErpOutcomesSectionController),
);
