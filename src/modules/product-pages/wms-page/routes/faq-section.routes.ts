// src/modules/product-pages/wms-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createWmsFaqEntryController,
  deleteWmsFaqEntryController,
  getAllWmsFaqEntriesController,
  getWmsFaqEntryByIdController,
  getPublicWmsFaqSectionController,
  reorderWmsFaqEntriesController,
  updateWmsFaqEntryController,
  updateWmsFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the WMS page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllWmsFaqEntriesController));
router.post('/', create, asyncHandler(createWmsFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderWmsFaqEntriesController));
router.get('/:id', read, asyncHandler(getWmsFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateWmsFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateWmsFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteWmsFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicWmsFaqSectionRouter = Router();

publicWmsFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWmsFaqSectionController),
);
