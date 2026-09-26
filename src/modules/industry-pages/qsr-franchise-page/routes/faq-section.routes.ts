// src/modules/industry-pages/qsr-franchise-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createQsrFranchiseFaqEntryController,
  deleteQsrFranchiseFaqEntryController,
  getAllQsrFranchiseFaqEntriesController,
  getQsrFranchiseFaqEntryByIdController,
  getPublicQsrFranchiseFaqSectionController,
  reorderQsrFranchiseFaqEntriesController,
  updateQsrFranchiseFaqEntryController,
  updateQsrFranchiseFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the QSR & Franchise F&B page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllQsrFranchiseFaqEntriesController));
router.post('/', create, asyncHandler(createQsrFranchiseFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderQsrFranchiseFaqEntriesController));
router.get('/:id', read, asyncHandler(getQsrFranchiseFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateQsrFranchiseFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateQsrFranchiseFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteQsrFranchiseFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicQsrFranchiseFaqSectionRouter = Router();

publicQsrFranchiseFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicQsrFranchiseFaqSectionController),
);
