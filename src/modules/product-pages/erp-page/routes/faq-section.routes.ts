// src/modules/product-pages/erp-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createErpFaqEntryController,
  deleteErpFaqEntryController,
  getAllErpFaqEntriesController,
  getErpFaqEntryByIdController,
  getPublicErpFaqSectionController,
  reorderErpFaqEntriesController,
  updateErpFaqEntryController,
  updateErpFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the ERP page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllErpFaqEntriesController));
router.post('/', create, asyncHandler(createErpFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderErpFaqEntriesController));
router.get('/:id', read, asyncHandler(getErpFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateErpFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateErpFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteErpFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicErpFaqSectionRouter = Router();

publicErpFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicErpFaqSectionController),
);
