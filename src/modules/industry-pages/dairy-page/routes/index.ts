// src/modules/industry-pages/dairy-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicDairyHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicDairyTrustSectionRouter } from './trust-section.routes';
import capabilitiesSectionRoutes, {
  publicDairyCapabilitiesSectionRouter,
} from './capabilities-section.routes';
import benefitsSectionRoutes, {
  publicDairyBenefitsSectionRouter,
} from './benefits-section.routes';
import platformSectionRoutes, {
  publicDairyPlatformSectionRouter,
} from './platform-section.routes';
import coverageSectionRoutes, {
  publicDairyCoverageSectionRouter,
} from './coverage-section.routes';
import faqSectionRoutes, { publicDairyFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicDairyCtaSectionRouter } from './cta-section.routes';

/**
 * The Dairy & Ice Cream industry page, one router per section - the same
 * arrangement as the product pages and the home page. Adding the next section
 * is two lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads the trust, capabilities, platform, benefits, coverage, FAQ
 * and closing sections is not here: it is served by the shared section-copy router under
 * ('dairy', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/trust-section', trustSectionRoutes);
router.use('/capabilities-section', capabilitiesSectionRoutes);
router.use('/platform-section', platformSectionRoutes);
router.use('/benefits-section', benefitsSectionRoutes);
router.use('/coverage-section', coverageSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicDairyPageRouter = Router();

publicDairyPageRouter.use('/hero-section', publicDairyHeroSectionRouter);
publicDairyPageRouter.use('/trust-section', publicDairyTrustSectionRouter);
publicDairyPageRouter.use('/capabilities-section', publicDairyCapabilitiesSectionRouter);
publicDairyPageRouter.use('/platform-section', publicDairyPlatformSectionRouter);
publicDairyPageRouter.use('/benefits-section', publicDairyBenefitsSectionRouter);
publicDairyPageRouter.use('/coverage-section', publicDairyCoverageSectionRouter);
publicDairyPageRouter.use('/faq-section', publicDairyFaqSectionRouter);
publicDairyPageRouter.use('/cta-section', publicDairyCtaSectionRouter);
