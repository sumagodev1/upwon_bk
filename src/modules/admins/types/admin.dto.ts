import { AdminStatus } from '../../../config/constants';
import { Admin, AdminRoleRef, AdminWithRoles } from './admin.types';

// ── inbound ──────────────────────────────────────────────────────────────
export interface CreateAdminDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  status: AdminStatus;
  roleIds: string[];
}

export interface UpdateAdminDto {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UpdateAdminStatusDto {
  status: AdminStatus;
  reason?: string;
}

export interface ReplaceAdminRolesDto {
  roleIds: string[];
}

// ── outbound ─────────────────────────────────────────────────────────────
export interface AdminDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  status: AdminStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminListItemDto extends AdminDto {
  roles: AdminRoleRef[];
}

export interface AdminDetailDto extends AdminDto {
  roles: AdminRoleRef[];
  permissions: string[];
}

/**
 * The single boundary between the domain entity and the wire.
 *
 * Every field is listed explicitly - there is no spread of the entity - so a
 * column added to the table cannot leak into an API response without someone
 * deciding it should.
 */
export function toAdminDto(admin: Admin): AdminDto {
  return {
    id: admin.id,
    firstName: admin.firstName,
    lastName: admin.lastName,
    fullName: `${admin.firstName} ${admin.lastName}`,
    email: admin.email,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
  };
}

export function toAdminListItemDto(admin: AdminWithRoles): AdminListItemDto {
  return { ...toAdminDto(admin), roles: admin.roles };
}

export function toAdminDetailDto(
  admin: AdminWithRoles,
  permissions: string[],
): AdminDetailDto {
  return { ...toAdminDto(admin), roles: admin.roles, permissions };
}
