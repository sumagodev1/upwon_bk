// src/modules/product-pages/fms-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicFmsHeroSectionRouter } from './hero-section.routes';
import faqSectionRoutes, { publicFmsFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicFmsCtaSectionRouter } from './cta-section.routes';
import proofSectionRoutes, { publicFmsProofSectionRouter } from './proof-section.routes';
import outcomesSectionRoutes, { publicFmsOutcomesSectionRouter } from './outcomes-section.routes';
import alternativesSectionRoutes, {
  publicFmsAlternativesSectionRouter,
} from './alternatives-section.routes';
import growthSectionRoutes, { publicFmsGrowthSectionRouter } from './growth-section.routes';
import integrationsSectionRoutes, {
  publicFmsIntegrationsSectionRouter,
} from './integrations-section.routes';
import videoSectionRoutes, { publicFmsVideoSectionRouter } from './video-section.routes';
import franchiseSectionRoutes, {
  publicFmsFranchiseSectionRouter,
} from './franchise-section.routes';

/**
 * The FMS product page, one router per section - the same arrangement as the
 * SFA-DMS page, the ERP page and the home page. Adding the next section is two
 * lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads the FAQ and the closing band is not here: it is served by
 * the shared section-copy router under ('fms', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/proof-section', proofSectionRoutes);
router.use('/franchise-section', franchiseSectionRoutes);
router.use('/video-section', videoSectionRoutes);
router.use('/integrations-section', integrationsSectionRoutes);
router.use('/growth-section', growthSectionRoutes);
router.use('/alternatives-section', alternativesSectionRoutes);
router.use('/outcomes-section', outcomesSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicFmsPageRouter = Router();

publicFmsPageRouter.use('/hero-section', publicFmsHeroSectionRouter);
publicFmsPageRouter.use('/proof-section', publicFmsProofSectionRouter);
publicFmsPageRouter.use('/franchise-section', publicFmsFranchiseSectionRouter);
publicFmsPageRouter.use('/video-section', publicFmsVideoSectionRouter);
publicFmsPageRouter.use('/integrations-section', publicFmsIntegrationsSectionRouter);
publicFmsPageRouter.use('/growth-section', publicFmsGrowthSectionRouter);
publicFmsPageRouter.use('/alternatives-section', publicFmsAlternativesSectionRouter);
publicFmsPageRouter.use('/outcomes-section', publicFmsOutcomesSectionRouter);
publicFmsPageRouter.use('/faq-section', publicFmsFaqSectionRouter);
publicFmsPageRouter.use('/cta-section', publicFmsCtaSectionRouter);
