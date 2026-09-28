// src/modules/industry-pages/dairy-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createDairyFaqEntryController,
  deleteDairyFaqEntryController,
  getAllDairyFaqEntriesController,
  getDairyFaqEntryByIdController,
  getPublicDairyFaqSectionController,
  reorderDairyFaqEntriesController,
  updateDairyFaqEntryController,
  updateDairyFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the Dairy & Ice Cream page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllDairyFaqEntriesController));
router.post('/', create, asyncHandler(createDairyFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderDairyFaqEntriesController));
router.get('/:id', read, asyncHandler(getDairyFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateDairyFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateDairyFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteDairyFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicDairyFaqSectionRouter = Router();

publicDairyFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicDairyFaqSectionController),
);
