import { OrganizationStatus } from '../../../config/constants';
import { DateRangeFilter } from '../../../core/types/common.types';

export type { OrganizationStatus };

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface OrganizationSubscriptionSummary {
  planName: string | null;
  planCode: string | null;
  subscriptionStatus: string | null;
  subscriptionEndDate: Date | null;
}

export interface OrganizationListItem extends Organization, OrganizationSubscriptionSummary {}

export interface OrganizationDetail extends OrganizationListItem {
  subscriptionCount: number;
}

export interface OrganizationFilters extends DateRangeFilter {
  status?: OrganizationStatus;
  planId?: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  email: string;
  phone?: string | null;
  status: OrganizationStatus;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  email?: string;
  phone?: string | null;
}
