// src/modules/product-pages/sfa-dms-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSfaFaqEntryController,
  deleteSfaFaqEntryController,
  getAllSfaFaqEntriesController,
  getSfaFaqEntryByIdController,
  getPublicSfaFaqSectionController,
  reorderSfaFaqEntriesController,
  updateSfaFaqEntryController,
  updateSfaFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the SFA-DMS page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllSfaFaqEntriesController));
router.post('/', create, asyncHandler(createSfaFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderSfaFaqEntriesController));
router.get('/:id', read, asyncHandler(getSfaFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateSfaFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateSfaFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteSfaFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicSfaFaqSectionRouter = Router();

publicSfaFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSfaFaqSectionController),
);
