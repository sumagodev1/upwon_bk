// src/modules/about-page/routes/founder-note.routes.ts

import { Router } from 'express';
import {
  getAboutFounderNoteController,
  getPublicAboutFounderNoteController,
  replaceAboutFounderNoteController,
} from '../controllers/founder-note.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /about-page/founder-note behind authentication. A
 * singleton: GET reads it and PUT replaces it, creating it on the first save.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_READ),
  asyncHandler(getAboutFounderNoteController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(replaceAboutFounderNoteController),
);

export default router;

/** Public router: read-only, in the narrowed PublicAboutFounderNote shape. */
export const publicAboutFounderNoteRouter = Router();

publicAboutFounderNoteRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicAboutFounderNoteController),
);
