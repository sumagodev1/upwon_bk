// src/modules/subscriptions/validators/subscription.validator.ts

import { SUBSCRIPTION_STATUSES } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import {
  CancelSubscriptionDto,
  SubscriptionFilters,
} from '../types/subscription.types';

export interface CreateSubscriptionDto {
  organizationId: string;
  planId: string;
  status?: (typeof SUBSCRIPTION_STATUSES)[number];
  startDate: Date;
  endDate?: Date;
}

export interface UpdateSubscriptionDto {
  planId?: string;
  status?: (typeof SUBSCRIPTION_STATUSES)[number];
  startDate?: Date;
  endDate?: Date | null;
}

export function validateCreateSubscription(body: unknown): CreateSubscriptionDto {
  const v = validator(body);
  const dto: CreateSubscriptionDto = {
    organizationId: v.requiredUuid('organizationId'),
    planId: v.requiredUuid('planId'),
    status: v.optionalEnum('status', SUBSCRIPTION_STATUSES),
    startDate: v.requiredDate('startDate'),
    endDate: v.optionalDate('endDate'),
  };
  v.custom(
    !dto.endDate || dto.endDate >= dto.startDate,
    'endDate',
    'endDate must be on or after startDate',
    'INVALID_RANGE',
  );
  v.custom(
    dto.status !== 'CANCELLED' && dto.status !== 'EXPIRED',
    'status',
    'A subscription cannot be created in a terminal status',
    'INVALID_INITIAL_STATUS',
  );
  v.assert();
  return dto;
}

export function validateUpdateSubscription(body: unknown): UpdateSubscriptionDto {
  const v = validator(body);
  v.custom(
    !v.has('organizationId'),
    'organizationId',
    'A subscription cannot be moved between organizations',
    'IMMUTABLE_FIELD',
  );
  v.requireAtLeastOne(['planId', 'status', 'startDate', 'endDate']);

  const dto: UpdateSubscriptionDto = {
    planId: v.optionalUuid('planId'),
    status: v.optionalEnum('status', SUBSCRIPTION_STATUSES),
    startDate: v.optionalDate('startDate'),
    endDate: v.has('endDate') ? (v.optionalDate('endDate') ?? null) : undefined,
  };
  v.assert();
  return dto;
}

export function validateCancelSubscription(body: unknown): CancelSubscriptionDto {
  const v = validator(body);
  const dto: CancelSubscriptionDto = {
    immediate: v.optionalBoolean('immediate'),
    reason: v.optionalString('reason', { max: 500 }),
  };
  v.assert();
  return dto;
}

export function validateSubscriptionListQuery(query: Record<string, unknown>): {
  filters: SubscriptionFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SubscriptionFilters = {
    organizationId: v.optionalUuid('organizationId'),
    planId: v.optionalUuid('planId'),
    status: v.optionalEnum('status', SUBSCRIPTION_STATUSES),
    expiringWithinDays: v.optionalNumber('expiringWithinDays', {
      integer: true,
      min: 1,
      max: 365,
    }),
    createdFrom: v.optionalDate('createdFrom'),
    createdTo: v.optionalDate('createdTo'),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
