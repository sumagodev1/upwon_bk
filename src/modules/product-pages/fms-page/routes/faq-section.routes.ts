// src/modules/product-pages/fms-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmsFaqEntryController,
  deleteFmsFaqEntryController,
  getAllFmsFaqEntriesController,
  getFmsFaqEntryByIdController,
  getPublicFmsFaqSectionController,
  reorderFmsFaqEntriesController,
  updateFmsFaqEntryController,
  updateFmsFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the FMS page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllFmsFaqEntriesController));
router.post('/', create, asyncHandler(createFmsFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderFmsFaqEntriesController));
router.get('/:id', read, asyncHandler(getFmsFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateFmsFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateFmsFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteFmsFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicFmsFaqSectionRouter = Router();

publicFmsFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmsFaqSectionController),
);
