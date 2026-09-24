// src/modules/home-page/controllers/testimonials-section.controller.ts

import { Request, Response } from 'express';
import * as testimonialsSectionService from '../services/testimonials-section.service';
import {
  validateCreateTestimonialEntry,
  validateReorderTestimonialEntries,
  validateTestimonialEntryListQuery,
  validateTestimonialEntryStatus,
  validateUpdateTestimonialEntry,
} from '../validators/testimonials-section.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllTestimonialEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateTestimonialEntryListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await testimonialsSectionService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Testimonials retrieved successfully');
};

export const getTestimonialEntryByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const entry = await testimonialsSectionService.getById(id);
  return ApiResponse.success(res, entry, 'Testimonial retrieved successfully');
};

export const createTestimonialEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateTestimonialEntry(req.body);
  const entry = await testimonialsSectionService.create(dto, buildContext(req));
  return ApiResponse.created(res, entry, 'Testimonial created successfully');
};

export const updateTestimonialEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateTestimonialEntry(req.body);
  const entry = await testimonialsSectionService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, entry, 'Testimonial updated successfully');
};

export const updateTestimonialEntryStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateTestimonialEntryStatus(req.body);
  const entry = await testimonialsSectionService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    entry,
    status === 'ACTIVE' ? 'Testimonial activated' : 'Testimonial deactivated',
  );
};

export const reorderTestimonialEntriesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderTestimonialEntries(req.body);
  const entries = await testimonialsSectionService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, entries, 'Testimonials reordered successfully');
};

export const deleteTestimonialEntryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await testimonialsSectionService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy from the first active card, and the
 * marquee of every active card whose poster still resolves.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicTestimonialsSectionController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const section = await testimonialsSectionService.getPublished();
  return ApiResponse.success(res, section, 'Testimonials section retrieved successfully');
};
