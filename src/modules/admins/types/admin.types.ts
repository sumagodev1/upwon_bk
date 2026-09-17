import { AdminStatus } from '../../../config/constants';
import { DateRangeFilter } from '../../../core/types/common.types';

export type { AdminStatus };

/** Domain entity - the shape repositories return. Never contains the hash. */
export interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: AdminStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Separate type, returned only by findByEmailWithPassword / findByIdWithPassword.
 * Making the hash a distinct type means it cannot be passed to a DTO mapper by
 * accident - the compiler rejects it.
 */
export interface AdminWithPassword extends Admin {
  passwordHash: string;
}

export interface AdminRoleRef {
  id: string;
  name: string;
  description: string | null;
}

export interface AdminWithRoles extends Admin {
  roles: AdminRoleRef[];
}

export interface AdminFilters extends DateRangeFilter {
  status?: AdminStatus;
  roleId?: string;
}

export interface CreateAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  status: AdminStatus;
}

export interface UpdateAdminInput {
  firstName?: string;
  lastName?: string;
  email?: string;
}
