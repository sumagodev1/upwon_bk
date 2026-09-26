// src/modules/why-upwon-page/routes/results-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import {
  createWhyUpwonResultController,
  deleteWhyUpwonResultController,
  getAllWhyUpwonResultsController,
  getWhyUpwonResultsPanelController,
  getWhyUpwonResultsIconsController,
  getWhyUpwonResultByIdController,
  getPublicWhyUpwonResultsSectionController,
  reorderWhyUpwonResultsController,
  updateWhyUpwonResultsPanelController,
  updateWhyUpwonResultController,
  updateWhyUpwonResultStatusController,
} from '../controllers/results-section.controller';

/**
 * Admin router for the core results.
 *
 * The seven routes a list section gets, the visuals panel read and
 * replaced as one record, and the icon names for the picker. The copy is
 * served by the shared section-copy router under ('why-upwon', 'outcomes').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getWhyUpwonResultsIconsController));
router.get('/panel', read, asyncHandler(getWhyUpwonResultsPanelController));
router.put('/panel', update, asyncHandler(updateWhyUpwonResultsPanelController));
router.get('/', read, asyncHandler(getAllWhyUpwonResultsController));
router.post('/', create, asyncHandler(createWhyUpwonResultController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderWhyUpwonResultsController));
router.get('/:id', read, asyncHandler(getWhyUpwonResultByIdController));
router.put('/:id', update, asyncHandler(updateWhyUpwonResultController));
router.put('/:id/status', update, asyncHandler(updateWhyUpwonResultStatusController));
router.delete('/:id', destroy, asyncHandler(deleteWhyUpwonResultController));

export default router;

/** The website-facing read: the copy, the artwork and the results, in one call. */
export const publicWhyUpwonResultsSectionRouter = Router();

publicWhyUpwonResultsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWhyUpwonResultsSectionController),
);
