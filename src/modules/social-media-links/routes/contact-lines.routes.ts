// src/modules/social-media-links/routes/contact-lines.routes.ts

import { Router } from 'express';
import {
  createSocialContactLineController,
  deleteSocialContactLineController,
  getAllSocialContactLinesController,
  getSocialContactLineByIdController,
  reorderSocialContactLinesController,
  updateSocialContactLineController,
  updateSocialContactLineStatusController,
} from '../controllers/contact-lines.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /social-media-links/contact-lines behind
 * authentication.
 *
 * The footer's contact lines - address, email, phone, website - created,
 * edited, published, reordered and deleted: the same shape as the About page's
 * people, so the admin panel drives both with one list hook.
 *
 * Guarded by social_media_links.read and social_media_links.update, with no
 * separate create or delete key. The reasoning is written out beside
 * SOCIAL_MEDIA_LINKS_READ in config/constants.
 *
 * There is no public router here. The lines are served inside
 * /public/social-media-links together with the social icons, which is how the
 * footer renders them - see routes/index.ts.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_READ),
  asyncHandler(getAllSocialContactLinesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_UPDATE),
  asyncHandler(createSocialContactLineController),
);

// Declared before '/:id', or 'reorder' would be parsed as a line id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_UPDATE),
  asyncHandler(reorderSocialContactLinesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_READ),
  asyncHandler(getSocialContactLineByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_UPDATE),
  asyncHandler(updateSocialContactLineController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_UPDATE),
  asyncHandler(updateSocialContactLineStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_UPDATE),
  asyncHandler(deleteSocialContactLineController),
);

export default router;
