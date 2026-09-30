// src/core/middleware/recaptcha.middleware.ts

import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { toInetOrNull } from '../utils/client-ip';
import { logger } from '../utils/logger';
import { recaptchaEnabled, verifyRecaptchaToken } from '../utils/recaptcha';

/**
 * The body field both front ends send the token in.
 *
 * It is stripped from req.body before the route's own validator runs, so no
 * validator has to learn about it and none of them will reject the request for
 * carrying an unexpected key.
 */
const TOKEN_FIELD = 'recaptchaToken';

/**
 * Requires a valid reCAPTCHA token on a request.
 *
 * Mounted on the two forms a stranger can POST to: the admin sign-in, and the
 * public contact enquiry. Both are the classic targets - one for credential
 * stuffing, the other for bot spam that lands in a human inbox.
 *
 * ── The policy on an unreachable Google ──────────────────────────────────
 *
 * A rejected token is a 400 and stops the request. An unreachable Google is
 * NOT, and the difference is deliberate: if a network blip or a Google outage
 * turned into "nobody can sign in to the admin panel and no lead can be
 * submitted", the captcha would have become a bigger availability risk than
 * the spam it exists to stop. So verification failing *open* is the chosen
 * trade, and it is logged at WARN every time so an outage is visible rather
 * than silent.
 *
 * What is NOT failed open is a bad secret. That is caught in recaptcha.ts and
 * reported as unavailable too - the same trade, for the same reason, but it is
 * logged at ERROR because it is a misconfiguration that will not fix itself.
 *
 * With no secret configured at all the middleware is a pass-through, so the
 * routes below behave exactly as they did before this existed.
 */
export const requireRecaptcha = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const token = body[TOKEN_FIELD];

  // Removed whether or not the check is on, so a stored row can never end up
  // with a captcha token in it and the validators stay unaware of the field.
  if (TOKEN_FIELD in body) delete body[TOKEN_FIELD];

  if (!recaptchaEnabled()) return next();

  const outcome = await verifyRecaptchaToken(token, toInetOrNull(req.ip ?? null));
  if (outcome.ok) return next();

  if (outcome.reason === 'unavailable') {
    logger.warn('reCAPTCHA could not be verified - allowing the request through', {
      path: req.originalUrl,
      codes: outcome.codes,
    });
    return next();
  }

  /*
   * 400 rather than 422: this is not a field the person filled in wrongly, so
   * it does not belong in the field-error list a ValidationError produces. The
   * message is written to be shown as-is, because the only useful recovery is
   * to tick the box again.
   */
  logger.warn('reCAPTCHA rejected a submission', {
    path: req.originalUrl,
    codes: outcome.codes,
  });
  return next(
    new AppError(
      'Captcha verification failed. Please tick the checkbox and try again.',
      400,
      'RECAPTCHA_FAILED',
    ),
  );
};
