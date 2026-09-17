import { OrganizationStatus } from '../../../config/constants';
import { Organization, OrganizationDetail, OrganizationListItem } from './organization.types';

// ── inbound ──────────────────────────────────────────────────────────────
export interface CreateOrganizationDto {
  name: string;
  slug?: string;
  email: string;
  phone?: string;
  status: OrganizationStatus;
}

export interface UpdateOrganizationDto {
  name?: string;
  slug?: string;
  email?: string;
  phone?: string;
}

export interface UpdateOrganizationStatusDto {
  status: OrganizationStatus;
  reason?: string;
}

// ── outbound ─────────────────────────────────────────────────────────────
export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationListItemDto extends OrganizationDto {
  currentPlan: { name: string | null; code: string | null };
  subscriptionStatus: string | null;
  subscriptionEndDate: string | null;
}

export interface OrganizationDetailDto extends OrganizationListItemDto {
  subscriptionCount: number;
}

export function toOrganizationDto(organization: Organization): OrganizationDto {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    email: organization.email,
    phone: organization.phone,
    status: organization.status,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

export function toOrganizationListItemDto(
  organization: OrganizationListItem,
): OrganizationListItemDto {
  return {
    ...toOrganizationDto(organization),
    currentPlan: { name: organization.planName, code: organization.planCode },
    subscriptionStatus: organization.subscriptionStatus,
    subscriptionEndDate: organization.subscriptionEndDate
      ? organization.subscriptionEndDate.toISOString()
      : null,
  };
}

export function toOrganizationDetailDto(
  organization: OrganizationDetail,
): OrganizationDetailDto {
  return {
    ...toOrganizationListItemDto(organization),
    subscriptionCount: organization.subscriptionCount,
  };
}
