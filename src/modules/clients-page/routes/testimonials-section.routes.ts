// src/modules/clients-page/routes/testimonials-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import {
  createClientsTestimonialController,
  deleteClientsTestimonialController,
  getAllClientsTestimonialsController,
  getClientsTestimonialByIdController,
  getPublicClientsTestimonialsSectionController,
  reorderClientsTestimonialsController,
  updateClientsTestimonialController,
  updateClientsTestimonialStatusController,
} from '../controllers/testimonials-section.controller';

/**
 * Admin router for the testimonials marquee, mounted under the authenticated
 * API at /clients-page/testimonials-section. The section copy above the
 * marquee is edited through the shared
 * /home-page/section-copy/clients/testimonials route.
 */

const read = requirePermission(PERMISSIONS.CLIENTS_PAGE_READ);
const create = requirePermission(PERMISSIONS.CLIENTS_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.CLIENTS_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.CLIENTS_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllClientsTestimonialsController));
router.post('/', create, asyncHandler(createClientsTestimonialController));
// Declared before '/:id', or 'reorder' would be parsed as an id.
router.put('/reorder', update, asyncHandler(reorderClientsTestimonialsController));
router.get('/:id', read, asyncHandler(getClientsTestimonialByIdController));
router.put('/:id', update, asyncHandler(updateClientsTestimonialController));
router.put('/:id/status', update, asyncHandler(updateClientsTestimonialStatusController));
router.delete('/:id', destroy, asyncHandler(deleteClientsTestimonialController));

export default router;

/** The website-facing read: the copy and its testimonials, in one response. */
export const publicClientsTestimonialsSectionRouter = Router();

publicClientsTestimonialsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicClientsTestimonialsSectionController),
);
