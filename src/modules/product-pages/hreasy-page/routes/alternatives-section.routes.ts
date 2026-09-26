// src/modules/product-pages/hreasy-page/routes/alternatives-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createHreasyAlternativeRowController,
  createHreasyAlternativesColumnController,
  deleteHreasyAlternativeRowController,
  deleteHreasyAlternativesColumnController,
  getAllHreasyAlternativeRowsController,
  getAllHreasyAlternativesColumnsController,
  getHreasyAlternativeRowByIdController,
  getHreasyAlternativesColumnByIdController,
  getHreasyAlternativesSectionController,
  getPublicHreasyAlternativesSectionController,
  reorderHreasyAlternativeRowsController,
  reorderHreasyAlternativesColumnsController,
  updateHreasyAlternativeRowController,
  updateHreasyAlternativeRowStatusController,
  updateHreasyAlternativesColumnController,
  updateHreasyAlternativesColumnStatusController,
  updateHreasyAlternativesSectionController,
} from '../controllers/alternatives-section.controller';

/**
 * Admin router for the comparison grid.
 *
 * Three groups: the leader column at the root, the competitor columns, and
 * the rows. The same layout the POS and SFA-DMS grids use - and, like the POS
 * one, there is no closing summary row: this design ends on its last need.
 *
 * The copy above the grid is not here: it is served by the shared
 * section-copy router under ('hreasy', 'alternatives').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The leader column.
router.get('/', read, asyncHandler(getHreasyAlternativesSectionController));
router.put('/', update, asyncHandler(updateHreasyAlternativesSectionController));

/*
 * 'reorder' is declared before ':id' in both groups - Express matches in
 * registration order, so the reverse would parse it as an id and fail UUID
 * validation.
 */
router.get('/columns', read, asyncHandler(getAllHreasyAlternativesColumnsController));
router.post('/columns', create, asyncHandler(createHreasyAlternativesColumnController));
router.put(
  '/columns/reorder',
  update,
  asyncHandler(reorderHreasyAlternativesColumnsController),
);
router.get('/columns/:id', read, asyncHandler(getHreasyAlternativesColumnByIdController));
router.put('/columns/:id', update, asyncHandler(updateHreasyAlternativesColumnController));
router.put(
  '/columns/:id/status',
  update,
  asyncHandler(updateHreasyAlternativesColumnStatusController),
);
router.delete('/columns/:id', destroy, asyncHandler(deleteHreasyAlternativesColumnController));

router.get('/rows', read, asyncHandler(getAllHreasyAlternativeRowsController));
router.post('/rows', create, asyncHandler(createHreasyAlternativeRowController));
router.put('/rows/reorder', update, asyncHandler(reorderHreasyAlternativeRowsController));
router.get('/rows/:id', read, asyncHandler(getHreasyAlternativeRowByIdController));
router.put('/rows/:id', update, asyncHandler(updateHreasyAlternativeRowController));
router.put(
  '/rows/:id/status',
  update,
  asyncHandler(updateHreasyAlternativeRowStatusController),
);
router.delete('/rows/:id', destroy, asyncHandler(deleteHreasyAlternativeRowController));

export default router;

/** The website-facing read: the whole grid in one response. */
export const publicHreasyAlternativesSectionRouter = Router();

publicHreasyAlternativesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicHreasyAlternativesSectionController),
);
