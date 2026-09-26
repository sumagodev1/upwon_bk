// src/modules/industry-pages/food-processing-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFoodProcessingFaqEntryController,
  deleteFoodProcessingFaqEntryController,
  getAllFoodProcessingFaqEntriesController,
  getFoodProcessingFaqEntryByIdController,
  getPublicFoodProcessingFaqSectionController,
  reorderFoodProcessingFaqEntriesController,
  updateFoodProcessingFaqEntryController,
  updateFoodProcessingFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the Food Processing page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllFoodProcessingFaqEntriesController));
router.post('/', create, asyncHandler(createFoodProcessingFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderFoodProcessingFaqEntriesController));
router.get('/:id', read, asyncHandler(getFoodProcessingFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateFoodProcessingFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateFoodProcessingFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteFoodProcessingFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicFoodProcessingFaqSectionRouter = Router();

publicFoodProcessingFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFoodProcessingFaqSectionController),
);
