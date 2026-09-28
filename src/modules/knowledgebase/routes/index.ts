// src/modules/knowledgebase/routes/index.ts

import { Router } from 'express';
import { getKbIconsController } from '../controllers/knowledgebase.controller';
import articlesRoutes from './articles.routes';
import categoriesRoutes, { publicKbCategoriesRouter } from './categories.routes';
import heroSectionRoutes, { publicKbHeroSectionRouter } from './hero-section.routes';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * The /knowledgebase pages - the hub, each category's page and each article -
 * managed from the admin panel's "Resource Page > Knowledgebase" sidebar item.
 * One router per tab, on the Blog's pattern:
 *
 *   /hero-section   ordered child list: the hub's hero carousel, on the Blog
 *                   hero's routes.
 *   /categories     ordered child list: the hub's cards, each of which is also
 *                   a /knowledgebase/<slug> page.
 *   /articles       the guides, ordered by their "Updated" date.
 *
 * Plus /icons, the allowlist a category's icon is picked from - the Blog's
 * list (see utils/icons.ts), served here on this module's own read key.
 *
 * Two permission keys cover all of it - knowledgebase.read and
 * knowledgebase.update; see the note above KNOWLEDGEBASE_READ in
 * config/constants for why there is no finer split.
 *
 * Nothing else on those pages is here. The buttons, the article page's "See
 * this working" demo box and the "Browse the knowledgebase" links are fixed
 * in the website's code and have no section in this CMS.
 */
const router = Router();

router.get(
  '/icons',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_READ),
  asyncHandler(getKbIconsController),
);
router.use('/hero-section', heroSectionRoutes);
router.use('/categories', categoriesRoutes);
router.use('/articles', articlesRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, like the other public routers.
 *
 * /hero-section is always a 200: the ACTIVE slides in order, an empty list
 * when there are none, so the site keeps its built-in slide. /categories is
 * always a 200 too and says "nothing authored" through hasCategories; a
 * category's page and an article under it are a 200 or a 404.
 *
 * Read-only. Nothing under /public/knowledgebase accepts a write, so
 * scripts/route-audit.js needs no allowlist entry for it.
 */
export const publicKnowledgebaseRouter = Router();

publicKnowledgebaseRouter.use('/hero-section', publicKbHeroSectionRouter);
publicKnowledgebaseRouter.use('/categories', publicKbCategoriesRouter);
