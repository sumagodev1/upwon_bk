// src/modules/industry-pages/dairy-page/routes/coverage-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createDairyCoverageItemController,
  deleteDairyCoverageItemController,
  getAllDairyCoverageItemsController,
  getDairyCoverageItemByIdController,
  getPublicDairyCoverageSectionController,
  reorderDairyCoverageItemsController,
  updateDairyCoverageItemController,
  updateDairyCoverageItemStatusController,
} from '../controllers/coverage-section.controller';

/**
 * Admin router for the industry coverage categories. The copy above them is served by the
 * shared section-copy router under ('dairy', 'coverage').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllDairyCoverageItemsController));
router.post('/', create, asyncHandler(createDairyCoverageItemController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderDairyCoverageItemsController));
router.get('/:id', read, asyncHandler(getDairyCoverageItemByIdController));
router.put('/:id', update, asyncHandler(updateDairyCoverageItemController));
router.put('/:id/status', update, asyncHandler(updateDairyCoverageItemStatusController));
router.delete('/:id', destroy, asyncHandler(deleteDairyCoverageItemController));

export default router;

/** The website-facing read: the copy and its categories, in one response. */
export const publicDairyCoverageSectionRouter = Router();

publicDairyCoverageSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicDairyCoverageSectionController),
);
