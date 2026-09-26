// src/modules/industry-pages/spices-agro-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSpicesAgroFaqEntryController,
  deleteSpicesAgroFaqEntryController,
  getAllSpicesAgroFaqEntriesController,
  getSpicesAgroFaqEntryByIdController,
  getPublicSpicesAgroFaqSectionController,
  reorderSpicesAgroFaqEntriesController,
  updateSpicesAgroFaqEntryController,
  updateSpicesAgroFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the Spices & Agro Processing page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllSpicesAgroFaqEntriesController));
router.post('/', create, asyncHandler(createSpicesAgroFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderSpicesAgroFaqEntriesController));
router.get('/:id', read, asyncHandler(getSpicesAgroFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateSpicesAgroFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateSpicesAgroFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteSpicesAgroFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicSpicesAgroFaqSectionRouter = Router();

publicSpicesAgroFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSpicesAgroFaqSectionController),
);
