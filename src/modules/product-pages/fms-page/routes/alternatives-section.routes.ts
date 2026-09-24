// src/modules/product-pages/fms-page/routes/alternatives-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmsAlternativeRowController,
  createFmsAlternativesColumnController,
  deleteFmsAlternativeRowController,
  deleteFmsAlternativesColumnController,
  getAllFmsAlternativeRowsController,
  getAllFmsAlternativesColumnsController,
  getFmsAlternativeRowByIdController,
  getFmsAlternativesColumnByIdController,
  getFmsAlternativesSectionController,
  getPublicFmsAlternativesSectionController,
  reorderFmsAlternativeRowsController,
  reorderFmsAlternativesColumnsController,
  updateFmsAlternativeRowController,
  updateFmsAlternativeRowStatusController,
  updateFmsAlternativesColumnController,
  updateFmsAlternativesColumnStatusController,
  updateFmsAlternativesSectionController,
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
router.get('/', read, asyncHandler(getFmsAlternativesSectionController));
router.put('/', update, asyncHandler(updateFmsAlternativesSectionController));

/*
 * 'reorder' is declared before ':id' in both groups - Express matches in
 * registration order, so the reverse would parse it as an id and fail UUID
 * validation.
 */
router.get('/columns', read, asyncHandler(getAllFmsAlternativesColumnsController));
router.post('/columns', create, asyncHandler(createFmsAlternativesColumnController));
router.put('/columns/reorder', update, asyncHandler(reorderFmsAlternativesColumnsController));
router.get('/columns/:id', read, asyncHandler(getFmsAlternativesColumnByIdController));
router.put('/columns/:id', update, asyncHandler(updateFmsAlternativesColumnController));
router.put(
  '/columns/:id/status',
  update,
  asyncHandler(updateFmsAlternativesColumnStatusController),
);
router.delete('/columns/:id', destroy, asyncHandler(deleteFmsAlternativesColumnController));

router.get('/rows', read, asyncHandler(getAllFmsAlternativeRowsController));
router.post('/rows', create, asyncHandler(createFmsAlternativeRowController));
router.put('/rows/reorder', update, asyncHandler(reorderFmsAlternativeRowsController));
router.get('/rows/:id', read, asyncHandler(getFmsAlternativeRowByIdController));
router.put('/rows/:id', update, asyncHandler(updateFmsAlternativeRowController));
router.put('/rows/:id/status', update, asyncHandler(updateFmsAlternativeRowStatusController));
router.delete('/rows/:id', destroy, asyncHandler(deleteFmsAlternativeRowController));

export default router;

/** The website-facing read: the whole grid in one response. */
export const publicFmsAlternativesSectionRouter = Router();

publicFmsAlternativesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmsAlternativesSectionController),
);
