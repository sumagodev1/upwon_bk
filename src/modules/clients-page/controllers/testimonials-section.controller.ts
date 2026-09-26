// src/modules/clients-page/controllers/testimonials-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import * as service from '../services/testimonials-section.service';
import {
  validateClientsTestimonialListQuery,
  validateClientsTestimonialStatus,
  validateCreateClientsTestimonial,
  validateReorderClientsTestimonials,
  validateUpdateClientsTestimonial,
} from '../validators/testimonials-section.validator';

/** The Clients page's testimonials. */

export const getAllClientsTestimonialsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateClientsTestimonialListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Testimonials retrieved successfully');
};

export const getClientsTestimonialByIdController = async (req: Request, res: Response) => {
  const testimonial = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, testimonial, 'Testimonial retrieved successfully');
};

export const createClientsTestimonialController = async (req: Request, res: Response) => {
  const dto = validateCreateClientsTestimonial(req.body);
  const testimonial = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, testimonial, 'Testimonial created successfully');
};

export const updateClientsTestimonialController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateClientsTestimonial(req.body);
  const testimonial = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, testimonial, 'Testimonial updated successfully');
};

export const updateClientsTestimonialStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateClientsTestimonialStatus(req.body);
  const testimonial = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    testimonial,
    status === 'ACTIVE' ? 'Testimonial published' : 'Testimonial unpublished',
  );
};

export const reorderClientsTestimonialsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderClientsTestimonials(req.body);
  const testimonials = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, testimonials, 'Testimonials reordered successfully');
};

export const deleteClientsTestimonialController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy and every active testimonial in one response.
 * 200 with a null body when nothing is published - the site then keeps its own.
 */
export const getPublicClientsTestimonialsSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Testimonials retrieved successfully');
};
