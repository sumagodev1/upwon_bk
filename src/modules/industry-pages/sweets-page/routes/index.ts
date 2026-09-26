// src/modules/industry-pages/sweets-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicSweetsHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicSweetsTrustSectionRouter } from './trust-section.routes';
import platformSectionRoutes, {
  publicSweetsPlatformSectionRouter,
} from './platform-section.routes';
import faqSectionRoutes, { publicSweetsFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicSweetsCtaSectionRouter } from './cta-section.routes';

/**
 * The Sweets & Namkeen industry page, one router per section - the same
 * arrangement as the product pages and the home page. Adding the next section
 * is two lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads the trust, platform, FAQ and closing sections is
 * not here: it is served by the shared section-copy router under
 * ('sweets', <section>).
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
export const publicSweetsPageRouter = Router();

publicSweetsPageRouter.use('/hero-section', publicSweetsHeroSectionRouter);
publicSweetsPageRouter.use('/trust-section', publicSweetsTrustSectionRouter);
publicSweetsPageRouter.use('/platform-section', publicSweetsPlatformSectionRouter);
publicSweetsPageRouter.use('/faq-section', publicSweetsFaqSectionRouter);
publicSweetsPageRouter.use('/cta-section', publicSweetsCtaSectionRouter);
