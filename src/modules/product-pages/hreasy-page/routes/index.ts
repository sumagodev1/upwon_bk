// src/modules/product-pages/hreasy-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicHreasyHeroSectionRouter } from './hero-section.routes';
import faqSectionRoutes, { publicHreasyFaqSectionRouter } from './faq-section.routes';
import proofSectionRoutes, {
  publicHreasyProofSectionRouter,
} from './proof-section.routes';
import capabilitiesSectionRoutes, {
  publicHreasyCapabilitiesSectionRouter,
} from './capabilities-section.routes';
import lifecycleSectionRoutes, {
  publicHreasyLifecycleSectionRouter,
} from './lifecycle-section.routes';
import packagesSectionRoutes, {
  publicHreasyPackagesSectionRouter,
} from './packages-section.routes';
import alternativesSectionRoutes, {
  publicHreasyAlternativesSectionRouter,
} from './alternatives-section.routes';
import outcomesSectionRoutes, {
  publicHreasyOutcomesSectionRouter,
} from './outcomes-section.routes';
import ctaSectionRoutes, { publicHreasyCtaSectionRouter } from './cta-section.routes';

/**
 * The HREasy product page, one router per section - the same arrangement as
 * the POS, FMS, SFA-DMS and ERP pages, and the home page. Adding the next
 * section is two lines here and one new set of files; nothing in src/routes
 * changes.
 *
 * Mounted at /hreasy-page after the product id, not the URL slug: the page is
 * served at /products/hrms on the site, but every other name in the codebase
 * - the module folder, the page key, the tables - follows the id.
 *
 * The copy that heads the proof bento, the FAQ and the closing band is not
 * here: it is served by the shared section-copy router under
 * ('hreasy', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/proof-section', proofSectionRoutes);
router.use('/capabilities-section', capabilitiesSectionRoutes);
router.use('/lifecycle-section', lifecycleSectionRoutes);
router.use('/packages-section', packagesSectionRoutes);
router.use('/alternatives-section', alternativesSectionRoutes);
router.use('/outcomes-section', outcomesSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicHreasyPageRouter = Router();

publicHreasyPageRouter.use('/hero-section', publicHreasyHeroSectionRouter);
publicHreasyPageRouter.use('/proof-section', publicHreasyProofSectionRouter);
publicHreasyPageRouter.use('/capabilities-section', publicHreasyCapabilitiesSectionRouter);
publicHreasyPageRouter.use('/lifecycle-section', publicHreasyLifecycleSectionRouter);
publicHreasyPageRouter.use('/packages-section', publicHreasyPackagesSectionRouter);
publicHreasyPageRouter.use('/alternatives-section', publicHreasyAlternativesSectionRouter);
publicHreasyPageRouter.use('/outcomes-section', publicHreasyOutcomesSectionRouter);
publicHreasyPageRouter.use('/faq-section', publicHreasyFaqSectionRouter);
publicHreasyPageRouter.use('/cta-section', publicHreasyCtaSectionRouter);
