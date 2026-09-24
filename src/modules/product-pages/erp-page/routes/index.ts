// src/modules/product-pages/erp-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicErpHeroSectionRouter } from './hero-section.routes';
import trustSectionRoutes, { publicErpTrustSectionRouter } from './trust-section.routes';
import recognitionSectionRoutes, {
  publicErpRecognitionSectionRouter,
} from './recognition-section.routes';
import journeySectionRoutes, {
  publicErpJourneySectionRouter,
} from './journey-section.routes';
import comparisonSectionRoutes, {
  publicErpComparisonSectionRouter,
} from './comparison-section.routes';
import outcomesSectionRoutes, {
  publicErpOutcomesSectionRouter,
} from './outcomes-section.routes';
import establishersSectionRoutes, {
  publicErpEstablishersSectionRouter,
} from './establishers-section.routes';
import faqSectionRoutes, { publicErpFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicErpCtaSectionRouter } from './cta-section.routes';

/**
 * The ERP product page is one module with one router per section, each owning
 * its own controller, service, repository, validator and types - the same
 * arrangement as the home page. Adding the next section is two lines here and
 * one new set of files; nothing in src/routes changes.
 *
 * The copy that heads each section is not here: it is served by the shared
 * section-copy router under ('erp', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/trust-section', trustSectionRoutes);
router.use('/recognition-section', recognitionSectionRoutes);
router.use('/benefits-section', journeySectionRoutes);
router.use('/alternatives-section', comparisonSectionRoutes);
router.use('/outcomes-section', outcomesSectionRoutes);
router.use('/establishers-section', establishersSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the home page's public router.
 */
export const publicErpPageRouter = Router();

publicErpPageRouter.use('/hero-section', publicErpHeroSectionRouter);
publicErpPageRouter.use('/trust-section', publicErpTrustSectionRouter);
publicErpPageRouter.use('/recognition-section', publicErpRecognitionSectionRouter);
publicErpPageRouter.use('/benefits-section', publicErpJourneySectionRouter);
publicErpPageRouter.use('/alternatives-section', publicErpComparisonSectionRouter);
publicErpPageRouter.use('/outcomes-section', publicErpOutcomesSectionRouter);
publicErpPageRouter.use('/establishers-section', publicErpEstablishersSectionRouter);
publicErpPageRouter.use('/faq-section', publicErpFaqSectionRouter);
publicErpPageRouter.use('/cta-section', publicErpCtaSectionRouter);
