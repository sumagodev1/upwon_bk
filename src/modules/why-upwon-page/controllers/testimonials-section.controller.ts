// src/modules/why-upwon-page/controllers/testimonials-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import * as service from '../services/testimonials-section.service';
import {
  validateCreateWhyUpwonClientLogo,
  validateCreateWhyUpwonTestimonial,
  validateUpdateWhyUpwonClientLogo,
  validateUpdateWhyUpwonTestimonial,
  validateUpsertWhyUpwonTestimonialsPanel,
  validateWhyUpwonClientLogoListQuery,
  validateWhyUpwonClientLogoReorder,
  validateWhyUpwonTestimonialListQuery,
  validateWhyUpwonTestimonialReorder,
  validateWhyUpwonTestimonialsStatusBody,
} from '../validators/testimonials-section.validator';

/**
 * The Why UpWon page's customer trust & testimonials section: the
 * testimonials, the client wall, and the panel of small lines around them.
 *
 * Three groups of endpoints under one section, because the page renders them
 * as one band but an editor changes them independently.
 */

// The testimonials.

export const getAllWhyUpwonTestimonialsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWhyUpwonTestimonialListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listTestimonials(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Testimonials retrieved successfully');
};

export const getWhyUpwonTestimonialByIdController = async (req: Request, res: Response) => {
  const testimonial = await service.getTestimonialById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, testimonial, 'Testimonial retrieved successfully');
};

export const createWhyUpwonTestimonialController = async (req: Request, res: Response) => {
  const dto = validateCreateWhyUpwonTestimonial(req.body);
  const testimonial = await service.createTestimonial(dto, buildContext(req));
  return ApiResponse.created(res, testimonial, 'Testimonial created successfully');
};

export const updateWhyUpwonTestimonialController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWhyUpwonTestimonial(req.body);
  const testimonial = await service.updateTestimonial(id, dto, buildContext(req));
  return ApiResponse.success(res, testimonial, 'Testimonial updated successfully');
};

export const updateWhyUpwonTestimonialStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWhyUpwonTestimonialsStatusBody(req.body);
  const testimonial = await service.setTestimonialStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    testimonial,
    status === 'ACTIVE' ? 'Testimonial activated' : 'Testimonial deactivated',
  );
};

export const reorderWhyUpwonTestimonialsController = async (req: Request, res: Response) => {
  const { ids } = validateWhyUpwonTestimonialReorder(req.body);
  const testimonials = await service.reorderTestimonials(ids, buildContext(req));
  return ApiResponse.success(res, testimonials, 'Testimonials reordered successfully');
};

export const deleteWhyUpwonTestimonialController = async (req: Request, res: Response) => {
  await service.removeTestimonial(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The client wall.

export const getAllWhyUpwonClientLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWhyUpwonClientLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Logos retrieved successfully');
};

export const getWhyUpwonClientLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Logo retrieved successfully');
};

export const createWhyUpwonClientLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateWhyUpwonClientLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Logo created successfully');
};

export const updateWhyUpwonClientLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWhyUpwonClientLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Logo updated successfully');
};

export const updateWhyUpwonClientLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWhyUpwonTestimonialsStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(res, logo, status === 'ACTIVE' ? 'Logo activated' : 'Logo deactivated');
};

export const reorderWhyUpwonClientLogosController = async (req: Request, res: Response) => {
  const { ids } = validateWhyUpwonClientLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Logos reordered successfully');
};

export const deleteWhyUpwonClientLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The panel.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getWhyUpwonTestimonialsPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Testimonials panel retrieved successfully');
};

export const updateWhyUpwonTestimonialsPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertWhyUpwonTestimonialsPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Testimonials panel saved successfully');
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicWhyUpwonTestimonialsSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Testimonials section retrieved successfully');
};
