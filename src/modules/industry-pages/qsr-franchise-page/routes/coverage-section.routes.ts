// src/modules/industry-pages/qsr-franchise-page/routes/coverage-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createQsrFranchiseCoverageCategoryController,
  deleteQsrFranchiseCoverageCategoryController,
  getAllQsrFranchiseCoverageCategoriesController,
  getPublicQsrFranchiseCoverageSectionController,
  getQsrFranchiseCoverageCategoryByIdController,
  reorderQsrFranchiseCoverageCategoriesController,
  updateQsrFranchiseCoverageCategoryController,
  updateQsrFranchiseCoverageCategoryStatusController,
} from '../controllers/coverage-section.controller';
import { getQsrFranchiseIconsController } from '../controllers/trust-section.controller';

/**
 * Admin router for the industry coverage grid: the seven routes a list section
 * gets. The copy is served by the shared section-copy router under
 * ('qsr-franchise', 'coverage').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/icons', read, asyncHandler(getQsrFranchiseIconsController));
router.get('/', read, asyncHandler(getAllQsrFranchiseCoverageCategoriesController));
router.post('/', create, asyncHandler(createQsrFranchiseCoverageCategoryController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderQsrFranchiseCoverageCategoriesController));
router.get('/:id', read, asyncHandler(getQsrFranchiseCoverageCategoryByIdController));
router.put('/:id', update, asyncHandler(updateQsrFranchiseCoverageCategoryController));
router.put('/:id/status', update, asyncHandler(updateQsrFranchiseCoverageCategoryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteQsrFranchiseCoverageCategoryController));

export default router;

/** The website-facing read: the copy and the categories, in one call. */
export const publicQsrFranchiseCoverageSectionRouter = Router();

publicQsrFranchiseCoverageSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicQsrFranchiseCoverageSectionController),
);
