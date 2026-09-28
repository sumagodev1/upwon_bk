// src/modules/product-pages/vendor-portal-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicVmsHeroSectionRouter } from './hero-section.routes';
import proofSectionRoutes, { publicVmsProofSectionRouter } from './proof-section.routes';
import capabilitiesSectionRoutes, {
  publicVmsCapabilitiesSectionRouter,
} from './capabilities-section.routes';
import outcomesSectionRoutes, {
  publicVmsOutcomesSectionRouter,
} from './outcomes-section.routes';
import faqSectionRoutes, { publicVmsFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicVmsCtaSectionRouter } from './cta-section.routes';

/**
 * The Vendor Portal (VMS) product page, one router per section - the same
 * arrangement as the WMS, HREasy, POS, FMS, SFA-DMS and ERP pages, and the
 * home page.
 *
 * Six sections, all editable: the hero slider, the proof strip, the
 * capability carousel, the customer-outcome showcase, the FAQ and the closing
 * band. Unlike the other product pages these arrived together rather than one
 * at a time, because the page was taken over from the copy the site ships in
 * a single pass.
 *
 * The live page renders more than these - the vendor-type map, the
 * operational-reality strip, the approach flow, the connected-by-design
 * panel, the implementation band and the security section - and each of those
 * is still the site's own copy.
 *
 * The copy that heads five of the six is not here: it is served by the shared
 * section-copy router under ('vms', <section>). The hero is the exception, as
 * on every other product page, because its slides carry their own.
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/proof-section', proofSectionRoutes);
router.use('/capabilities-section', capabilitiesSectionRoutes);
router.use('/outcomes-section', outcomesSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicVendorPortalPageRouter = Router();

publicVendorPortalPageRouter.use('/hero-section', publicVmsHeroSectionRouter);
publicVendorPortalPageRouter.use('/proof-section', publicVmsProofSectionRouter);
publicVendorPortalPageRouter.use('/capabilities-section', publicVmsCapabilitiesSectionRouter);
publicVendorPortalPageRouter.use('/outcomes-section', publicVmsOutcomesSectionRouter);
publicVendorPortalPageRouter.use('/faq-section', publicVmsFaqSectionRouter);
publicVendorPortalPageRouter.use('/cta-section', publicVmsCtaSectionRouter);
