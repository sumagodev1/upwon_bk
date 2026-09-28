// src/modules/industry-pages/spices-agro-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicSpicesAgroHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicSpicesAgroTrustSectionRouter } from './trust-section.routes';
import capabilitiesSectionRoutes, {
  publicSpicesAgroCapabilitiesSectionRouter,
} from './capabilities-section.routes';
import platformSectionRoutes, {
  publicSpicesAgroPlatformSectionRouter,
} from './platform-section.routes';
import coverageSectionRoutes, {
  publicSpicesAgroCoverageSectionRouter,
} from './coverage-section.routes';
import faqSectionRoutes, { publicSpicesAgroFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicSpicesAgroCtaSectionRouter } from './cta-section.routes';

/**
 * The Spices & Agro Processing industry page, one router per section - the same
 * arrangement as the Engineering and Beverages pages. Adding the next section
 * is two lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads each section is not here: it is served by the shared
 * section-copy router under ('spices-agro', <section>).
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
export const publicSpicesAgroPageRouter = Router();

publicSpicesAgroPageRouter.use('/hero-section', publicSpicesAgroHeroSectionRouter);
publicSpicesAgroPageRouter.use('/trust-section', publicSpicesAgroTrustSectionRouter);
publicSpicesAgroPageRouter.use(
  '/capabilities-section',
  publicSpicesAgroCapabilitiesSectionRouter,
);
publicSpicesAgroPageRouter.use('/platform-section', publicSpicesAgroPlatformSectionRouter);
publicSpicesAgroPageRouter.use('/coverage-section', publicSpicesAgroCoverageSectionRouter);
publicSpicesAgroPageRouter.use('/faq-section', publicSpicesAgroFaqSectionRouter);
publicSpicesAgroPageRouter.use('/cta-section', publicSpicesAgroCtaSectionRouter);
