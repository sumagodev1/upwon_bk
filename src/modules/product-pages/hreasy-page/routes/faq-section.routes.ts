// src/modules/product-pages/hreasy-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createHreasyFaqEntryController,
  deleteHreasyFaqEntryController,
  getAllHreasyFaqEntriesController,
  getHreasyFaqEntryByIdController,
  getPublicHreasyFaqSectionController,
  reorderHreasyFaqEntriesController,
  updateHreasyFaqEntryController,
  updateHreasyFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the HREasy page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllHreasyFaqEntriesController));
router.post('/', create, asyncHandler(createHreasyFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderHreasyFaqEntriesController));
router.get('/:id', read, asyncHandler(getHreasyFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateHreasyFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateHreasyFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteHreasyFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicHreasyFaqSectionRouter = Router();

publicHreasyFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicHreasyFaqSectionController),
);
