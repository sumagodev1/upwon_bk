// src/modules/product-pages/vendor-portal-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createVmsFaqEntryController,
  deleteVmsFaqEntryController,
  getAllVmsFaqEntriesController,
  getPublicVmsFaqSectionController,
  getVmsFaqEntryByIdController,
  reorderVmsFaqEntriesController,
  updateVmsFaqEntryController,
  updateVmsFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/**
 * Admin router for the FAQ.
 *
 * The copy that heads it is not here - it is served by the shared
 * section-copy router under ('vms', 'faq').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllVmsFaqEntriesController));
router.post('/', create, asyncHandler(createVmsFaqEntryController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderVmsFaqEntriesController));
router.get('/:id', read, asyncHandler(getVmsFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateVmsFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateVmsFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteVmsFaqEntryController));

export default router;

/** The website-facing read: the copy and the questions, in one call. */
export const publicVmsFaqSectionRouter = Router();

publicVmsFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicVmsFaqSectionController),
);
