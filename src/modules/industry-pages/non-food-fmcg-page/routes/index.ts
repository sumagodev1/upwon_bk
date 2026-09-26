// src/modules/industry-pages/non-food-fmcg-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicNonFoodFmcgHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicNonFoodFmcgTrustSectionRouter } from './trust-section.routes';
import platformSectionRoutes, {
  publicNonFoodFmcgPlatformSectionRouter,
} from './platform-section.routes';
import capabilitiesSectionRoutes, {
  publicNonFoodFmcgCapabilitiesSectionRouter,
} from './capabilities-section.routes';
import benefitsSectionRoutes, {
  publicNonFoodFmcgBenefitsSectionRouter,
} from './benefits-section.routes';
import coverageSectionRoutes, {
  publicNonFoodFmcgCoverageSectionRouter,
} from './coverage-section.routes';
import faqSectionRoutes, { publicNonFoodFmcgFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicNonFoodFmcgCtaSectionRouter } from './cta-section.routes';

/**
 * The Non-Food FMCG industry page, one router per section - the same
 * arrangement as the product pages and the home page. Adding the next section
 * is two lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads the trust, capabilities, platform, benefits, coverage, FAQ and closing sections is
 * not here: it is served by the shared section-copy router under
 * ('non-food-fmcg', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/trust-section', trustSectionRoutes);
router.use('/platform-section', platformSectionRoutes);
router.use('/capabilities-section', capabilitiesSectionRoutes);
router.use('/benefits-section', benefitsSectionRoutes);
router.use('/coverage-section', coverageSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicNonFoodFmcgPageRouter = Router();

publicNonFoodFmcgPageRouter.use('/hero-section', publicNonFoodFmcgHeroSectionRouter);
publicNonFoodFmcgPageRouter.use('/trust-section', publicNonFoodFmcgTrustSectionRouter);
publicNonFoodFmcgPageRouter.use('/platform-section', publicNonFoodFmcgPlatformSectionRouter);
publicNonFoodFmcgPageRouter.use('/capabilities-section', publicNonFoodFmcgCapabilitiesSectionRouter);
publicNonFoodFmcgPageRouter.use('/benefits-section', publicNonFoodFmcgBenefitsSectionRouter);
publicNonFoodFmcgPageRouter.use('/coverage-section', publicNonFoodFmcgCoverageSectionRouter);
publicNonFoodFmcgPageRouter.use('/faq-section', publicNonFoodFmcgFaqSectionRouter);
publicNonFoodFmcgPageRouter.use('/cta-section', publicNonFoodFmcgCtaSectionRouter);
