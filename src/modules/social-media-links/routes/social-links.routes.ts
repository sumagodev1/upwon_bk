// src/modules/social-media-links/routes/social-links.routes.ts

import { Router } from 'express';
import {
  createSocialLinkController,
  deleteSocialLinkController,
  getAllSocialLinksController,
  getSocialLinkByIdController,
  reorderSocialLinksController,
  updateSocialLinkController,
  updateSocialLinkStatusController,
} from '../controllers/social-links.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /social-media-links/social-links behind
 * authentication.
 *
 * The footer's row of social icon buttons, on exactly the contact lines' shape
 * - see contact-lines.routes.ts. Same two keys, same routes, no public router
 * of its own: the icons are served inside /public/social-media-links.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_READ),
  asyncHandler(getAllSocialLinksController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_UPDATE),
  asyncHandler(createSocialLinkController),
);

// Declared before '/:id', or 'reorder' would be parsed as a link id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_UPDATE),
  asyncHandler(reorderSocialLinksController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_READ),
  asyncHandler(getSocialLinkByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_UPDATE),
  asyncHandler(updateSocialLinkController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_UPDATE),
  asyncHandler(updateSocialLinkStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_UPDATE),
  asyncHandler(deleteSocialLinkController),
);

export default router;
