// src/modules/about-page/controllers/founder-note.controller.ts

import { Request, Response } from 'express';
import * as founderNoteService from '../services/founder-note.service';
import { validateReplaceAboutFounderNote } from '../validators/founder-note.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getAboutFounderNoteController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await founderNoteService.get();
  return ApiResponse.success(
    res,
    section,
    section ? 'Founder note retrieved successfully' : 'Founder note has not been set up yet',
  );
};

export const replaceAboutFounderNoteController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceAboutFounderNote(req.body);
  const section = await founderNoteService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Founder note saved successfully');
};

/** The website-facing read. 404 while nothing has been authored. */
export const getPublicAboutFounderNoteController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await founderNoteService.getPublished();
  return ApiResponse.success(res, section, 'Founder note retrieved successfully');
};
