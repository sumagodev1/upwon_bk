// src/modules/notifications/validators/notification.validator.ts

import { validator } from '../../../core/utils/validation';
import { parsePagination } from '../../../core/utils/pagination';
import { NOTIFICATION_TYPES } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { CreateNotificationInput, NotificationFilters } from '../types/notification.types';

export function validateCreateNotification(body: unknown): CreateNotificationInput {
  const v = validator(body);
  const dto: CreateNotificationInput = {
    adminId: v.optionalUuid('adminId') ?? null,
    type: v.requiredEnum('type', NOTIFICATION_TYPES),
    title: v.requiredString('title', { min: 2, max: 200 }),
    body: v.optionalString('body', { max: 5000 }) ?? null,
    metadata: v.jsonObject('metadata'),
  };
  v.assert();
  return dto;
}

export function validateNotificationQuery(query: Record<string, unknown>): {
  filters: NotificationFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: NotificationFilters = {
    type: v.optionalEnum('type', NOTIFICATION_TYPES),
    unreadOnly: v.optionalBoolean('unreadOnly'),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
