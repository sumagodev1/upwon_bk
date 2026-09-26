// src/modules/blog/controllers/blog.controller.ts

import { Request, Response } from 'express';
import { BLOG_CATEGORY_ICON_NAMES } from '../utils/icons';
import { ApiResponse } from '../../../core/utils/ApiResponse';

/**
 * The icon names a category may use, in the order the picker offers them.
 * Served so the admin panel's picker can never offer a name the validator
 * would refuse.
 */
export const getBlogIconsController = async (
  _req: Request,
  res: Response,
): Promise<Response> =>
  ApiResponse.success(res, BLOG_CATEGORY_ICON_NAMES, 'Available icons retrieved successfully');
