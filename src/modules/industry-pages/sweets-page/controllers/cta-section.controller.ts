// src/modules/industry-pages/sweets-page/controllers/cta-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import * as service from '../services/cta-section.service';
import { validateUpsertSweetsCtaSection } from '../validators/cta-section.validator';

/** The Sweets & Namkeen page's closing band: one record, read and replaced. */

// ── the band ──────────────────────────────────────────────────────────────

/**
 * Returns 200 with a null body when the band has never been authored, rather
 * than a 404 - that is a normal first-run answer, and the form treats it as an
 * empty state instead of an error.
 */
export const getSweetsCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.get();
  return ApiResponse.success(res, section, 'Sweets closing band retrieved successfully');
};

export const updateSweetsCtaSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertSweetsCtaSection(req.body);
  const section = await service.upsert(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Sweets closing band saved successfully');
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The copy and the band in one call.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSweetsCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Sweets closing band retrieved successfully');
};
