// src/modules/why-upwon-page/routes/testimonials-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import {
  createWhyUpwonClientLogoController,
  createWhyUpwonTestimonialController,
  deleteWhyUpwonClientLogoController,
  deleteWhyUpwonTestimonialController,
  getAllWhyUpwonClientLogosController,
  getAllWhyUpwonTestimonialsController,
  getPublicWhyUpwonTestimonialsSectionController,
  getWhyUpwonClientLogoByIdController,
  getWhyUpwonTestimonialByIdController,
  getWhyUpwonTestimonialsPanelController,
  reorderWhyUpwonClientLogosController,
  reorderWhyUpwonTestimonialsController,
  updateWhyUpwonClientLogoController,
  updateWhyUpwonClientLogoStatusController,
  updateWhyUpwonTestimonialController,
  updateWhyUpwonTestimonialStatusController,
  updateWhyUpwonTestimonialsPanelController,
} from '../controllers/testimonials-section.controller';

/**
 * Admin router for the customer trust & testimonials section.
 *
 * Three groups under one mount: the testimonials, the client wall and the
 * panel. They are one band on the page but three separate edits, which is why
 * they are not one form.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The testimonials.
router.get('/testimonials', read, asyncHandler(getAllWhyUpwonTestimonialsController));
router.post('/testimonials', create, asyncHandler(createWhyUpwonTestimonialController));
/*
 * Declared before '/testimonials/:id' - Express matches in registration order,
 * so the reverse would make 'reorder' get parsed as an id and fail UUID
 * validation. The same holds for the logos below.
 */
router.put('/testimonials/reorder', update, asyncHandler(reorderWhyUpwonTestimonialsController));
router.get('/testimonials/:id', read, asyncHandler(getWhyUpwonTestimonialByIdController));
router.put('/testimonials/:id', update, asyncHandler(updateWhyUpwonTestimonialController));
router.put(
  '/testimonials/:id/status',
  update,
  asyncHandler(updateWhyUpwonTestimonialStatusController),
);
router.delete('/testimonials/:id', destroy, asyncHandler(deleteWhyUpwonTestimonialController));

// The client wall.
router.get('/logos', read, asyncHandler(getAllWhyUpwonClientLogosController));
router.post('/logos', create, asyncHandler(createWhyUpwonClientLogoController));
router.put('/logos/reorder', update, asyncHandler(reorderWhyUpwonClientLogosController));
router.get('/logos/:id', read, asyncHandler(getWhyUpwonClientLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateWhyUpwonClientLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateWhyUpwonClientLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteWhyUpwonClientLogoController));

// The panel.
router.get('/panel', read, asyncHandler(getWhyUpwonTestimonialsPanelController));
router.put('/panel', update, asyncHandler(updateWhyUpwonTestimonialsPanelController));

export default router;

/** The website-facing read: the copy, the panel and both lists, in one call. */
export const publicWhyUpwonTestimonialsSectionRouter = Router();

publicWhyUpwonTestimonialsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWhyUpwonTestimonialsSectionController),
);
