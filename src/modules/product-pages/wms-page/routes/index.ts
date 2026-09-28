// src/modules/product-pages/wms-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicWmsHeroSectionRouter } from './hero-section.routes';
import proofSectionRoutes, { publicWmsProofSectionRouter } from './proof-section.routes';
import recognitionSectionRoutes, {
  publicWmsRecognitionSectionRouter,
} from './recognition-section.routes';
import capabilitiesSectionRoutes, {
  publicWmsCapabilitiesSectionRouter,
} from './capabilities-section.routes';
import outcomesSectionRoutes, {
  publicWmsOutcomesSectionRouter,
} from './outcomes-section.routes';
import faqSectionRoutes, { publicWmsFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicWmsCtaSectionRouter } from './cta-section.routes';

/**
 * The WMS product page, one router per section - the same arrangement as the
 * HREasy, POS, FMS, SFA-DMS and ERP pages, and the home page. Adding the next
 * section is two lines here and one new set of files; nothing in src/routes
 * changes.
 *
 * Six sections editable so far: the hero slider, the proof row, the
 * warehouse-type map, the capability stack, the FAQ and the closing band.
 * The rest of the page - the category depth - is still the copy the site
 * ships, and each arrives as its tables and screens are built.
 *
 * The copy that heads the proof row, the map, the capability
 * stack, the FAQ and the closing band is not here: it is served by the
 * shared section-copy router under ('wms', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/proof-section', proofSectionRoutes);
router.use('/recognition-section', recognitionSectionRoutes);
router.use('/capabilities-section', capabilitiesSectionRoutes);
router.use('/outcomes-section', outcomesSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicWmsPageRouter = Router();

publicWmsPageRouter.use('/hero-section', publicWmsHeroSectionRouter);
publicWmsPageRouter.use('/proof-section', publicWmsProofSectionRouter);
publicWmsPageRouter.use('/recognition-section', publicWmsRecognitionSectionRouter);
publicWmsPageRouter.use('/capabilities-section', publicWmsCapabilitiesSectionRouter);
publicWmsPageRouter.use('/outcomes-section', publicWmsOutcomesSectionRouter);
publicWmsPageRouter.use('/faq-section', publicWmsFaqSectionRouter);
publicWmsPageRouter.use('/cta-section', publicWmsCtaSectionRouter);
