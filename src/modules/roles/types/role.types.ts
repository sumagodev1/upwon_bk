import { Permission } from '../../permissions/types/permission.types';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
  adminCount: number;
}

export interface CreateRoleInput {
  name: string;
  description?: string | null;
  isSystemRole?: boolean;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
}

export interface CreateRoleDto extends CreateRoleInput {
  permissionIds: string[];
}

export interface UpdateRoleDto extends UpdateRoleInput {}

export interface ReplaceRolePermissionsDto {
  permissionIds: string[];
}
