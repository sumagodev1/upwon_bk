// src/modules/blog/routes/index.ts

import { Router } from 'express';
import { getBlogIconsController } from '../controllers/blog.controller';
import categoriesRoutes from './categories.routes';
import heroSectionRoutes, { publicBlogHeroSectionRouter } from './hero-section.routes';
import postsRoutes, { publicBlogPostsRouter } from './posts.routes';
import topicsSectionRoutes, { publicBlogTopicsSectionRouter } from './topics-section.routes';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * The /blog page, managed from the admin panel's "Resource Page > Blog"
 * sidebar item. One router per section, on the About page's pattern:
 *
 *   /hero-section     ordered child list: the hero carousel's slides, on the
 *                     Insider hero's routes.
 *   /topics-section   singleton: the "Insights by Topic" intro.
 *   /categories       ordered child list: the topic chips.
 *   /posts            the articles, ordered by publish date.
 *
 * Plus /icons, the allowlist a category's icon is picked from, served so the
 * panel's picker can never offer a name the validator would refuse.
 *
 * Two permission keys cover all of it - blog.read and blog.update; see the
 * note above BLOG_READ in config/constants for why there is no finer split.
 */
const router = Router();

router.get(
  '/icons',
  requirePermission(PERMISSIONS.BLOG_READ),
  asyncHandler(getBlogIconsController),
);
router.use('/hero-section', heroSectionRoutes);
router.use('/topics-section', topicsSectionRoutes);
router.use('/categories', categoriesRoutes);
router.use('/posts', postsRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, like the other public routers.
 *
 * /hero-section is always a 200: the ACTIVE slides in order, an empty list
 * when there are none. /topics-section answers 404 until authored, so the
 * site keeps its own built-in copy; /posts is always a 200 and says "nothing
 * authored" through its has* flags instead. The categories have no public
 * route of their own - they arrive inside /posts, beside the posts they count.
 *
 * Read-only. Nothing under /public/blog accepts a write, so
 * scripts/route-audit.js needs no allowlist entry for it.
 */
export const publicBlogRouter = Router();

publicBlogRouter.use('/hero-section', publicBlogHeroSectionRouter);
publicBlogRouter.use('/topics-section', publicBlogTopicsSectionRouter);
publicBlogRouter.use('/posts', publicBlogPostsRouter);
