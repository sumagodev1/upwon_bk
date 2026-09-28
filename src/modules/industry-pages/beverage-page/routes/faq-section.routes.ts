// src/modules/industry-pages/beverage-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBeverageFaqEntryController,
  deleteBeverageFaqEntryController,
  getAllBeverageFaqEntriesController,
  getBeverageFaqEntryByIdController,
  getPublicBeverageFaqSectionController,
  reorderBeverageFaqEntriesController,
  updateBeverageFaqEntryController,
  updateBeverageFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the Beverages & Juices page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllBeverageFaqEntriesController));
router.post('/', create, asyncHandler(createBeverageFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderBeverageFaqEntriesController));
router.get('/:id', read, asyncHandler(getBeverageFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateBeverageFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateBeverageFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteBeverageFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicBeverageFaqSectionRouter = Router();

publicBeverageFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBeverageFaqSectionController),
);
