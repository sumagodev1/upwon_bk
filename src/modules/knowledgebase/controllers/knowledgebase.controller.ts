// src/modules/knowledgebase/controllers/knowledgebase.controller.ts

import { Request, Response } from 'express';
import { KB_CATEGORY_ICON_NAMES } from '../utils/icons';
import { ApiResponse } from '../../../core/utils/ApiResponse';

/**
 * The icon names a category may use, in the order the picker offers them.
 * Served so the admin panel's picker can never offer a name the validator
 * would refuse - and served here, on knowledgebase.read, so a role granted the
 * knowledgebase alone does not need blog.read to fill it in.
 */
export const getKbIconsController = async (
  _req: Request,
  res: Response,
): Promise<Response> =>
  ApiResponse.success(res, KB_CATEGORY_ICON_NAMES, 'Available icons retrieved successfully');
