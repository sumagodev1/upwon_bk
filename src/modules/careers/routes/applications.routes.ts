// src/modules/careers/routes/applications.routes.ts

import { Router, RequestHandler } from 'express';
import multer from 'multer';
import {
  createPublicCareerApplicationController,
  downloadCareerApplicationResumeController,
  getCareerApplicationByIdController,
  listCareerApplicationsController,
  updateCareerApplicationStatusController,
} from '../controllers/applications.controller';
import { PERMISSIONS } from '../../../config/constants';
import { ValidationError } from '../../../core/errors/ValidationError';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import {
  careerApplicationGlobalRateLimit,
  careerApplicationRateLimit,
} from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import { RESUME_ACCEPTED_LABEL, RESUME_MAX_BYTES, RESUME_MAX_MB } from '../utils/resume-asset';

/**
 * Admin router, mounted at /careers/applications behind authentication.
 *
 * The Vacancy Applications tab. Read, download, and one write: the status.
 * There is no PUT of the candidate's own answers and no DELETE, because an
 * application an administrator could rewrite would stop being evidence of what
 * was actually sent, and nobody asked for a delete - an inbox that cannot lose
 * a candidate by accident is the safer default to start from.
 *
 * Guarded by career_applications.* rather than careers.*: reading this is
 * reading strangers' names, phone numbers and CVs, which is a different
 * decision from letting somebody post a job advert, and the two must be
 * grantable separately.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.CAREER_APPLICATIONS_READ),
  asyncHandler(listCareerApplicationsController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CAREER_APPLICATIONS_READ),
  asyncHandler(getCareerApplicationByIdController),
);

/**
 * The CV download. Guarded by career_applications.read rather than by a
 * permission of its own: anyone who may read the application may read the
 * document it is about - the detail response already names the file. The
 * separate control on this route is the audit entry it writes.
 */
router.get(
  '/:id/resume',
  requirePermission(PERMISSIONS.CAREER_APPLICATIONS_READ),
  asyncHandler(downloadCareerApplicationResumeController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.CAREER_APPLICATIONS_UPDATE),
  asyncHandler(updateCareerApplicationStatusController),
);

export default router;

/**
 * memoryStorage keeps the StorageProvider abstraction intact: multer never
 * touches the filesystem, so swapping LOCAL for S3 changes nothing here.
 *
 * The size limit is RESUME_MAX_BYTES rather than env.maxUploadBytes, and it is
 * enforced twice - here, to stop reading the body early rather than buffering
 * 10 MB from an anonymous caller before rejecting it, and again in
 * readResumeUpload, which is the rule rather than the transport.
 *
 * files: 1 because one application carries one CV. A second part named
 * anything else is refused by LIMIT_UNEXPECTED_FILE below.
 *
 * EVERY OTHER DIMENSION IS BOUNDED TOO, and that is not belt-and-braces. multer
 * hands `limits` straight to busboy, whose defaults for `fields` and `parts`
 * are Infinity and whose default `fieldSize` is 1 MB - and every completed text
 * part is retained in req.body. With only fileSize and files set, one
 * unauthenticated request streaming thousands of just-under-1-MB text parts
 * accumulates gigabytes of strings in this process's heap before the validator
 * ever runs, and the rate limiter cannot help because the attacker needs a
 * single request. express.json's 1 MB cap does not apply to multipart bodies.
 *
 * So the parse is bounded by what this ONE form actually posts: seven text
 * fields (vacancyId, fullName, email, phone, location, experience, message)
 * plus the file. The slack below is for a browser that appends something
 * harmless, not for a second use of this route.
 *
 * fieldSize is 32 KB rather than MESSAGE_MAX's 4000, because that maximum is
 * counted in characters and this one in bytes - 4000 characters of four-byte
 * UTF-8 is 16 KB. The validator still refuses anything over 4000 characters;
 * this only stops the parser buffering more than a field could ever hold.
 */
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: RESUME_MAX_BYTES,
    files: 1,
    fields: 12,
    parts: 15,
    fieldSize: 32 * 1024,
    fieldNameSize: 64,
    fieldNestingDepth: 1,
  },
});

