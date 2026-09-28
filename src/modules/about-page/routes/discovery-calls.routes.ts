// src/modules/about-page/routes/discovery-calls.routes.ts

import { Router } from 'express';
import {
  createPublicAboutDiscoveryCallController,
  deleteAboutDiscoveryCallController,
  getAboutDiscoveryCallByIdController,
  listAboutDiscoveryCallsController,
} from '../controllers/discovery-calls.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import {
  discoveryCallGlobalRateLimit,
  discoveryCallRateLimit,
} from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /about-page/discovery-calls behind authentication.
 *
 * A records inbox, not a section: it is read and it is deleted, and there is no
 * PUT, no PATCH and no status anywhere on it. A booking is what a visitor sent,
 * and an admin who could edit one would be editing evidence.
 *
 * Guarded by its own permissions rather than about_page.*: reading this is
 * reading strangers' names and mobile numbers, which is a different decision from
 * letting somebody rewrite the page's copy, and the two must be grantable
 * separately.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.DISCOVERY_CALLS_READ),
  asyncHandler(listAboutDiscoveryCallsController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.DISCOVERY_CALLS_READ),
  asyncHandler(getAboutDiscoveryCallByIdController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.DISCOVERY_CALLS_DELETE),
  asyncHandler(deleteAboutDiscoveryCallController),
);

export default router;

/**
 * ── THE FOURTH WRITE ON THE PUBLIC SURFACE ───────────────────────────────
 *
 * Everything else under /public is a read of already-published CMS content,
 * apart from the Contact page's enquiry form, the Careers page's application
 * form and the Partner Program's. This is the fourth such write, and it is
 * unauthenticated for the same reason they are: the caller is a visitor on a
 * marketing page who holds neither an admin token nor an API key. There is no
 * mail transport in this project, so this row is the delivery.
 *
 * It is also the worst of the four failures it replaces. The other three at
 * least failed visibly - a window.alert(), a mailto: link. This form called
 * submitLead() in the website's src/lib/leads.js, which posts to
 * VITE_LEAD_ENDPOINT when that variable is set and otherwise resolves
 * successfully having sent nothing anywhere. Every visitor who booked a call was
 * shown "Talk soon" and nobody was ever told. That is the failure this route is
 * here to end.
 *
 * scripts/route-audit.js holds an explicit allowlist naming this exact route, so
 * the "no writes under /public" check keeps its teeth: any further public
 * write, added by accident or by a merge, still fails the audit. If this route ever
 * moves or is renamed, update PUBLIC_WRITE_ALLOWLIST in that script - the audit
 * fails loudly either way.
 *
 * What stands in for authentication here:
 *
 *   discoveryCallRateLimit       per-IP, and far tighter than standardRateLimit
 *                                - somebody books one call, not a hundred.
 *   ...GlobalRateLimit           the backstop, on a key no request can choose:
 *                                the TCP peer address. req.ip is the last
 *                                X-Forwarded-For entry once `trust proxy` is on,
 *                                so the per-IP budget above is per-header-value
 *                                to anyone who can reach the process directly -
 *                                and the argument is about the key, not about a
 *                                request's cost, so it applies here as much as to
 *                                the Careers upload. This is the only bound that
 *                                survives a chosen key. It is deliberately not
 *                                one constant bucket for everybody: that would
 *                                let the first flood take the form away from
 *                                every real visitor until the window turned over,
 *                                which is the failure this route exists to end.
 *                                See the limiter for the whole argument.
 *   express.json({ limit })      the 1mb body cap in app.ts already applies.
 *   the validator                every field bounded, the number checked by the
 *                                shared visitor-phone rule.
 *   the response                 a receipt only: { received: true, id }.
 *
 * Nothing here touches storage: this body is JSON and carries no file, so there
 * is no upload path to guard. What a flood costs is the inbox itself - rows are
 * cleared one confirmed dialog at a time - which is why the backstop is worth
 * its two lines even without a 5 MB file behind it.
 *
 * There is deliberately no public GET here. A list of other people's names and
 * mobile numbers behind a guessable URL is the failure mode this whole file is
 * written to avoid.
 */
export const publicAboutDiscoveryCallsRouter = Router();

publicAboutDiscoveryCallsRouter.post(
  '/',
  discoveryCallRateLimit,
  discoveryCallGlobalRateLimit,
  asyncHandler(createPublicAboutDiscoveryCallController),
);
