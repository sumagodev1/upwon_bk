// src/modules/industry-pages/qsr-franchise-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicQsrFranchiseHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicQsrFranchiseTrustSectionRouter } from './trust-section.routes';
import capabilitiesSectionRoutes, {
  publicQsrFranchiseCapabilitiesSectionRouter,
} from './capabilities-section.routes';
import platformSectionRoutes, { publicQsrFranchisePlatformSectionRouter } from './platform-section.routes';
import coverageSectionRoutes, { publicQsrFranchiseCoverageSectionRouter } from './coverage-section.routes';
import faqSectionRoutes, { publicQsrFranchiseFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicQsrFranchiseCtaSectionRouter } from './cta-section.routes';

/**
 * The QSR & Franchise F&B industry page, one router per section - the same
 * arrangement as the other industry pages. Adding the next section is two
 * lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads each section is not here: it is served by the shared
 * section-copy router under ('qsr-franchise', <section>).
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
export const publicQsrFranchisePageRouter = Router();

publicQsrFranchisePageRouter.use('/hero-section', publicQsrFranchiseHeroSectionRouter);
publicQsrFranchisePageRouter.use('/trust-section', publicQsrFranchiseTrustSectionRouter);
publicQsrFranchisePageRouter.use('/capabilities-section', publicQsrFranchiseCapabilitiesSectionRouter);
publicQsrFranchisePageRouter.use('/platform-section', publicQsrFranchisePlatformSectionRouter);
publicQsrFranchisePageRouter.use('/coverage-section', publicQsrFranchiseCoverageSectionRouter);
publicQsrFranchisePageRouter.use('/faq-section', publicQsrFranchiseFaqSectionRouter);
publicQsrFranchisePageRouter.use('/cta-section', publicQsrFranchiseCtaSectionRouter);
