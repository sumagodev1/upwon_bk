// src/modules/social-media-links/controllers/social-media-links.controller.ts

import { Request, Response } from 'express';
import * as socialMediaLinksService from '../services/social-media-links.service';
import { SOCIAL_MEDIA_ICON_NAMES } from '../utils/icons';
import { ApiResponse } from '../../../core/utils/ApiResponse';

/**
 * The icons an administrator may pick, for either list.
 *
 * Served rather than duplicated as a constant in the panel, so the picker can
 * never offer a name the server would reject.
 */
export const getSocialMediaIconsController = async (
  _req: Request,
  res: Response,
): Promise<Response> =>
  ApiResponse.success(res, SOCIAL_MEDIA_ICON_NAMES, 'Available icons retrieved successfully');

/**
 * The website-facing read: both of the footer's lists, ACTIVE rows only, in
 * display order. Always a 200 - see socialMediaLinksService.getPublished.
 */
export const getPublicSocialMediaLinksController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const links = await socialMediaLinksService.getPublished();
  return ApiResponse.success(res, links, 'Social media links retrieved successfully');
};
