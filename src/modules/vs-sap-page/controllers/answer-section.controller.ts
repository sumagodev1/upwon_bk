// src/modules/vs-sap-page/controllers/answer-section.controller.ts

import { Request, Response } from 'express';
import * as answerSectionService from '../services/answer-section.service';
import { validateReplaceVsSapAnswerSection } from '../validators/answer-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';

export const getVsSapAnswerSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await answerSectionService.get();
  return ApiResponse.success(
    res,
    section,
    section
      ? 'Straight answer section retrieved successfully'
      : 'Straight answer section has not been set up yet',
  );
};

export const replaceVsSapAnswerSectionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateReplaceVsSapAnswerSection(req.body);
  const section = await answerSectionService.replace(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Straight answer section saved successfully');
};

/** The website-facing read. 404 while the section has never been authored. */
export const getPublicVsSapAnswerSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await answerSectionService.getPublished();
  return ApiResponse.success(res, section, 'Straight answer section retrieved successfully');
};
