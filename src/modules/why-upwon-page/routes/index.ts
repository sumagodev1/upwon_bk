// src/modules/why-upwon-page/routes/index.ts

import { Router } from 'express';
import heroSectionRoutes, { publicWhyUpwonHeroSectionRouter } from './hero-section.routes';
import industriesSectionRoutes, {
  publicWhyUpwonIndustrySectionRouter,
} from './industries-section.routes';
import testimonialsSectionRoutes, {
  publicWhyUpwonTestimonialsSectionRouter,
} from './testimonials-section.routes';
import proofSectionRoutes, { publicWhyUpwonProofSectionRouter } from './proof-section.routes';
import resultsSectionRoutes, { publicWhyUpwonResultsSectionRouter } from './results-section.routes';
import ctaSectionRoutes, { publicWhyUpwonCtaSectionRouter } from './cta-section.routes';

/**
 * The Why UpWon page, one router per section - the same arrangement as the
 * industry pages. Adding the next section is two lines here and one new set of
 * files; nothing in src/routes changes.
 *
 * The copy that heads each section is not here: it is served by the shared
 * section-copy router under ('why-upwon', <section>).
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/industries-section', industriesSectionRoutes);
router.use('/testimonials-section', testimonialsSectionRoutes);
router.use('/proof-section', proofSectionRoutes);
router.use('/results-section', resultsSectionRoutes);
router.use('/cta-section', ctaSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, the same as the other pages' public routers.
 */
export const publicWhyUpwonPageRouter = Router();

publicWhyUpwonPageRouter.use('/hero-section', publicWhyUpwonHeroSectionRouter);
publicWhyUpwonPageRouter.use('/industries-section', publicWhyUpwonIndustrySectionRouter);
publicWhyUpwonPageRouter.use('/testimonials-section', publicWhyUpwonTestimonialsSectionRouter);
publicWhyUpwonPageRouter.use('/proof-section', publicWhyUpwonProofSectionRouter);
publicWhyUpwonPageRouter.use('/results-section', publicWhyUpwonResultsSectionRouter);
publicWhyUpwonPageRouter.use('/cta-section', publicWhyUpwonCtaSectionRouter);
