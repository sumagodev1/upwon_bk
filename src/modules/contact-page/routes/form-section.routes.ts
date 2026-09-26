// src/modules/contact-page/routes/form-section.routes.ts

import { Router } from 'express';
import {
  getContactFormSectionController,
  getPublicContactFormSectionController,
  replaceContactFormSectionController,
} from '../controllers/form-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /contact-page/form-section behind authentication.
 * A singleton: GET reads it, PUT replaces it.
 *
 * This router owns only the copy and the choices around the enquiry form. The
 * form's own submissions are not handled here - the website's form is still
 * client-side only.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.CONTACT_PAGE_READ),
  asyncHandler(getContactFormSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.CONTACT_PAGE_UPDATE),
  asyncHandler(replaceContactFormSectionController),
);

export default router;

/** Public router: read-only, in the narrowed PublicContactFormSection shape. */
export const publicContactFormSectionRouter = Router();

publicContactFormSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicContactFormSectionController),
);
