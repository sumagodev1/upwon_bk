// src/modules/contact-page/routes/enquiries.routes.ts

import { Router } from 'express';
import {
  createPublicContactEnquiryController,
  deleteContactEnquiryController,
  getContactEnquiryByIdController,
  listContactEnquiriesController,
} from '../controllers/enquiries.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { contactEnquiryRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import { requireRecaptcha } from '../../../core/middleware/recaptcha.middleware';

/**
 * Admin router, mounted at /contact-page/enquiries behind authentication.
 *
 * A records inbox, not a section: it is read and it is deleted, and there is
 * no PUT, no PATCH and no status anywhere on it. An enquiry is what a visitor
 * sent, and an admin who could edit one would be editing evidence.
 *
 * Guarded by its own permissions rather than contact_page.*: reading this is
 * reading strangers' names, addresses and phone numbers, which is a different
 * decision from letting somebody rewrite the page's copy, and the two must be
 * grantable separately.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.CONTACT_ENQUIRIES_READ),
  asyncHandler(listContactEnquiriesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CONTACT_ENQUIRIES_READ),
  asyncHandler(getContactEnquiryByIdController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.CONTACT_ENQUIRIES_DELETE),
  asyncHandler(deleteContactEnquiryController),
);

export default router;

/**
 * ── THE ONE WRITE ON THE PUBLIC SURFACE ──────────────────────────────────
 *
 * Everything else under /public is a read of already-published CMS content.
 * This is a write, and it is unauthenticated, because the caller is a visitor
 * on a marketing page who holds neither an admin token nor an API key - the
 * same reason the public reads are unauthenticated. There is no mail transport
 * in this project, so this row is the delivery: if the request fails, the lead
 * is gone.
 *
 * scripts/route-audit.js used to assert that NO write existed under /public.
 * That assertion is now an explicit allowlist naming this exact route, so the
 * check keeps its teeth: a second public write, added by accident or by a
 * merge, still fails the audit. If this route ever moves or is renamed, update
 * PUBLIC_WRITE_ALLOWLIST in that script - the audit fails loudly either way.
 *
 * What stands in for authentication here:
 *
 *   contactEnquiryRateLimit  per-IP, and far tighter than standardRateLimit -
 *                            a visitor sends one enquiry, not a hundred.
 *   express.json({ limit })  the 1mb body cap in app.ts already applies.
 *   the validator            every field bounded, and the three choice fields
 *                            checked against the options the form is actually
 *                            publishing, so a script cannot invent categories.
 *   the response             a receipt only: { received: true, id }.
 *   requireRecaptcha         a token from the visitor's browser, checked
 *                            with Google. The one control here that a
 *                            script cannot simply comply with.
 *
 * There is deliberately no public GET here. An inbox of other people's contact
 * details behind a guessable URL is the failure mode this whole file is
 * written to avoid.
 */
export const publicContactEnquiriesRouter = Router();

publicContactEnquiriesRouter.post(
  '/',
  contactEnquiryRateLimit,
  asyncHandler(requireRecaptcha),
  asyncHandler(createPublicContactEnquiryController),
);
