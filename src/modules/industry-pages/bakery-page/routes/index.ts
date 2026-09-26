// src/modules/industry-pages/bakery-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicBakeryHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicBakeryTrustSectionRouter } from './trust-section.routes';
import platformSectionRoutes, {
  publicBakeryPlatformSectionRouter,
} from './platform-section.routes';
import helpsSectionRoutes, { publicBakeryHelpsSectionRouter } from './helps-section.routes';
import faqSectionRoutes, { publicBakeryFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicBakeryCtaSectionRouter } from './cta-section.routes';

/**
 * The Bakery & Confectionery industry page, one router per section - the same
 * arrangement as the product pages and the home page. Adding the next section
 * is two lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads the trust, platform, helps, FAQ and closing sections is
 * not here: it is served by the shared section-copy router under
 * ('bakery', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/trust-section', trustSectionRoutes);
router.use('/platform-section', platformSectionRoutes);
router.use('/helps-section', helpsSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicBakeryPageRouter = Router();

publicBakeryPageRouter.use('/hero-section', publicBakeryHeroSectionRouter);
publicBakeryPageRouter.use('/trust-section', publicBakeryTrustSectionRouter);
publicBakeryPageRouter.use('/platform-section', publicBakeryPlatformSectionRouter);
publicBakeryPageRouter.use('/helps-section', publicBakeryHelpsSectionRouter);
publicBakeryPageRouter.use('/faq-section', publicBakeryFaqSectionRouter);
publicBakeryPageRouter.use('/cta-section', publicBakeryCtaSectionRouter);
