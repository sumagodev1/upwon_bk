// src/modules/product-pages/pos-page/routes/recognition-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createPosRecognitionCategoryController,
  deletePosRecognitionCategoryController,
  getAllPosRecognitionCategoriesController,
  getPosRecognitionCategoryByIdController,
  getPublicPosRecognitionSectionController,
  reorderPosRecognitionCategoriesController,
  updatePosRecognitionCategoryController,
  updatePosRecognitionCategoryStatusController,
} from '../controllers/recognition-section.controller';

/**
 * Admin router for the category map.
 *
 * One group, unlike the proof strip's two: the section is a heading and a
 * grid, and the grid is a single list.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllPosRecognitionCategoriesController));
router.post('/', create, asyncHandler(createPosRecognitionCategoryController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderPosRecognitionCategoriesController));
router.get('/:id', read, asyncHandler(getPosRecognitionCategoryByIdController));
router.put('/:id', update, asyncHandler(updatePosRecognitionCategoryController));
router.put('/:id/status', update, asyncHandler(updatePosRecognitionCategoryStatusController));
router.delete('/:id', destroy, asyncHandler(deletePosRecognitionCategoryController));

export default router;

/** The website-facing read: the copy and the cards, in one call. */
export const publicPosRecognitionSectionRouter = Router();

publicPosRecognitionSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicPosRecognitionSectionController),
);
