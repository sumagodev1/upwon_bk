// src/modules/subscriptions/controllers/subscription.controller.ts

import { Request, Response } from 'express';
import * as subscriptionService from '../services/subscription.service';
import {
  validateCancelSubscription,
  validateCreateSubscription,
  validateSubscriptionListQuery,
  validateUpdateSubscription,
} from '../validators/subscription.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllSubscriptionsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateSubscriptionListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await subscriptionService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Subscriptions retrieved successfully');
};

export const getSubscriptionByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const subscription = await subscriptionService.getById(id);
  return ApiResponse.success(res, subscription, 'Subscription retrieved successfully');
};

export const createSubscriptionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateSubscription(req.body);
  const subscription = await subscriptionService.create(dto, buildContext(req));
  return ApiResponse.created(res, subscription, 'Subscription created successfully');
};

export const updateSubscriptionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSubscription(req.body);
  const subscription = await subscriptionService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, subscription, 'Subscription updated successfully');
};

export const cancelSubscriptionController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateCancelSubscription(req.body);
  const subscription = await subscriptionService.cancel(id, dto, buildContext(req));
  return ApiResponse.success(res, subscription, 'Subscription cancelled successfully');
};
