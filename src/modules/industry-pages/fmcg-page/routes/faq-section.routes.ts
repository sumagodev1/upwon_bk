// src/modules/industry-pages/fmcg-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmcgFaqEntryController,
  deleteFmcgFaqEntryController,
  getAllFmcgFaqEntriesController,
  getFmcgFaqEntryByIdController,
  getPublicFmcgFaqSectionController,
  reorderFmcgFaqEntriesController,
  updateFmcgFaqEntryController,
  updateFmcgFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the FMCG page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllFmcgFaqEntriesController));
router.post('/', create, asyncHandler(createFmcgFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderFmcgFaqEntriesController));
router.get('/:id', read, asyncHandler(getFmcgFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateFmcgFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateFmcgFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteFmcgFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicFmcgFaqSectionRouter = Router();

publicFmcgFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmcgFaqSectionController),
);
