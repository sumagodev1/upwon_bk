// src/modules/product-pages/sfa-dms-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicSfaHeroSectionRouter } from './hero-section.routes';
import faqSectionRoutes, { publicSfaFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicSfaCtaSectionRouter } from './cta-section.routes';
import proofSectionRoutes, { publicSfaProofSectionRouter } from './proof-section.routes';
import videoSectionRoutes, { publicSfaVideoSectionRouter } from './video-section.routes';
import packagesSectionRoutes, {
  publicSfaPackagesSectionRouter,
} from './packages-section.routes';
import complianceSectionRoutes, {
  publicSfaComplianceSectionRouter,
} from './compliance-section.routes';
import alternativesSectionRoutes, {
  publicSfaAlternativesSectionRouter,
} from './alternatives-section.routes';
import outcomesSectionRoutes, {
  publicSfaOutcomesSectionRouter,
} from './outcomes-section.routes';

/**
 * The SFA-DMS product page, one router per section - the same arrangement as
 * the ERP page and the home page. Adding the next section is two lines here and
 * one new set of files; nothing in src/routes changes.
 *
 * The copy that heads the FAQ and the closing band is not here: it is served by
 * the shared section-copy router under ('sfa-dms', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/proof-section', proofSectionRoutes);
router.use('/video-section', videoSectionRoutes);
router.use('/packages-section', packagesSectionRoutes);
router.use('/alternatives-section', alternativesSectionRoutes);
router.use('/establishers-section', complianceSectionRoutes);
router.use('/outcomes-section', outcomesSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicSfaDmsPageRouter = Router();

publicSfaDmsPageRouter.use('/hero-section', publicSfaHeroSectionRouter);
publicSfaDmsPageRouter.use('/faq-section', publicSfaFaqSectionRouter);
publicSfaDmsPageRouter.use('/proof-section', publicSfaProofSectionRouter);
publicSfaDmsPageRouter.use('/video-section', publicSfaVideoSectionRouter);
publicSfaDmsPageRouter.use('/packages-section', publicSfaPackagesSectionRouter);
publicSfaDmsPageRouter.use('/alternatives-section', publicSfaAlternativesSectionRouter);
publicSfaDmsPageRouter.use('/establishers-section', publicSfaComplianceSectionRouter);
publicSfaDmsPageRouter.use('/outcomes-section', publicSfaOutcomesSectionRouter);
publicSfaDmsPageRouter.use('/cta-section', publicSfaCtaSectionRouter);
