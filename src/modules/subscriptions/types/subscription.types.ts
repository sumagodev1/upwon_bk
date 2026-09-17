import { BillingInterval, SubscriptionStatus } from '../../../config/constants';
import { DateRangeFilter } from '../../../core/types/common.types';

export type { SubscriptionStatus };

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionWithRefs extends Subscription {
  organizationName: string;
  organizationSlug: string;
  planName: string;
  planCode: string;
  planPrice: string;
  planCurrency: string;
  planBillingInterval: BillingInterval;
}

export interface SubscriptionFilters extends DateRangeFilter {
  organizationId?: string;
  planId?: string;
  status?: SubscriptionStatus;
  expiringWithinDays?: number;
}

export interface CreateSubscriptionInput {
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
}

export interface UpdateSubscriptionInput {
  planId?: string;
  status?: SubscriptionStatus;
  startDate?: Date;
  endDate?: Date | null;
}

export interface CancelSubscriptionDto {
  immediate?: boolean;
  reason?: string;
}
