// src/modules/partner-program/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  getPartnerProgramHeroSectionController,
  getPublicPartnerProgramHeroSectionController,
  replacePartnerProgramHeroSectionController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /partner-program/hero-section behind authentication.
 * A singleton, so there is no id, no list, and no create or delete: GET reads it
 * and PUT replaces it (creating it on the first save).
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.PARTNER_PROGRAM_READ),
  asyncHandler(getPartnerProgramHeroSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.PARTNER_PROGRAM_UPDATE),
  asyncHandler(replacePartnerProgramHeroSectionController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API. Read-only, in the
 * narrowed PublicPartnerProgramHeroSection shape - see the home hero's public
 * router for the reasoning.
 */
export const publicPartnerProgramHeroSectionRouter = Router();

publicPartnerProgramHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicPartnerProgramHeroSectionController),
);
