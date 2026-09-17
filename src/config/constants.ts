// ── Status enums ─────────────────────────────────────────────────────────
// Mirrored by CHECK constraints in the database. TypeScript is the first line
// of defence, the constraint is the guarantee.

export const ADMIN_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export const ORGANIZATION_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const PLAN_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const BILLING_INTERVALS = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = [
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'CANCELLED',
  'EXPIRED',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'SYSTEM',
  'SECURITY',
  'BILLING',
  'ORGANIZATION',
  'GENERAL',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const API_KEY_STATUSES = ['ACTIVE', 'REVOKED', 'EXPIRED'] as const;
export type ApiKeyStatus = (typeof API_KEY_STATUSES)[number];

export const STORAGE_PROVIDERS = ['LOCAL', 'S3', 'GCS', 'AZURE'] as const;
export type StorageProviderName = (typeof STORAGE_PROVIDERS)[number];

// ── Roles ────────────────────────────────────────────────────────────────

/**
 * The single seeded role.
 *
 * ADMIN is the unrestricted role: the authorization middleware short-circuits
 * every permission check for it, so it holds no role_permissions rows. Custom,
 * limited roles can still be created at runtime through POST /roles - they get
 * explicit grants and are checked normally.
 */
export const SYSTEM_ROLES = {
  ADMIN: 'ADMIN',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

/** The role that bypasses permission checks. */
export const ROOT_ROLE: SystemRole = SYSTEM_ROLES.ADMIN;

// ── Permissions ──────────────────────────────────────────────────────────
// This object is the catalogue of record. The permission seed reads from it,
// so a key here always exists in the database and a key checked in code always
// exists here.

export const PERMISSIONS = {
  ADMINS_CREATE: 'admins.create',
  ADMINS_READ: 'admins.read',
  ADMINS_UPDATE: 'admins.update',
  ADMINS_DELETE: 'admins.delete',

  ROLES_CREATE: 'roles.create',
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',

  PERMISSIONS_READ: 'permissions.read',

  ORGANIZATIONS_CREATE: 'organizations.create',
  ORGANIZATIONS_READ: 'organizations.read',
  ORGANIZATIONS_UPDATE: 'organizations.update',
  ORGANIZATIONS_DELETE: 'organizations.delete',

  PLANS_CREATE: 'plans.create',
  PLANS_READ: 'plans.read',
  PLANS_UPDATE: 'plans.update',
  PLANS_DELETE: 'plans.delete',

  SUBSCRIPTIONS_READ: 'subscriptions.read',
  SUBSCRIPTIONS_UPDATE: 'subscriptions.update',

  DASHBOARD_READ: 'dashboard.read',
  AUDIT_LOGS_READ: 'audit_logs.read',

  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',

  NOTIFICATIONS_READ: 'notifications.read',
  NOTIFICATIONS_CREATE: 'notifications.create',

  API_KEYS_READ: 'api_keys.read',
  API_KEYS_CREATE: 'api_keys.create',
  API_KEYS_REVOKE: 'api_keys.revoke',

  FILES_READ: 'files.read',
  FILES_UPLOAD: 'files.upload',
  FILES_DELETE: 'files.delete',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

/** Human-readable descriptions, consumed by the permission seed. */
export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  'admins.create': 'Create new administrator accounts',
  'admins.read': 'View administrator accounts',
  'admins.update': 'Update administrator accounts, status, and roles',
  'admins.delete': 'Delete administrator accounts',

  'roles.create': 'Create new roles',
  'roles.read': 'View roles and their permissions',
  'roles.update': 'Update roles and their permission grants',
  'roles.delete': 'Delete non-system roles',

  'permissions.read': 'View the permission catalogue',

  'organizations.create': 'Create customer organizations',
  'organizations.read': 'View customer organizations',
  'organizations.update': 'Update organizations and change their status',
  'organizations.delete': 'Delete customer organizations',

  'plans.create': 'Create subscription plans',
  'plans.read': 'View subscription plans',
  'plans.update': 'Update subscription plans',
  'plans.delete': 'Archive subscription plans',

  'subscriptions.read': 'View customer subscriptions',
  'subscriptions.update': 'Create, update, and cancel customer subscriptions',

  'dashboard.read': 'View platform dashboard and analytics',
  'audit_logs.read': 'View the audit trail',

  'settings.read': 'View platform settings',
  'settings.update': 'Update platform settings',

  'notifications.read': 'View notifications',
  'notifications.create': 'Create and broadcast notifications',

  'api_keys.read': 'View API keys',
  'api_keys.create': 'Create API keys',
  'api_keys.revoke': 'Revoke API keys',

  'files.read': 'View and download files',
  'files.upload': 'Upload files',
  'files.delete': 'Delete files',
};

/**
 * Default grants for seeded system roles.
 *
 * Empty because ADMIN is the only system role, and its access is a
 * short-circuit in the authorization middleware rather than a set of rows.
 * Granting it explicitly would create a class of bug where deleting a row
 * silently downgrades the break-glass role.
 *
 * Custom roles created through POST /roles carry their own grants; this map
 * only covers roles the seed creates.
 */
export const DEFAULT_ROLE_PERMISSIONS: Partial<Record<SystemRole, PermissionKey[]>> = {};

export const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  ADMIN: 'Unrestricted access to every platform capability',
};

// ── Audit actions ────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_LOGIN_FAILED: 'ADMIN_LOGIN_FAILED',
  ADMIN_LOGOUT: 'ADMIN_LOGOUT',
  ADMIN_LOGOUT_ALL: 'ADMIN_LOGOUT_ALL',
  ADMIN_TOKEN_REFRESHED: 'ADMIN_TOKEN_REFRESHED',
  SESSION_REUSE_DETECTED: 'SESSION_REUSE_DETECTED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',

  ADMIN_CREATED: 'ADMIN_CREATED',
  ADMIN_UPDATED: 'ADMIN_UPDATED',
  ADMIN_STATUS_CHANGED: 'ADMIN_STATUS_CHANGED',
  ADMIN_ROLES_CHANGED: 'ADMIN_ROLES_CHANGED',
  ADMIN_DELETED: 'ADMIN_DELETED',

  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_PERMISSIONS_CHANGED: 'ROLE_PERMISSIONS_CHANGED',
  ROLE_DELETED: 'ROLE_DELETED',

  ORGANIZATION_CREATED: 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED: 'ORGANIZATION_UPDATED',
  ORGANIZATION_STATUS_CHANGED: 'ORGANIZATION_STATUS_CHANGED',
  ORGANIZATION_DELETED: 'ORGANIZATION_DELETED',

  PLAN_CREATED: 'PLAN_CREATED',
  PLAN_UPDATED: 'PLAN_UPDATED',
  PLAN_ARCHIVED: 'PLAN_ARCHIVED',

  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',

  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DELETED: 'FILE_DELETED',
  NOTIFICATION_CREATED: 'NOTIFICATION_CREATED',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// ── Settings ─────────────────────────────────────────────────────────────

export const SETTING_KEYS = {
  PLATFORM_NAME: 'platform_name',
  SUPPORT_EMAIL: 'support_email',
  MAINTENANCE_MODE: 'maintenance_mode',
  DEFAULT_SUBSCRIPTION_PLAN: 'default_subscription_plan',
  SECURITY_SETTINGS: 'security_settings',
} as const;

// ── Misc limits ──────────────────────────────────────────────────────────

export const LIMITS = {
  MAX_ROLES_PER_ADMIN: 20,
  MAX_PERMISSIONS_PER_ROLE: 200,
  SESSION_RETENTION_DAYS: 30,
  RECENT_ACTIVITY_LIMIT: 15,
  SUBSCRIPTION_EXPIRY_HORIZON_DAYS: 30,
  ANALYTICS_MAX_DAYS: 365,
  ANALYTICS_DEFAULT_DAYS: 30,
} as const;
