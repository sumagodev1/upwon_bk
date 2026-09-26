// src/modules/industry-pages/non-food-fmcg-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createNonFoodFmcgFaqEntryController,
  deleteNonFoodFmcgFaqEntryController,
  getAllNonFoodFmcgFaqEntriesController,
  getNonFoodFmcgFaqEntryByIdController,
  getPublicNonFoodFmcgFaqSectionController,
  reorderNonFoodFmcgFaqEntriesController,
  updateNonFoodFmcgFaqEntryController,
  updateNonFoodFmcgFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the Non-Food FMCG page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllNonFoodFmcgFaqEntriesController));
router.post('/', create, asyncHandler(createNonFoodFmcgFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderNonFoodFmcgFaqEntriesController));
router.get('/:id', read, asyncHandler(getNonFoodFmcgFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateNonFoodFmcgFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateNonFoodFmcgFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteNonFoodFmcgFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicNonFoodFmcgFaqSectionRouter = Router();

publicNonFoodFmcgFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicNonFoodFmcgFaqSectionController),
);
