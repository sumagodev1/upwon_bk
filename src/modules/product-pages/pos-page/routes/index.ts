// src/modules/product-pages/pos-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicPosHeroSectionRouter } from './hero-section.routes';
import faqSectionRoutes, { publicPosFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicPosCtaSectionRouter } from './cta-section.routes';

/**
 * The POS product page, one router per section - the same arrangement as the
 * FMS, SFA-DMS and ERP pages, and the home page. Adding the next section is two
 * lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads the FAQ and the closing band is not here: it is served by
 * the shared section-copy router under ('pos', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicPosPageRouter = Router();

publicPosPageRouter.use('/hero-section', publicPosHeroSectionRouter);
publicPosPageRouter.use('/faq-section', publicPosFaqSectionRouter);
publicPosPageRouter.use('/cta-section', publicPosCtaSectionRouter);
