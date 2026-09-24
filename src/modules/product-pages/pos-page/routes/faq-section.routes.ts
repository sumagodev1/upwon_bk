// src/modules/product-pages/pos-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createPosFaqEntryController,
  deletePosFaqEntryController,
  getAllPosFaqEntriesController,
  getPosFaqEntryByIdController,
  getPublicPosFaqSectionController,
  reorderPosFaqEntriesController,
  updatePosFaqEntryController,
  updatePosFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the POS page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllPosFaqEntriesController));
router.post('/', create, asyncHandler(createPosFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderPosFaqEntriesController));
router.get('/:id', read, asyncHandler(getPosFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updatePosFaqEntryController));
router.put('/:id/status', update, asyncHandler(updatePosFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deletePosFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicPosFaqSectionRouter = Router();

publicPosFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicPosFaqSectionController),
);
