// src/modules/careers/controllers/applications.controller.ts

import { Request, Response } from 'express';
import * as applicationsService from '../services/applications.service';
import {
  validateCareerApplicationListQuery,
  validateCareerApplicationStatus,
  validateCreateCareerApplication,
} from '../validators/applications.validator';
import { ValidationError } from '../../../core/errors/ValidationError';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import { checkResumeUpload } from '../utils/resume-asset';

/**
 * The public submit. Unauthenticated by necessity - see the route file.
 *
 * The file is checked first but NOT thrown on: its problem, if any, is handed
 * to the field validator, which reports it alongside the body's errors in one
 * 422. An applicant who mistyped their email and attached the wrong kind of
 * file is told both things once rather than sent round twice, and nothing is
 * stored until every field, the file included, has passed.
 *
 * The response is a receipt, never the stored row: echoing it back would hand
 * an anonymous caller a confirmation of exactly what was recorded about them,
 * and give a scraper a way to probe what the columns accepted.
 */
export const createPublicCareerApplicationController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const checked = checkResumeUpload(req.file);
  const dto = validateCreateCareerApplication(req.body, checked.ok ? null : checked.error);

  // Unreachable unless the file passed: the validator above has already thrown
  // on checked.error, so ok is true by the time control gets here.
  if (!checked.ok) throw new ValidationError('Resume is not acceptable', [checked.error]);

  const id = await applicationsService.submit(dto, checked.resume, buildContext(req));
  return ApiResponse.created(
    res,
    { received: true, id },
    'Application received. We will be in touch if there is a fit.',
  );
};

// ── admin ─────────────────────────────────────────────────────────────────

export const listCareerApplicationsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateCareerApplicationListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await applicationsService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Applications retrieved successfully');
};

export const getCareerApplicationByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const application = await applicationsService.getById(id);
  return ApiResponse.success(res, application, 'Application retrieved successfully');
};

export const updateCareerApplicationStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateCareerApplicationStatus(req.body);
  const application = await applicationsService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(res, application, 'Application status updated');
};

/**
 * Streams the stored CV back as a download.
 *
 * attachment + nosniff, never inline, whatever the declared type claims: a
 * browser must not render a stranger's uploaded document inside the admin
 * panel's origin. The filename is percent-encoded, as the files module's
 * download does, so nothing in a name the applicant chose can reach the header
 * as syntax - and readResumeUpload has already reduced it to a small character
 * class on the way in.
 *
 * Cache-Control is explicit and private: this is one identified person's CV,
 * and it must not sit in a shared proxy or in the browser's disk cache after
 * an administrator signs out.
 */
export const downloadCareerApplicationResumeController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = validateUuidParam(req.params.id);
  const { fileName, mimeType, buffer } = await applicationsService.downloadResume(
    id,
    buildContext(req),
  );

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).send(buffer);
};
