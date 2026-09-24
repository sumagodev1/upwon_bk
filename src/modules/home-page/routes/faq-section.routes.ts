// src/modules/home-page/routes/faq-section.routes.ts

import { Router } from 'express';
import {
  createFaqEntryController,
  deleteFaqEntryController,
  getAllFaqEntriesController,
  getFaqEntryByIdController,
  getPublicFaqSectionController,
  reorderFaqEntriesController,
  updateFaqEntryController,
  updateFaqEntryStatusController,
} from '../controllers/faq-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router for the frequently asked questions section.
 *
 * Deliberately the same surface as the other home page sections: a list of
 * entries with the same lifecycle gets the same routes rather than a shape of
 * its own to learn.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getAllFaqEntriesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_CREATE),
  asyncHandler(createFaqEntryController),
);

/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(reorderFaqEntriesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getFaqEntryByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateFaqEntryController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateFaqEntryStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_DELETE),
  asyncHandler(deleteFaqEntryController),
);

export default router;

/**
 * Public router, mounted outside the authentication middleware.
 *
 * One endpoint returning the assembled section, not the rows: the site renders
 * one heading above one accordion, and folding the questions back into that
 * shape is the server's job rather than the browser's.
 */
export const publicFaqSectionRouter = Router();

publicFaqSectionRouter.get('/', standardRateLimit, asyncHandler(getPublicFaqSectionController));
