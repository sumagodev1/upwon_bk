// src/modules/contact-page/routes/contact-details.routes.ts

import { Router } from 'express';
import {
  getContactDetailsSectionController,
  getPublicContactDetailsSectionController,
  replaceContactDetailsSectionController,
} from '../controllers/contact-details.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /contact-page/contact-details behind
 * authentication. A singleton holding both side cards - "Where we are" and
 * "Direct lines" - so GET reads them and PUT replaces them together.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.CONTACT_PAGE_READ),
  asyncHandler(getContactDetailsSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.CONTACT_PAGE_UPDATE),
  asyncHandler(replaceContactDetailsSectionController),
);

export default router;

/**
 * Public router: read-only, in the narrowed PublicContactDetailsSection shape
 * - see the home hero's public router for the reasoning.
 */
export const publicContactDetailsSectionRouter = Router();

publicContactDetailsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicContactDetailsSectionController),
);
