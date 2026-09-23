// src/modules/home-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicTrustSectionRouter } from './trust-section.routes';
import industriesSectionRoutes, {
  publicIndustriesSectionRouter,
} from './industries-section.routes';
import valuesSectionRoutes, { publicValuesSectionRouter } from './values-section.routes';

/**
 * The home page is one module with one router per section, each owning its own
 * controller, service, repository, validator, and types. Adding the next section
 * is two lines here and one new set of files - nothing in src/routes changes.
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/trust-section', trustSectionRoutes);
router.use('/industries-section', industriesSectionRoutes);
router.use('/values-section', valuesSectionRoutes);

export default router;

/**
 * The website-facing half of the same sections. Mounted before the
 * authentication middleware in src/routes/index.ts; see the public router in
 * hero-section.routes.ts for the reasoning.
 */
export const publicHomePageRouter = Router();

publicHomePageRouter.use('/hero-section', publicHeroSectionRouter);
publicHomePageRouter.use('/trust-section', publicTrustSectionRouter);
publicHomePageRouter.use('/industries-section', publicIndustriesSectionRouter);
publicHomePageRouter.use('/values-section', publicValuesSectionRouter);
