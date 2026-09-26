// src/modules/insider-page/routes/index.ts

import { Router } from 'express';
import featureSectionRoutes, {
  publicInsiderFeatureSectionRouter,
} from './feature-section.routes';
import heroSectionRoutes, { publicInsiderHeroSectionRouter } from './hero-section.routes';
import issuesRoutes, { publicInsiderIssuesRouter } from './issues.routes';

/**
 * The Insider (newsletter) page, on the home page module's pattern: one router
 * per section, each owning its own controller, service, repository, validator,
 * and types. The site still serves it at /newsletter; "Insider" is its name in
 * the admin panel and the API.
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/issues', issuesRoutes);
router.use('/feature-section', featureSectionRoutes);

export default router;

/**
 * The website-facing half of the same sections. Mounted before the
 * authentication middleware in src/routes/index.ts, like the home page's.
 */
export const publicInsiderPageRouter = Router();

publicInsiderPageRouter.use('/hero-section', publicInsiderHeroSectionRouter);
publicInsiderPageRouter.use('/issues', publicInsiderIssuesRouter);
publicInsiderPageRouter.use('/feature-section', publicInsiderFeatureSectionRouter);
