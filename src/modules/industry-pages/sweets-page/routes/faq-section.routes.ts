// src/modules/industry-pages/sweets-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSweetsFaqEntryController,
  deleteSweetsFaqEntryController,
  getAllSweetsFaqEntriesController,
  getSweetsFaqEntryByIdController,
  getPublicSweetsFaqSectionController,
  reorderSweetsFaqEntriesController,
  updateSweetsFaqEntryController,
  updateSweetsFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the Sweets page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllSweetsFaqEntriesController));
router.post('/', create, asyncHandler(createSweetsFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderSweetsFaqEntriesController));
router.get('/:id', read, asyncHandler(getSweetsFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateSweetsFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateSweetsFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteSweetsFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicSweetsFaqSectionRouter = Router();

publicSweetsFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSweetsFaqSectionController),
);
