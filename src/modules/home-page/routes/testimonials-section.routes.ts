// src/modules/home-page/routes/testimonials-section.routes.ts

import { Router } from 'express';
import {
  createTestimonialEntryController,
  deleteTestimonialEntryController,
  getAllTestimonialEntriesController,
  getPublicTestimonialsSectionController,
  getTestimonialEntryByIdController,
  reorderTestimonialEntriesController,
  updateTestimonialEntryController,
  updateTestimonialEntryStatusController,
} from '../controllers/testimonials-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router for the client video testimonials section.
 *
 * Deliberately the same surface as the other home page sections: a list of
 * entries with the same lifecycle gets the same routes rather than a shape of
 * its own to learn.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getAllTestimonialEntriesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_CREATE),
  asyncHandler(createTestimonialEntryController),
);

/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(reorderTestimonialEntriesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getTestimonialEntryByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateTestimonialEntryController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateTestimonialEntryStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_DELETE),
  asyncHandler(deleteTestimonialEntryController),
);

export default router;

/**
 * Public router, mounted outside the authentication middleware.
 *
 * One endpoint returning the assembled section, not the rows: the site renders
 * one heading beside one marquee, and folding the cards back into that shape
 * is the server's job rather than the browser's.
 */
export const publicTestimonialsSectionRouter = Router();

publicTestimonialsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicTestimonialsSectionController),
);
