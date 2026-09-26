// src/modules/social-media-links/routes/index.ts

import { Router } from 'express';
import {
  getPublicSocialMediaLinksController,
  getSocialMediaIconsController,
} from '../controllers/social-media-links.controller';
import contactLinesRoutes from './contact-lines.routes';
import socialLinksRoutes from './social-links.routes';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * The site footer's "how to reach us" block, as its own sidebar item in the
 * admin panel rather than a tab of the Contact page: the footer is on every
 * page of the site, not only on /contact.
 *
 * Two ordered child lists with no section above them - the footer has no
 * heading over either for an admin to author:
 *
 *   /contact-lines   the address, email, phone and website lines under the
 *                    brand block, each with an icon.
 *   /social-links    the row of square icon buttons beneath them.
 *
 * Plus /icons, the one allowlist both lists pick from, served so the panel's
 * picker can never offer a name the validators would refuse.
 *
 * Nothing else in the footer is here. Its link columns, the brand block's copy
 * and the copyright line stay in the website's code.
 */
const router = Router();

router.get(
  '/icons',
  requirePermission(PERMISSIONS.SOCIAL_MEDIA_LINKS_READ),
  asyncHandler(getSocialMediaIconsController),
);
router.use('/contact-lines', contactLinesRoutes);
router.use('/social-links', socialLinksRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, like the other public routers.
 *
 * ONE read at the area's root, not one per list: the footer renders both lists
 * as one block on every page, so it asks once - see
 * socialMediaLinksService.getPublished for the shape and why it is always a 200.
 *
 * Read-only. Nothing under /public/social-media-links accepts a write, so
 * scripts/route-audit.js needs no allowlist entry for it.
 */
export const publicSocialMediaLinksRouter = Router();

publicSocialMediaLinksRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSocialMediaLinksController),
);
