// src/modules/industry-pages/beverage-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicBeverageHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicBeverageTrustSectionRouter } from './trust-section.routes';
import capabilitiesSectionRoutes, {
  publicBeverageCapabilitiesSectionRouter,
} from './capabilities-section.routes';
import platformSectionRoutes, {
  publicBeveragePlatformSectionRouter,
} from './platform-section.routes';
import coverageSectionRoutes, {
  publicBeverageCoverageSectionRouter,
} from './coverage-section.routes';
import faqSectionRoutes, { publicBeverageFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicBeverageCtaSectionRouter } from './cta-section.routes';

/**
 * The Beverages & Juices industry page, one router per section - the same
 * arrangement as the Engineering & Manufacturing page. Adding the next section
 * is two lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads each section is not here: it is served by the shared
 * section-copy router under ('beverage', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/trust-section', trustSectionRoutes);
router.use('/capabilities-section', capabilitiesSectionRoutes);
router.use('/platform-section', platformSectionRoutes);
router.use('/coverage-section', coverageSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicBeveragePageRouter = Router();

publicBeveragePageRouter.use('/hero-section', publicBeverageHeroSectionRouter);
publicBeveragePageRouter.use('/trust-section', publicBeverageTrustSectionRouter);
publicBeveragePageRouter.use('/capabilities-section', publicBeverageCapabilitiesSectionRouter);
publicBeveragePageRouter.use('/platform-section', publicBeveragePlatformSectionRouter);
publicBeveragePageRouter.use('/coverage-section', publicBeverageCoverageSectionRouter);
publicBeveragePageRouter.use('/faq-section', publicBeverageFaqSectionRouter);
publicBeveragePageRouter.use('/cta-section', publicBeverageCtaSectionRouter);
