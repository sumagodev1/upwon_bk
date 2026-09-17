export interface Permission {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
  createdAt: Date;
}

export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export interface ResolvedAccess {
  roles: string[];
  permissions: Set<string>;
}
