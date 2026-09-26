// src/modules/product-pages/pos-page/routes/alternatives-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createPosAlternativeRowController,
  createPosAlternativesColumnController,
  deletePosAlternativeRowController,
  deletePosAlternativesColumnController,
  getAllPosAlternativeRowsController,
  getAllPosAlternativesColumnsController,
  getPosAlternativeRowByIdController,
  getPosAlternativesColumnByIdController,
  getPosAlternativesSectionController,
  getPublicPosAlternativesSectionController,
  reorderPosAlternativeRowsController,
  reorderPosAlternativesColumnsController,
  updatePosAlternativeRowController,
  updatePosAlternativeRowStatusController,
  updatePosAlternativesColumnController,
  updatePosAlternativesColumnStatusController,
  updatePosAlternativesSectionController,
} from '../controllers/alternatives-section.controller';

/**
 * Admin router for the comparison grid.
 *
 * Three groups: the leader column at the root, the competitor columns, and the
 * criteria rows. Unlike the SFA-DMS grid there is no closing summary - this
 * design ends on its last criterion.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The leader column.
router.get('/', read, asyncHandler(getPosAlternativesSectionController));
router.put('/', update, asyncHandler(updatePosAlternativesSectionController));

/*
 * 'reorder' is declared before ':id' in both groups - Express matches in
 * registration order, so the reverse would parse it as an id and fail UUID
 * validation.
 */
router.get('/columns', read, asyncHandler(getAllPosAlternativesColumnsController));
router.post('/columns', create, asyncHandler(createPosAlternativesColumnController));
router.put('/columns/reorder', update, asyncHandler(reorderPosAlternativesColumnsController));
router.get('/columns/:id', read, asyncHandler(getPosAlternativesColumnByIdController));
router.put('/columns/:id', update, asyncHandler(updatePosAlternativesColumnController));
router.put(
  '/columns/:id/status',
  update,
  asyncHandler(updatePosAlternativesColumnStatusController),
);
router.delete('/columns/:id', destroy, asyncHandler(deletePosAlternativesColumnController));

router.get('/rows', read, asyncHandler(getAllPosAlternativeRowsController));
router.post('/rows', create, asyncHandler(createPosAlternativeRowController));
router.put('/rows/reorder', update, asyncHandler(reorderPosAlternativeRowsController));
router.get('/rows/:id', read, asyncHandler(getPosAlternativeRowByIdController));
router.put('/rows/:id', update, asyncHandler(updatePosAlternativeRowController));
router.put('/rows/:id/status', update, asyncHandler(updatePosAlternativeRowStatusController));
router.delete('/rows/:id', destroy, asyncHandler(deletePosAlternativeRowController));

export default router;

/** The website-facing read: the whole grid in one response. */
export const publicPosAlternativesSectionRouter = Router();

publicPosAlternativesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicPosAlternativesSectionController),
);