/** multer's codes for a body that broke one of the parse limits above. */
const MALFORMED_BODY_CODES: ReadonlySet<string> = new Set([
  'LIMIT_PART_COUNT',
  'LIMIT_FIELD_COUNT',
  'LIMIT_FIELD_VALUE',
  'LIMIT_FIELD_KEY',
  'LIMIT_FIELD_NESTING',
]);

/**
 * multer's own failures, translated into the 422 the rest of this form speaks.
 *
 * Without this a 6 MB CV reaches the error middleware as a bare MulterError -
 * not an AppError - and is answered as a 500 INTERNAL_ERROR naming no field.
 * That is wrong twice over: it is the applicant's mistake, not the server's,
 * and it is one they can fix, so it has to arrive as a field error the website
 * can print under the file input like every other one.
 */
const acceptResume: RequestHandler = (req, res, next) => {
  resumeUpload.single('resume')(req, res, (error: unknown) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      // The limits added above abort with their own codes. None of them is
      // something a real applicant can produce from this form, so they share
      // one line - but it must not read as "attach one file", which would send
      // somebody re-picking a CV that was never wrong. Matched as strings
      // because @types/multer's ErrorCode union has not caught up with
      // LIMIT_FIELD_NESTING, which multer 2.x does raise.
      const malformedBody = MALFORMED_BODY_CODES.has(error.code);

      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? `Resume must be at most ${RESUME_MAX_MB} MB`
          : malformedBody
            ? 'The application could not be read. Please reload the page and try again'
            : `Attach exactly one ${RESUME_ACCEPTED_LABEL} file, in the resume field`;
      return next(
        new ValidationError('Resume is not acceptable', [
          { field: 'resume', message, code: error.code },
        ]),
      );
    }

    return next(error);
  });
};

/**
 * ── THE SECOND WRITE ON THE PUBLIC SURFACE ───────────────────────────────
 *
 * Everything else under /public is a read of already-published CMS content,
 * apart from POST /public/contact-page/enquiries. This is the other one, and
 * it is unauthenticated for the same reason: the caller is a candidate on a
 * marketing page who holds neither an admin token nor an API key. There is no
 * mail transport in this project, so this row IS the delivery - if the request
 * fails, the applicant is gone, and the mailto: link this replaced at least
 * told them so.
 *
 * scripts/route-audit.js holds an explicit allowlist naming this exact route.
 * A THIRD public write, added by accident or arriving in a merge, still fails
 * that audit and has to be argued for there in writing. If this route ever
 * moves or is renamed, update PUBLIC_WRITE_ALLOWLIST - the audit fails loudly
 * either way.
 *
 * What stands in for authentication here:
 *
 *   careerApplicationRateLimit  per-IP, ten an hour.
 *   ...GlobalRateLimit          the same route counted across every caller at
 *                               once, because the per-IP key is only as honest
 *                               as the proxy in front of it and this is the one
 *                               route where an accepted request costs disk.
 *   multer's limits             one file, 5 MB, and every other dimension of
 *                               the parse bounded - see resumeUpload.
 *   readResumeUpload            type by declared mime AND by extension, size,
 *                               and a filename reduced to a small character
 *                               class before it is stored or echoed.
 *   the validator               every field bounded.
 *   the vacancy check           the target must be an ACTIVE vacancy, so an
 *                               id kept from a role that has since been taken
 *                               down cannot be used to keep applying.
 *   the response                a receipt only: { received: true, id }.
 *
 * There is deliberately no public GET anywhere near this. An inbox of other
 * people's CVs behind a guessable URL is the failure mode this whole module is
 * written to avoid - which is also why 'career_resume' is not on
 * PUBLIC_FILE_ENTITY_TYPES.
 */
export const publicCareerApplicationsRouter = Router();

publicCareerApplicationsRouter.post(
  '/',
  // Per-IP first, so an ordinary flood is refused against its own budget and
  // never spends the shared one; then the global backstop, which is the only
  // control here that a spoofed X-Forwarded-For cannot walk around.
  careerApplicationRateLimit,
  careerApplicationGlobalRateLimit,
  acceptResume,
  asyncHandler(createPublicCareerApplicationController),
);
