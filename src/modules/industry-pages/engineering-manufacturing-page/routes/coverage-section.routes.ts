// src/modules/industry-pages/engineering-manufacturing-page/routes/coverage-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createEngineeringCoverageCategoryController,
  deleteEngineeringCoverageCategoryController,
  getAllEngineeringCoverageCategoriesController,
  getEngineeringCoveragePanelController,
  getEngineeringCoverageCategoryByIdController,
  getPublicEngineeringCoverageSectionController,
  reorderEngineeringCoverageCategoriesController,
  updateEngineeringCoveragePanelController,
  updateEngineeringCoverageCategoryController,
  updateEngineeringCoverageCategoryStatusController,
} from '../controllers/coverage-section.controller';
import { getEngineeringIconsController } from '../controllers/trust-section.controller';

/**
 * Admin router for the industry coverage section.
 *
 * Two groups under one mount: the background panel, read and replaced as one
 * record, and the categories, a list. The copy is served by the shared
 * section-copy router under ('engineering-manufacturing', 'coverage').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/icons', read, asyncHandler(getEngineeringIconsController));

// The background panel.
router.get('/panel', read, asyncHandler(getEngineeringCoveragePanelController));
router.put('/panel', update, asyncHandler(updateEngineeringCoveragePanelController));

// The categories.
router.get('/categories', read, asyncHandler(getAllEngineeringCoverageCategoriesController));
router.post('/categories', create, asyncHandler(createEngineeringCoverageCategoryController));
/*
 * Declared before '/categories/:id' - Express matches in registration order, so
 * the reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/categories/reorder',
  update,
  asyncHandler(reorderEngineeringCoverageCategoriesController),
);
router.get('/categories/:id', read, asyncHandler(getEngineeringCoverageCategoryByIdController));
router.put('/categories/:id', update, asyncHandler(updateEngineeringCoverageCategoryController));
router.put(
  '/categories/:id/status',
  update,
  asyncHandler(updateEngineeringCoverageCategoryStatusController),
);
router.delete(
  '/categories/:id',
  destroy,
  asyncHandler(deleteEngineeringCoverageCategoryController),
);

export default router;

/** The website-facing read: the copy, the panel and the categories, in one call. */
export const publicEngineeringCoverageSectionRouter = Router();

publicEngineeringCoverageSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicEngineeringCoverageSectionController),
);
