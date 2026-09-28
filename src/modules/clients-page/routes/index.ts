// src/modules/clients-page/routes/index.ts

import { Router } from 'express';
import casesSectionRoutes, { publicClientsCasesSectionRouter } from './cases-section.routes';
import heroSectionRoutes, { publicClientsHeroSectionRouter } from './hero-section.routes';
import networkSectionRoutes, { publicClientsNetworkSectionRouter } from './network-section.routes';
import rosterSectionRoutes, { publicClientsRosterSectionRouter } from './roster-section.routes';
import testimonialsSectionRoutes, {
  publicClientsTestimonialsSectionRouter,
} from './testimonials-section.routes';

/**
 * The Clients & Case Studies page (/clients on the site), on the home page
 * module's pattern: one router per section, each owning its own controller,
 * service, repository, validator, and types: the hero slider, the featured
 * case study cards, the roster's logo marquee, the operational network map,
 * and the testimonials marquee. Adding a section is one more pair of lines
 * here.
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/cases-section', casesSectionRoutes);
router.use('/roster-section', rosterSectionRoutes);
router.use('/network-section', networkSectionRoutes);
router.use('/testimonials-section', testimonialsSectionRoutes);

export default router;

/**
 * The website-facing half of the same sections. Mounted before the
 * authentication middleware in src/routes/index.ts, like the home page's.
 */
export const publicClientsPageRouter = Router();

publicClientsPageRouter.use('/hero-section', publicClientsHeroSectionRouter);
publicClientsPageRouter.use('/cases-section', publicClientsCasesSectionRouter);
publicClientsPageRouter.use('/roster-section', publicClientsRosterSectionRouter);
publicClientsPageRouter.use('/network-section', publicClientsNetworkSectionRouter);
publicClientsPageRouter.use('/testimonials-section', publicClientsTestimonialsSectionRouter);
