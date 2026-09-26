// src/modules/industry-pages/spices-agro-page/routes/coverage-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSpicesAgroCoverageCategoryController,
  deleteSpicesAgroCoverageCategoryController,
  getAllSpicesAgroCoverageCategoriesController,
  getPublicSpicesAgroCoverageSectionController,
  getSpicesAgroCoverageCategoryByIdController,
  reorderSpicesAgroCoverageCategoriesController,
  updateSpicesAgroCoverageCategoryController,
  updateSpicesAgroCoverageCategoryStatusController,
} from '../controllers/coverage-section.controller';

/**
 * Admin router for the industry coverage grid: the seven routes a list section
 * gets. The copy is served by the shared section-copy router under
 * ('spices-agro', 'coverage').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllSpicesAgroCoverageCategoriesController));
router.post('/', create, asyncHandler(createSpicesAgroCoverageCategoryController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderSpicesAgroCoverageCategoriesController));
router.get('/:id', read, asyncHandler(getSpicesAgroCoverageCategoryByIdController));
router.put('/:id', update, asyncHandler(updateSpicesAgroCoverageCategoryController));
router.put('/:id/status', update, asyncHandler(updateSpicesAgroCoverageCategoryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteSpicesAgroCoverageCategoryController));

export default router;

/** The website-facing read: the copy and the categories, in one call. */
export const publicSpicesAgroCoverageSectionRouter = Router();

publicSpicesAgroCoverageSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSpicesAgroCoverageSectionController),
);
