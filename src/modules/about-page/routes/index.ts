// src/modules/about-page/routes/index.ts

import { Router } from 'express';
import ctaSectionRoutes, { publicAboutCtaSectionRouter } from './cta-section.routes';
import discoveryCallsRoutes, {
  publicAboutDiscoveryCallsRouter,
} from './discovery-calls.routes';
import founderNoteRoutes, { publicAboutFounderNoteRouter } from './founder-note.routes';
import heroSectionRoutes, { publicAboutHeroSectionRouter } from './hero-section.routes';
import numberStatsRoutes from './number-stats.routes';
import numbersSectionRoutes, {
  publicAboutNumbersSectionRouter,
} from './numbers-section.routes';
import teamMembersRoutes from './team-members.routes';
import teamSectionRoutes, { publicAboutTeamSectionRouter } from './team-section.routes';

/**
 * The About page, on the Contact page's pattern: one router per section, each
 * owning its own controller, service, repository, validator and types.
 *
 * Five sections, one per band of /about the user asked to become editable, in the
 * order they are read down the page and shown as tabs in the admin panel:
 *
 *   /hero-section      the band at the top, with its rotating backdrops.
 *   /founder-note      the founder's card and the note beside it.
 *   /team-section      the People headline - and /team-members, the people.
 *   /numbers-section   the Number headline - and /number-stats, the cards.
 *   /cta-section       the closing banner above the footer.
 *
 * Plus one thing that is not a section: /discovery-calls, the records the form at
 * the foot of that page produces. It is an inbox rather than page content, it
 * carries its own permissions, and its copy stays in the website's code.
 *
 * The two ordered child lists are their own resources beside their sections
 * rather than nested under them - see team-section.routes.ts for why.
 *
 * Nothing else on /about is here. The timeline, the Nashik pride band, the four
 * operating principles under the team, the client-logo strip under the numbers,
 * the Byte Elephants facts and the global-ambition block are static artwork in the
 * website's own code and have no section in this CMS.
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/founder-note', founderNoteRoutes);
router.use('/team-section', teamSectionRoutes);
router.use('/team-members', teamMembersRoutes);
router.use('/numbers-section', numbersSectionRoutes);
router.use('/number-stats', numberStatsRoutes);
router.use('/cta-section', ctaSectionRoutes);
router.use('/discovery-calls', discoveryCallsRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, like the other public routers.
 *
 * One read per section, five in total: the People and Number sections serve their
 * children inside their own response, so there is no /team-members or
 * /number-stats here.
 *
 * Read-only apart from POST /discovery-calls, which is one of the five writes
 * anywhere under /public - see discovery-calls.routes.ts for why, and
 * scripts/route-audit.js for the allowlist that keeps them the only five.
 */
export const publicAboutPageRouter = Router();

publicAboutPageRouter.use('/hero-section', publicAboutHeroSectionRouter);
publicAboutPageRouter.use('/founder-note', publicAboutFounderNoteRouter);
publicAboutPageRouter.use('/team-section', publicAboutTeamSectionRouter);
publicAboutPageRouter.use('/numbers-section', publicAboutNumbersSectionRouter);
publicAboutPageRouter.use('/cta-section', publicAboutCtaSectionRouter);
publicAboutPageRouter.use('/discovery-calls', publicAboutDiscoveryCallsRouter);
