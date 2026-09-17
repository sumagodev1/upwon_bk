// src/modules/notifications/controllers/notification.controller.ts

import { Request, Response } from 'express';
import * as notificationService from '../services/notification.service';
import {
  validateCreateNotification,
  validateNotificationQuery,
} from '../validators/notification.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const listNotificationsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateNotificationQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta, unreadCount } = await notificationService.listForAdmin(
    req.admin!.id,
    filters,
    pagination,
  );
  return ApiResponse.paginated(
    res,
    rows,
    { ...meta, ...({ unreadCount } as Record<string, number>) },
    'Notifications retrieved successfully',
  );
};

export const createNotificationController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateNotification(req.body);
  const result = await notificationService.create(dto, buildContext(req));
  return ApiResponse.created(res, result, 'Notification created successfully');
};

export const markNotificationReadController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await notificationService.markRead(id, req.admin!.id);
  return ApiResponse.success(res, null, 'Notification marked as read');
};

export const markAllNotificationsReadController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const result = await notificationService.markAllRead(req.admin!.id);
  return ApiResponse.success(res, result, 'All notifications marked as read');
};
