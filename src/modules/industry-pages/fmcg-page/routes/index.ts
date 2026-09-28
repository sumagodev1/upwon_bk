// src/modules/industry-pages/fmcg-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicFmcgHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicFmcgTrustSectionRouter } from './trust-section.routes';
import platformSectionRoutes, {
  publicFmcgPlatformSectionRouter,
} from './platform-section.routes';
import faqSectionRoutes, { publicFmcgFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicFmcgCtaSectionRouter } from './cta-section.routes';

/**
 * The FMCG Distribution industry page, one router per section - the same
 * arrangement as the product pages and the home page. Adding the next section
 * is two lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads the trust, platform, FAQ and closing sections is
 * not here: it is served by the shared section-copy router under
 * ('fmcg', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/trust-section', trustSectionRoutes);
router.use('/platform-section', platformSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicFmcgPageRouter = Router();

publicFmcgPageRouter.use('/hero-section', publicFmcgHeroSectionRouter);
publicFmcgPageRouter.use('/trust-section', publicFmcgTrustSectionRouter);
publicFmcgPageRouter.use('/platform-section', publicFmcgPlatformSectionRouter);
publicFmcgPageRouter.use('/faq-section', publicFmcgFaqSectionRouter);
publicFmcgPageRouter.use('/cta-section', publicFmcgCtaSectionRouter);
