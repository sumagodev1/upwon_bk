// src/modules/industry-pages/food-processing-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicFoodProcessingHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicFoodProcessingTrustSectionRouter } from './trust-section.routes';
import platformSectionRoutes, {
  publicFoodProcessingPlatformSectionRouter,
} from './platform-section.routes';
import coverageSectionRoutes, {
  publicFoodProcessingCoverageSectionRouter,
} from './coverage-section.routes';
import faqSectionRoutes, { publicFoodProcessingFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicFoodProcessingCtaSectionRouter } from './cta-section.routes';

/**
 * The Food Processing industry page, one router per section - the same
 * arrangement as the product pages and the home page. Adding the next section
 * is two lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads the trust, platform, coverage, FAQ and closing sections is
 * not here: it is served by the shared section-copy router under
 * ('food-processing', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/trust-section', trustSectionRoutes);
router.use('/platform-section', platformSectionRoutes);
router.use('/coverage-section', coverageSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicFoodProcessingPageRouter = Router();

publicFoodProcessingPageRouter.use('/hero-section', publicFoodProcessingHeroSectionRouter);
publicFoodProcessingPageRouter.use('/trust-section', publicFoodProcessingTrustSectionRouter);
publicFoodProcessingPageRouter.use('/platform-section', publicFoodProcessingPlatformSectionRouter);
publicFoodProcessingPageRouter.use('/coverage-section', publicFoodProcessingCoverageSectionRouter);
publicFoodProcessingPageRouter.use('/faq-section', publicFoodProcessingFaqSectionRouter);
publicFoodProcessingPageRouter.use('/cta-section', publicFoodProcessingCtaSectionRouter);
