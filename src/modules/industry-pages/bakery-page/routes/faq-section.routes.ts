// src/modules/industry-pages/bakery-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBakeryFaqEntryController,
  deleteBakeryFaqEntryController,
  getAllBakeryFaqEntriesController,
  getBakeryFaqEntryByIdController,
  getPublicBakeryFaqSectionController,
  reorderBakeryFaqEntriesController,
  updateBakeryFaqEntryController,
  updateBakeryFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the Bakery page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllBakeryFaqEntriesController));
router.post('/', create, asyncHandler(createBakeryFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderBakeryFaqEntriesController));
router.get('/:id', read, asyncHandler(getBakeryFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateBakeryFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateBakeryFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteBakeryFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicBakeryFaqSectionRouter = Router();

publicBakeryFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBakeryFaqSectionController),
);
