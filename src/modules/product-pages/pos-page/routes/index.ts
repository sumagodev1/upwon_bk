// src/modules/product-pages/pos-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicPosHeroSectionRouter } from './hero-section.routes';
import proofSectionRoutes, { publicPosProofSectionRouter } from './proof-section.routes';
import recognitionSectionRoutes, {
  publicPosRecognitionSectionRouter,
} from './recognition-section.routes';
import videoSectionRoutes, { publicPosVideoSectionRouter } from './video-section.routes';
import growthSectionRoutes, { publicPosGrowthSectionRouter } from './growth-section.routes';
import securitySectionRoutes, {
  publicPosSecuritySectionRouter,
} from './security-section.routes';
import alternativesSectionRoutes, {
  publicPosAlternativesSectionRouter,
} from './alternatives-section.routes';
import outcomesSectionRoutes, {
  publicPosOutcomesSectionRouter,
} from './outcomes-section.routes';
import faqSectionRoutes, { publicPosFaqSectionRouter } from './faq-section.routes';
import ctaSectionRoutes, { publicPosCtaSectionRouter } from './cta-section.routes';

/**
 * The POS product page, one router per section - the same arrangement as the
 * FMS, SFA-DMS and ERP pages, and the home page. Adding the next section is two
 * lines here and one new set of files; nothing in src/routes changes.
 *
 * The copy that heads the proof strip, the category map, the video, the tier
 * row, the security band, the FAQ and the closing band is not here: it is
 * served by the shared section-copy router under ('pos', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/proof-section', proofSectionRoutes);
router.use('/recognition-section', recognitionSectionRoutes);
router.use('/video-section', videoSectionRoutes);
router.use('/growth-section', growthSectionRoutes);
router.use('/security-section', securitySectionRoutes);
router.use('/alternatives-section', alternativesSectionRoutes);
router.use('/outcomes-section', outcomesSectionRoutes);
router.use('/faq-section', faqSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicPosPageRouter = Router();

publicPosPageRouter.use('/hero-section', publicPosHeroSectionRouter);
publicPosPageRouter.use('/proof-section', publicPosProofSectionRouter);
publicPosPageRouter.use('/recognition-section', publicPosRecognitionSectionRouter);
publicPosPageRouter.use('/video-section', publicPosVideoSectionRouter);
publicPosPageRouter.use('/growth-section', publicPosGrowthSectionRouter);
publicPosPageRouter.use('/security-section', publicPosSecuritySectionRouter);
publicPosPageRouter.use('/alternatives-section', publicPosAlternativesSectionRouter);
publicPosPageRouter.use('/outcomes-section', publicPosOutcomesSectionRouter);
publicPosPageRouter.use('/faq-section', publicPosFaqSectionRouter);
publicPosPageRouter.use('/cta-section', publicPosCtaSectionRouter);
