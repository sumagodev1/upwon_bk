// src/modules/industry-pages/beverage-page/routes/coverage-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBeverageCoverageCategoryController,
  deleteBeverageCoverageCategoryController,
  getAllBeverageCoverageCategoriesController,
  getBeverageCoverageCategoryByIdController,
  getPublicBeverageCoverageSectionController,
  reorderBeverageCoverageCategoriesController,
  updateBeverageCoverageCategoryController,
  updateBeverageCoverageCategoryStatusController,
} from '../controllers/coverage-section.controller';
import { getBeverageIconsController } from '../controllers/platform-section.controller';

/**
 * Admin router for the industry coverage grid.
 *
 * The seven routes a list section gets, plus the icon names for the picker -
 * the same allowlist the connected platform section uses. The copy is served
 * by the shared section-copy router under ('beverage', 'coverage').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getBeverageIconsController));
router.get('/', read, asyncHandler(getAllBeverageCoverageCategoriesController));
router.post('/', create, asyncHandler(createBeverageCoverageCategoryController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderBeverageCoverageCategoriesController));
router.get('/:id', read, asyncHandler(getBeverageCoverageCategoryByIdController));
router.put('/:id', update, asyncHandler(updateBeverageCoverageCategoryController));
router.put('/:id/status', update, asyncHandler(updateBeverageCoverageCategoryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteBeverageCoverageCategoryController));

export default router;

/** The website-facing read: the copy and the categories, in one call. */
export const publicBeverageCoverageSectionRouter = Router();

publicBeverageCoverageSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBeverageCoverageSectionController),
);
