// src/modules/industry-pages/engineering-manufacturing-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicEngineeringHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicEngineeringTrustSectionRouter } from './trust-section.routes';
import capabilitiesSectionRoutes, {
  publicEngineeringCapabilitiesSectionRouter,
} from './capabilities-section.routes';
import platformSectionRoutes, {
  publicEngineeringPlatformSectionRouter,
} from './platform-section.routes';
import coverageSectionRoutes, {
  publicEngineeringCoverageSectionRouter,
} from './coverage-section.routes';
import faqSectionRoutes, { publicEngineeringFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicEngineeringCtaSectionRouter } from './cta-section.routes';

/**
 * The Engineering & Manufacturing industry page, one router per section - the
 * same arrangement as the product pages (ERP, SFA-DMS, FMS, POS). Adding the
 * next section is two lines here and one new set of files; nothing in
 * src/routes changes.
 *
 * The copy that heads the trust, capabilities, platform, coverage, FAQ and CTA
 * sections is not here: it is
 * served by the shared section-copy router under
 * ('engineering-manufacturing', <section>).
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
export const publicEngineeringManufacturingPageRouter = Router();

publicEngineeringManufacturingPageRouter.use('/hero-section', publicEngineeringHeroSectionRouter);
publicEngineeringManufacturingPageRouter.use('/trust-section', publicEngineeringTrustSectionRouter);
publicEngineeringManufacturingPageRouter.use(
  '/capabilities-section',
  publicEngineeringCapabilitiesSectionRouter,
);
publicEngineeringManufacturingPageRouter.use(
  '/platform-section',
  publicEngineeringPlatformSectionRouter,
);
publicEngineeringManufacturingPageRouter.use(
  '/coverage-section',
  publicEngineeringCoverageSectionRouter,
);
publicEngineeringManufacturingPageRouter.use('/faq-section', publicEngineeringFaqSectionRouter);
publicEngineeringManufacturingPageRouter.use('/cta-section', publicEngineeringCtaSectionRouter);
