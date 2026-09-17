// src/modules/organizations/validators/organization.validator.ts

import { ORGANIZATION_STATUSES } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  UpdateOrganizationStatusDto,
} from '../types/organization.dto';
import { OrganizationFilters } from '../types/organization.types';

export function validateCreateOrganization(body: unknown): CreateOrganizationDto {
  const v = validator(body);
  const dto: CreateOrganizationDto = {
    name: v.requiredString('name', { min: 2, max: 200 }),
    // Optional: the service derives it from the name when absent.
    slug: v.has('slug') ? v.slug('slug') : undefined,
    email: v.requiredEmail('email'),
    phone: v.optionalPhone('phone'),
    status: v.optionalEnum('status', ORGANIZATION_STATUSES) ?? 'ACTIVE',
  };
  v.assert();
  return dto;
}

export function validateUpdateOrganization(body: unknown): UpdateOrganizationDto {
  const v = validator(body);

  // Status changes go through PATCH /:id/status - they carry a different audit
  // action and different business rules.
  v.custom(
    !v.has('status'),
    'status',
    'Use PATCH /organizations/:id/status to change status',
    'WRONG_ENDPOINT',
  );
  v.requireAtLeastOne(['name', 'slug', 'email', 'phone']);

  const dto: UpdateOrganizationDto = {
    name: v.optionalString('name', { min: 2, max: 200 }),
    slug: v.has('slug') ? v.slug('slug') : undefined,
    email: v.optionalEmail('email'),
    phone: v.optionalPhone('phone'),
  };
  v.assert();
  return dto;
}

export function validateUpdateOrganizationStatus(body: unknown): UpdateOrganizationStatusDto {
  const v = validator(body);
  const dto: UpdateOrganizationStatusDto = {
    status: v.requiredEnum('status', ORGANIZATION_STATUSES),
    reason: v.optionalString('reason', { max: 500 }),
  };
  v.assert();
  return dto;
}

export function validateOrganizationListQuery(query: Record<string, unknown>): {
  filters: OrganizationFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: OrganizationFilters = {
    status: v.optionalEnum('status', ORGANIZATION_STATUSES),
    planId: v.optionalUuid('planId'),
    createdFrom: v.optionalDate('createdFrom'),
    createdTo: v.optionalDate('createdTo'),
  };
  v.custom(
    !filters.createdFrom || !filters.createdTo || filters.createdFrom <= filters.createdTo,
    'createdFrom',
    'createdFrom must be on or before createdTo',
    'INVALID_RANGE',
  );
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
