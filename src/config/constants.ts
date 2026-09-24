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

/**
 * Publish state for CMS content rows - the home page sections, and anything else
 * the marketing site reads. An INACTIVE row stays editable in the admin panel
 * but is invisible to the public read endpoints; the alternative, deleting it,
 * throws away copy that is usually being rotated back in later.
 */
export const CONTENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

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

  // Module-wide rather than per-section: a new home page section reuses these
  // four keys instead of needing its own permissions added here and seeded.
  HOME_PAGE_READ: 'home_page.read',
  HOME_PAGE_CREATE: 'home_page.create',
  HOME_PAGE_UPDATE: 'home_page.update',
  HOME_PAGE_DELETE: 'home_page.delete',
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

  'home_page.read': 'View home page section content',
  'home_page.create': 'Create home page section content',
  'home_page.update': 'Update, reorder, and publish home page section content',
  'home_page.delete': 'Delete home page section content',
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

  HOME_HERO_SLIDE_CREATED: 'HOME_HERO_SLIDE_CREATED',
  HOME_HERO_SLIDE_UPDATED: 'HOME_HERO_SLIDE_UPDATED',
  HOME_HERO_SLIDE_STATUS_CHANGED: 'HOME_HERO_SLIDE_STATUS_CHANGED',
  HOME_HERO_SLIDES_REORDERED: 'HOME_HERO_SLIDES_REORDERED',
  HOME_HERO_SLIDE_DELETED: 'HOME_HERO_SLIDE_DELETED',

  HOME_TRUST_ENTRY_CREATED: 'HOME_TRUST_ENTRY_CREATED',
  HOME_TRUST_ENTRY_UPDATED: 'HOME_TRUST_ENTRY_UPDATED',
  HOME_TRUST_ENTRY_DELETED: 'HOME_TRUST_ENTRY_DELETED',
  HOME_TRUST_ENTRIES_REORDERED: 'HOME_TRUST_ENTRIES_REORDERED',

  HOME_INDUSTRIES_ENTRY_CREATED: 'HOME_INDUSTRIES_ENTRY_CREATED',
  HOME_INDUSTRIES_ENTRY_UPDATED: 'HOME_INDUSTRIES_ENTRY_UPDATED',
  HOME_INDUSTRIES_ENTRY_DELETED: 'HOME_INDUSTRIES_ENTRY_DELETED',
  HOME_INDUSTRIES_ENTRIES_REORDERED: 'HOME_INDUSTRIES_ENTRIES_REORDERED',

  HOME_VALUES_ENTRY_CREATED: 'HOME_VALUES_ENTRY_CREATED',
  HOME_VALUES_ENTRY_UPDATED: 'HOME_VALUES_ENTRY_UPDATED',
  HOME_VALUES_ENTRY_DELETED: 'HOME_VALUES_ENTRY_DELETED',
  HOME_VALUES_ENTRIES_REORDERED: 'HOME_VALUES_ENTRIES_REORDERED',

  HOME_INTEGRATIONS_ENTRY_CREATED: 'HOME_INTEGRATIONS_ENTRY_CREATED',
  HOME_INTEGRATIONS_ENTRY_UPDATED: 'HOME_INTEGRATIONS_ENTRY_UPDATED',
  HOME_INTEGRATIONS_ENTRY_DELETED: 'HOME_INTEGRATIONS_ENTRY_DELETED',
  HOME_INTEGRATIONS_ENTRIES_REORDERED: 'HOME_INTEGRATIONS_ENTRIES_REORDERED',

  HOME_TESTIMONIAL_ENTRY_CREATED: 'HOME_TESTIMONIAL_ENTRY_CREATED',
  HOME_TESTIMONIAL_ENTRY_UPDATED: 'HOME_TESTIMONIAL_ENTRY_UPDATED',
  HOME_TESTIMONIAL_ENTRY_DELETED: 'HOME_TESTIMONIAL_ENTRY_DELETED',
  HOME_TESTIMONIAL_ENTRIES_REORDERED: 'HOME_TESTIMONIAL_ENTRIES_REORDERED',

  HOME_FAQ_ENTRY_CREATED: 'HOME_FAQ_ENTRY_CREATED',
  HOME_FAQ_ENTRY_UPDATED: 'HOME_FAQ_ENTRY_UPDATED',
  HOME_FAQ_ENTRY_DELETED: 'HOME_FAQ_ENTRY_DELETED',
  HOME_FAQ_ENTRIES_REORDERED: 'HOME_FAQ_ENTRIES_REORDERED',

  HOME_SECTION_COPY_UPDATED: 'HOME_SECTION_COPY_UPDATED',
  HOME_CTA_SECTION_UPDATED: 'HOME_CTA_SECTION_UPDATED',

  ERP_HERO_SLIDE_CREATED: 'ERP_HERO_SLIDE_CREATED',
  ERP_HERO_SLIDE_UPDATED: 'ERP_HERO_SLIDE_UPDATED',
  ERP_HERO_SLIDE_DELETED: 'ERP_HERO_SLIDE_DELETED',
  ERP_HERO_SLIDES_REORDERED: 'ERP_HERO_SLIDES_REORDERED',

  ERP_FAQ_ENTRY_CREATED: 'ERP_FAQ_ENTRY_CREATED',
  ERP_FAQ_ENTRY_UPDATED: 'ERP_FAQ_ENTRY_UPDATED',
  ERP_FAQ_ENTRY_DELETED: 'ERP_FAQ_ENTRY_DELETED',
  ERP_FAQ_ENTRIES_REORDERED: 'ERP_FAQ_ENTRIES_REORDERED',

  ERP_CTA_SECTION_UPDATED: 'ERP_CTA_SECTION_UPDATED',

  ERP_TRUST_ENTRY_CREATED: 'ERP_TRUST_ENTRY_CREATED',
  ERP_TRUST_ENTRY_UPDATED: 'ERP_TRUST_ENTRY_UPDATED',
  ERP_TRUST_ENTRY_DELETED: 'ERP_TRUST_ENTRY_DELETED',
  ERP_TRUST_ENTRIES_REORDERED: 'ERP_TRUST_ENTRIES_REORDERED',

  ERP_INDUSTRY_CREATED: 'ERP_INDUSTRY_CREATED',
  ERP_INDUSTRY_UPDATED: 'ERP_INDUSTRY_UPDATED',
  ERP_INDUSTRY_DELETED: 'ERP_INDUSTRY_DELETED',
  ERP_INDUSTRIES_REORDERED: 'ERP_INDUSTRIES_REORDERED',

  ERP_INDUSTRY_FEATURE_CREATED: 'ERP_INDUSTRY_FEATURE_CREATED',
  ERP_INDUSTRY_FEATURE_UPDATED: 'ERP_INDUSTRY_FEATURE_UPDATED',
  ERP_INDUSTRY_FEATURE_DELETED: 'ERP_INDUSTRY_FEATURE_DELETED',
  ERP_INDUSTRY_FEATURES_REORDERED: 'ERP_INDUSTRY_FEATURES_REORDERED',

  ERP_INDUSTRY_BENEFIT_CREATED: 'ERP_INDUSTRY_BENEFIT_CREATED',
  ERP_INDUSTRY_BENEFIT_UPDATED: 'ERP_INDUSTRY_BENEFIT_UPDATED',
  ERP_INDUSTRY_BENEFIT_DELETED: 'ERP_INDUSTRY_BENEFIT_DELETED',
  ERP_INDUSTRY_BENEFITS_REORDERED: 'ERP_INDUSTRY_BENEFITS_REORDERED',

  ERP_JOURNEY_PERSONA_CREATED: 'ERP_JOURNEY_PERSONA_CREATED',
  ERP_JOURNEY_PERSONA_UPDATED: 'ERP_JOURNEY_PERSONA_UPDATED',
  ERP_JOURNEY_PERSONA_DELETED: 'ERP_JOURNEY_PERSONA_DELETED',
  ERP_JOURNEY_PERSONAS_REORDERED: 'ERP_JOURNEY_PERSONAS_REORDERED',

  ERP_JOURNEY_OUTCOME_CREATED: 'ERP_JOURNEY_OUTCOME_CREATED',
  ERP_JOURNEY_OUTCOME_UPDATED: 'ERP_JOURNEY_OUTCOME_UPDATED',
  ERP_JOURNEY_OUTCOME_DELETED: 'ERP_JOURNEY_OUTCOME_DELETED',
  ERP_JOURNEY_OUTCOMES_REORDERED: 'ERP_JOURNEY_OUTCOMES_REORDERED',

  ERP_JOURNEY_POINT_CREATED: 'ERP_JOURNEY_POINT_CREATED',
  ERP_JOURNEY_POINT_UPDATED: 'ERP_JOURNEY_POINT_UPDATED',
  ERP_JOURNEY_POINT_DELETED: 'ERP_JOURNEY_POINT_DELETED',
  ERP_JOURNEY_POINTS_REORDERED: 'ERP_JOURNEY_POINTS_REORDERED',

  ERP_JOURNEY_STAT_CREATED: 'ERP_JOURNEY_STAT_CREATED',
  ERP_JOURNEY_STAT_UPDATED: 'ERP_JOURNEY_STAT_UPDATED',
  ERP_JOURNEY_STAT_DELETED: 'ERP_JOURNEY_STAT_DELETED',
  ERP_JOURNEY_STATS_REORDERED: 'ERP_JOURNEY_STATS_REORDERED',

  COMPARISON_SECTION_UPDATED: 'COMPARISON_SECTION_UPDATED',

  COMPARISON_COLUMN_CREATED: 'COMPARISON_COLUMN_CREATED',
  COMPARISON_COLUMN_UPDATED: 'COMPARISON_COLUMN_UPDATED',
  COMPARISON_COLUMN_DELETED: 'COMPARISON_COLUMN_DELETED',
  COMPARISON_COLUMNS_REORDERED: 'COMPARISON_COLUMNS_REORDERED',

  COMPARISON_CATEGORY_CREATED: 'COMPARISON_CATEGORY_CREATED',
  COMPARISON_CATEGORY_UPDATED: 'COMPARISON_CATEGORY_UPDATED',
  COMPARISON_CATEGORY_DELETED: 'COMPARISON_CATEGORY_DELETED',
  COMPARISON_CATEGORIES_REORDERED: 'COMPARISON_CATEGORIES_REORDERED',

  COMPARISON_ROW_CREATED: 'COMPARISON_ROW_CREATED',
  COMPARISON_ROW_UPDATED: 'COMPARISON_ROW_UPDATED',
  COMPARISON_ROW_DELETED: 'COMPARISON_ROW_DELETED',
  COMPARISON_ROWS_REORDERED: 'COMPARISON_ROWS_REORDERED',

  ERP_OUTCOME_CARD_CREATED: 'ERP_OUTCOME_CARD_CREATED',
  ERP_OUTCOME_CARD_UPDATED: 'ERP_OUTCOME_CARD_UPDATED',
  ERP_OUTCOME_CARD_DELETED: 'ERP_OUTCOME_CARD_DELETED',
  ERP_OUTCOME_CARDS_REORDERED: 'ERP_OUTCOME_CARDS_REORDERED',

  ERP_ESTABLISHER_BADGE_CREATED: 'ERP_ESTABLISHER_BADGE_CREATED',
  ERP_ESTABLISHER_BADGE_UPDATED: 'ERP_ESTABLISHER_BADGE_UPDATED',
  ERP_ESTABLISHER_BADGE_DELETED: 'ERP_ESTABLISHER_BADGE_DELETED',
  ERP_ESTABLISHER_BADGES_REORDERED: 'ERP_ESTABLISHER_BADGES_REORDERED',

  SFA_HERO_SLIDE_CREATED: 'SFA_HERO_SLIDE_CREATED',
  SFA_HERO_SLIDE_UPDATED: 'SFA_HERO_SLIDE_UPDATED',
  SFA_HERO_SLIDE_DELETED: 'SFA_HERO_SLIDE_DELETED',
  SFA_HERO_SLIDES_REORDERED: 'SFA_HERO_SLIDES_REORDERED',

  SFA_FAQ_ENTRY_CREATED: 'SFA_FAQ_ENTRY_CREATED',
  SFA_FAQ_ENTRY_UPDATED: 'SFA_FAQ_ENTRY_UPDATED',
  SFA_FAQ_ENTRY_DELETED: 'SFA_FAQ_ENTRY_DELETED',
  SFA_FAQ_ENTRIES_REORDERED: 'SFA_FAQ_ENTRIES_REORDERED',

  SFA_CTA_SECTION_UPDATED: 'SFA_CTA_SECTION_UPDATED',

  SFA_PROOF_PANEL_UPDATED: 'SFA_PROOF_PANEL_UPDATED',

  SFA_PROOF_LOGO_CREATED: 'SFA_PROOF_LOGO_CREATED',
  SFA_PROOF_LOGO_UPDATED: 'SFA_PROOF_LOGO_UPDATED',
  SFA_PROOF_LOGO_DELETED: 'SFA_PROOF_LOGO_DELETED',
  SFA_PROOF_LOGOS_REORDERED: 'SFA_PROOF_LOGOS_REORDERED',

  SFA_PROOF_STAT_CREATED: 'SFA_PROOF_STAT_CREATED',
  SFA_PROOF_STAT_UPDATED: 'SFA_PROOF_STAT_UPDATED',
  SFA_PROOF_STAT_DELETED: 'SFA_PROOF_STAT_DELETED',
  SFA_PROOF_STATS_REORDERED: 'SFA_PROOF_STATS_REORDERED',

  SFA_VIDEO_ENTRY_CREATED: 'SFA_VIDEO_ENTRY_CREATED',
  SFA_VIDEO_ENTRY_UPDATED: 'SFA_VIDEO_ENTRY_UPDATED',
  SFA_VIDEO_ENTRY_DELETED: 'SFA_VIDEO_ENTRY_DELETED',
  SFA_VIDEO_ENTRIES_REORDERED: 'SFA_VIDEO_ENTRIES_REORDERED',

  SFA_PACKAGE_CARD_CREATED: 'SFA_PACKAGE_CARD_CREATED',
  SFA_PACKAGE_CARD_UPDATED: 'SFA_PACKAGE_CARD_UPDATED',
  SFA_PACKAGE_CARD_DELETED: 'SFA_PACKAGE_CARD_DELETED',
  SFA_PACKAGE_CARDS_REORDERED: 'SFA_PACKAGE_CARDS_REORDERED',

  SFA_PACKAGE_FEATURE_CREATED: 'SFA_PACKAGE_FEATURE_CREATED',
  SFA_PACKAGE_FEATURE_UPDATED: 'SFA_PACKAGE_FEATURE_UPDATED',
  SFA_PACKAGE_FEATURE_DELETED: 'SFA_PACKAGE_FEATURE_DELETED',
  SFA_PACKAGE_FEATURES_REORDERED: 'SFA_PACKAGE_FEATURES_REORDERED',

  SFA_COMPLIANCE_SECTION_UPDATED: 'SFA_COMPLIANCE_SECTION_UPDATED',

  SFA_COMPLIANCE_BADGE_CREATED: 'SFA_COMPLIANCE_BADGE_CREATED',
  SFA_COMPLIANCE_BADGE_UPDATED: 'SFA_COMPLIANCE_BADGE_UPDATED',
  SFA_COMPLIANCE_BADGE_DELETED: 'SFA_COMPLIANCE_BADGE_DELETED',
  SFA_COMPLIANCE_BADGES_REORDERED: 'SFA_COMPLIANCE_BADGES_REORDERED',

  SFA_ALTERNATIVES_SECTION_UPDATED: 'SFA_ALTERNATIVES_SECTION_UPDATED',
  SFA_ALTERNATIVES_COLUMN_CREATED: 'SFA_ALTERNATIVES_COLUMN_CREATED',
  SFA_ALTERNATIVES_COLUMN_UPDATED: 'SFA_ALTERNATIVES_COLUMN_UPDATED',
  SFA_ALTERNATIVES_COLUMN_DELETED: 'SFA_ALTERNATIVES_COLUMN_DELETED',
  SFA_ALTERNATIVES_COLUMNS_REORDERED: 'SFA_ALTERNATIVES_COLUMNS_REORDERED',
  SFA_ALTERNATIVES_ROW_CREATED: 'SFA_ALTERNATIVES_ROW_CREATED',
  SFA_ALTERNATIVES_ROW_UPDATED: 'SFA_ALTERNATIVES_ROW_UPDATED',
  SFA_ALTERNATIVES_ROW_DELETED: 'SFA_ALTERNATIVES_ROW_DELETED',
  SFA_ALTERNATIVES_ROWS_REORDERED: 'SFA_ALTERNATIVES_ROWS_REORDERED',
  SFA_ALTERNATIVES_SUMMARY_UPDATED: 'SFA_ALTERNATIVES_SUMMARY_UPDATED',
  SFA_ALTERNATIVES_SUMMARY_DELETED: 'SFA_ALTERNATIVES_SUMMARY_DELETED',

  SFA_OUTCOME_SECTION_UPDATED: 'SFA_OUTCOME_SECTION_UPDATED',
  SFA_OUTCOME_CARD_CREATED: 'SFA_OUTCOME_CARD_CREATED',
  SFA_OUTCOME_CARD_UPDATED: 'SFA_OUTCOME_CARD_UPDATED',
  SFA_OUTCOME_CARD_DELETED: 'SFA_OUTCOME_CARD_DELETED',
  SFA_OUTCOME_CARDS_REORDERED: 'SFA_OUTCOME_CARDS_REORDERED',

  FMS_HERO_SLIDE_CREATED: 'FMS_HERO_SLIDE_CREATED',
  FMS_HERO_SLIDE_UPDATED: 'FMS_HERO_SLIDE_UPDATED',
  FMS_HERO_SLIDE_DELETED: 'FMS_HERO_SLIDE_DELETED',
  FMS_HERO_SLIDES_REORDERED: 'FMS_HERO_SLIDES_REORDERED',

  FMS_FAQ_ENTRY_CREATED: 'FMS_FAQ_ENTRY_CREATED',
  FMS_FAQ_ENTRY_UPDATED: 'FMS_FAQ_ENTRY_UPDATED',
  FMS_FAQ_ENTRY_DELETED: 'FMS_FAQ_ENTRY_DELETED',
  FMS_FAQ_ENTRIES_REORDERED: 'FMS_FAQ_ENTRIES_REORDERED',

  FMS_CTA_SECTION_UPDATED: 'FMS_CTA_SECTION_UPDATED',

  FMS_PROOF_LOGO_CREATED: 'FMS_PROOF_LOGO_CREATED',
  FMS_PROOF_LOGO_UPDATED: 'FMS_PROOF_LOGO_UPDATED',
  FMS_PROOF_LOGO_DELETED: 'FMS_PROOF_LOGO_DELETED',
  FMS_PROOF_LOGOS_REORDERED: 'FMS_PROOF_LOGOS_REORDERED',

  FMS_PROOF_STAT_CREATED: 'FMS_PROOF_STAT_CREATED',
  FMS_PROOF_STAT_UPDATED: 'FMS_PROOF_STAT_UPDATED',
  FMS_PROOF_STAT_DELETED: 'FMS_PROOF_STAT_DELETED',
  FMS_PROOF_STATS_REORDERED: 'FMS_PROOF_STATS_REORDERED',

  FMS_FRANCHISE_CATEGORY_CREATED: 'FMS_FRANCHISE_CATEGORY_CREATED',
  FMS_FRANCHISE_CATEGORY_UPDATED: 'FMS_FRANCHISE_CATEGORY_UPDATED',
  FMS_FRANCHISE_CATEGORY_DELETED: 'FMS_FRANCHISE_CATEGORY_DELETED',
  FMS_FRANCHISE_CATEGORIES_REORDERED: 'FMS_FRANCHISE_CATEGORIES_REORDERED',

  FMS_FRANCHISE_STEP_CREATED: 'FMS_FRANCHISE_STEP_CREATED',
  FMS_FRANCHISE_STEP_UPDATED: 'FMS_FRANCHISE_STEP_UPDATED',
  FMS_FRANCHISE_STEP_DELETED: 'FMS_FRANCHISE_STEP_DELETED',
  FMS_FRANCHISE_STEPS_REORDERED: 'FMS_FRANCHISE_STEPS_REORDERED',

  FMS_FRANCHISE_BENEFIT_CREATED: 'FMS_FRANCHISE_BENEFIT_CREATED',
  FMS_FRANCHISE_BENEFIT_UPDATED: 'FMS_FRANCHISE_BENEFIT_UPDATED',
  FMS_FRANCHISE_BENEFIT_DELETED: 'FMS_FRANCHISE_BENEFIT_DELETED',
  FMS_FRANCHISE_BENEFITS_REORDERED: 'FMS_FRANCHISE_BENEFITS_REORDERED',

  FMS_VIDEO_ENTRY_CREATED: 'FMS_VIDEO_ENTRY_CREATED',
  FMS_VIDEO_ENTRY_UPDATED: 'FMS_VIDEO_ENTRY_UPDATED',
  FMS_VIDEO_ENTRY_DELETED: 'FMS_VIDEO_ENTRY_DELETED',
  FMS_VIDEO_ENTRIES_REORDERED: 'FMS_VIDEO_ENTRIES_REORDERED',

  FMS_INTEGRATION_SECTION_UPDATED: 'FMS_INTEGRATION_SECTION_UPDATED',
  FMS_INTEGRATION_LOGO_CREATED: 'FMS_INTEGRATION_LOGO_CREATED',
  FMS_INTEGRATION_LOGO_UPDATED: 'FMS_INTEGRATION_LOGO_UPDATED',
  FMS_INTEGRATION_LOGO_DELETED: 'FMS_INTEGRATION_LOGO_DELETED',
  FMS_INTEGRATION_LOGOS_REORDERED: 'FMS_INTEGRATION_LOGOS_REORDERED',

  FMS_GROWTH_SECTION_UPDATED: 'FMS_GROWTH_SECTION_UPDATED',
  FMS_GROWTH_TIER_CREATED: 'FMS_GROWTH_TIER_CREATED',
  FMS_GROWTH_TIER_UPDATED: 'FMS_GROWTH_TIER_UPDATED',
  FMS_GROWTH_TIER_DELETED: 'FMS_GROWTH_TIER_DELETED',
  FMS_GROWTH_TIERS_REORDERED: 'FMS_GROWTH_TIERS_REORDERED',
  FMS_GROWTH_FEATURE_CREATED: 'FMS_GROWTH_FEATURE_CREATED',
  FMS_GROWTH_FEATURE_UPDATED: 'FMS_GROWTH_FEATURE_UPDATED',
  FMS_GROWTH_FEATURE_DELETED: 'FMS_GROWTH_FEATURE_DELETED',
  FMS_GROWTH_FEATURES_REORDERED: 'FMS_GROWTH_FEATURES_REORDERED',

  FMS_ALTERNATIVES_SECTION_UPDATED: 'FMS_ALTERNATIVES_SECTION_UPDATED',
  FMS_ALTERNATIVES_COLUMN_CREATED: 'FMS_ALTERNATIVES_COLUMN_CREATED',
  FMS_ALTERNATIVES_COLUMN_UPDATED: 'FMS_ALTERNATIVES_COLUMN_UPDATED',
  FMS_ALTERNATIVES_COLUMN_DELETED: 'FMS_ALTERNATIVES_COLUMN_DELETED',
  FMS_ALTERNATIVES_COLUMNS_REORDERED: 'FMS_ALTERNATIVES_COLUMNS_REORDERED',
  FMS_ALTERNATIVES_ROW_CREATED: 'FMS_ALTERNATIVES_ROW_CREATED',
  FMS_ALTERNATIVES_ROW_UPDATED: 'FMS_ALTERNATIVES_ROW_UPDATED',
  FMS_ALTERNATIVES_ROW_DELETED: 'FMS_ALTERNATIVES_ROW_DELETED',
  FMS_ALTERNATIVES_ROWS_REORDERED: 'FMS_ALTERNATIVES_ROWS_REORDERED',

  FMS_OUTCOME_STORY_CREATED: 'FMS_OUTCOME_STORY_CREATED',
  FMS_OUTCOME_STORY_UPDATED: 'FMS_OUTCOME_STORY_UPDATED',
  FMS_OUTCOME_STORY_DELETED: 'FMS_OUTCOME_STORY_DELETED',
  FMS_OUTCOME_STORIES_REORDERED: 'FMS_OUTCOME_STORIES_REORDERED',
  FMS_OUTCOME_STAT_CREATED: 'FMS_OUTCOME_STAT_CREATED',
  FMS_OUTCOME_STAT_UPDATED: 'FMS_OUTCOME_STAT_UPDATED',
  FMS_OUTCOME_STAT_DELETED: 'FMS_OUTCOME_STAT_DELETED',
  FMS_OUTCOME_STATS_REORDERED: 'FMS_OUTCOME_STATS_REORDERED',

  POS_HERO_SLIDE_CREATED: 'POS_HERO_SLIDE_CREATED',
  POS_HERO_SLIDE_UPDATED: 'POS_HERO_SLIDE_UPDATED',
  POS_HERO_SLIDE_DELETED: 'POS_HERO_SLIDE_DELETED',
  POS_HERO_SLIDES_REORDERED: 'POS_HERO_SLIDES_REORDERED',

  POS_FAQ_ENTRY_CREATED: 'POS_FAQ_ENTRY_CREATED',
  POS_FAQ_ENTRY_UPDATED: 'POS_FAQ_ENTRY_UPDATED',
  POS_FAQ_ENTRY_DELETED: 'POS_FAQ_ENTRY_DELETED',
  POS_FAQ_ENTRIES_REORDERED: 'POS_FAQ_ENTRIES_REORDERED',

  POS_CTA_SECTION_UPDATED: 'POS_CTA_SECTION_UPDATED',

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
  // The hero is an auto-rotating carousel - past a dozen slides the later ones
  // are never seen by a real visitor.
  MAX_HERO_SLIDES: 12,
  // One entry contributes at most one logo and one counter, so this caps both
  // lists at once: the marquee loops its set three times and past ~24 a visitor
  // never sees the end of a cycle, which is the tighter of the two limits.
  MAX_TRUST_ENTRIES: 24,
  // The section renders one block at a time, so this caps how many alternates
  // can sit beside the live one rather than how many are shown.
  MAX_INDUSTRIES_ENTRIES: 12,
  // A 3-up grid; past two dozen the section stops reading as a summary of how
  // the company works and starts reading as a directory.
  MAX_VALUES_ENTRIES: 24,
  // Every entry is one logo pinned to the rotating sphere. Past about two
  // dozen the badges overlap at any size the section is actually rendered at,
  // and the farthest-point sampling that spreads them has nowhere left to go.
  MAX_INTEGRATIONS_ENTRIES: 24,
  // The marquee loops its set twice and scrolls for 70 seconds. Past about
  // two dozen a visitor never reaches the end of a cycle, which is the same
  // ceiling the trust marquee runs into.
  MAX_TESTIMONIAL_ENTRIES: 24,
  // An accordion a visitor is expected to scan before buying. Past about two
  // dozen it stops being a list of objections and becomes a manual, which is
  // what the dedicated FAQ page is for.
  MAX_FAQ_ENTRIES: 24,
  // The ERP slider auto-advances every five seconds; past a dozen slides the
  // later ones are never seen by a real visitor, same as the home hero.
  MAX_ERP_HERO_SLIDES: 12,
  MAX_ERP_FAQ_ENTRIES: 24,
  // One entry contributes at most one logo and one counter, so this caps both
  // lists at once - the same ceiling the home page's marquee runs into.
  MAX_ERP_TRUST_ENTRIES: 24,
  // The counter row is a four-up grid. A fifth would wrap onto its own line
  // under three, which reads as a mistake rather than as more proof.
  MAX_ERP_TRUST_STATS: 4,
  // The selector is a single scrolling column beside the panel. Past a dozen
  // it stops being a chooser and starts being a list to read.
  MAX_ERP_INDUSTRIES: 12,
  // The panel lays features out two-up; the shipped set is six.
  MAX_ERP_INDUSTRY_FEATURES: 12,
  // The strip is a four-up grid on desktop, two-up on mobile.
  MAX_ERP_INDUSTRY_BENEFITS: 8,

  /** The left-hand audience list. Five today; past a dozen it stops scanning. */
  MAX_ERP_JOURNEY_PERSONAS: 12,

  /** Per persona, for each of the two lists in its proof panel. */
  MAX_ERP_JOURNEY_OUTCOMES: 10,
  MAX_ERP_JOURNEY_POINTS: 10,

  /**
   * The company-wide figures. Three today, and the row is a four-up grid whose
   * first cell is the persona's own headline metric - so three is what fits.
   */
  MAX_ERP_JOURNEY_STATS: 3,

  /**
   * The comparison grid.
   *
   * Columns are capped low because every one of them narrows the rest: the
   * leader column is 1.5fr and the others share what is left, so past six the
   * cells stop being readable on a laptop.
   */
  MAX_COMPARISON_COLUMNS: 6,
  MAX_COMPARISON_CATEGORIES: 12,
  MAX_COMPARISON_ROWS: 12,

  /**
   * The outcomes carousel. It scrolls, so the cap is about how much proof a
   * visitor will read rather than about what fits on screen.
   */
  MAX_ERP_OUTCOME_CARDS: 12,

  /**
   * The compliance badges beside the sphere.
   *
   * Four, because the panel is a two-by-two grid that has to stay the same
   * height as the sphere next to it - a fifth would push the two columns out
   * of step.
   */
  MAX_ERP_ESTABLISHER_BADGES: 4,

  /** The SFA-DMS page, on the same caps as the ERP page's equivalents. */
  MAX_SFA_HERO_SLIDES: 12,
  MAX_SFA_FAQ_ENTRIES: 24,

  /*
   * The proof section. The marquee scrolls, so it takes as many logos as there
   * are customers to show; the numbers beside it do not - that panel is a
   * two-by-two grid, and a fifth figure would have nowhere to go.
   */
  MAX_SFA_PROOF_LOGOS: 24,
  MAX_SFA_PROOF_STATS: 4,

  /*
   * The video section. One entry is live at a time; the rest are drafts and
   * retired clips kept for reference, which is what the cap is really about.
   */
  MAX_SFA_VIDEO_ENTRIES: 10,

  /*
   * The adoption path. The grid is three across, so three and six are the
   * counts that fill their rows; the cap allows two full rows.
   */
  MAX_SFA_PACKAGE_CARDS: 6,
  MAX_SFA_PACKAGE_FEATURES: 20,

  /*
   * The compliance panel. The badges run down a single column beside the
   * sphere, so the cap is about how tall that column can get before it
   * outruns the panel next to it rather than about a grid.
   */
  MAX_SFA_COMPLIANCE_BADGES: 6,

  /*
   * The outcome stories. A carousel, so the cap is about how far a visitor
   * will reasonably page rather than about what fits on screen.
   */
  MAX_SFA_OUTCOME_CARDS: 12,

  /** The FMS page, on the same caps as the SFA-DMS page's equivalents. */
  MAX_FMS_HERO_SLIDES: 12,
  MAX_FMS_FAQ_ENTRIES: 24,

  /*
   * The proof strip. The brand wall scrolls, so it takes as many marks as
   * there are networks to show; the numbers beside it do not - that panel is
   * a two-by-two grid, and a fifth figure would have nowhere to go.
   */
  MAX_FMS_PROOF_LOGOS: 24,
  MAX_FMS_PROOF_STATS: 4,

  /*
   * The franchise category map. The tabs sit in a four-column grid that wraps
   * to two on a phone, so eight is two full rows - past that the row of tabs
   * stops reading as a choice and starts reading as a menu. The flow is drawn
   * as a single horizontal run with an arrow between each pair, and the strip
   * under it as three columns; both caps are what those layouts hold.
   */
  MAX_FMS_FRANCHISE_CATEGORIES: 8,
  MAX_FMS_FRANCHISE_STEPS: 6,
  MAX_FMS_FRANCHISE_BENEFITS: 6,

  /*
   * The video showcase, on the same cap as the SFA-DMS page's. One entry is
   * live at a time; the rest are drafts and retired clips kept for reference,
   * which is what the cap is really about.
   */
  MAX_FMS_VIDEO_ENTRIES: 10,

  /*
   * The integration sphere. The marks are pinned around a rotating globe, so
   * the cap is about legibility rather than layout - past roughly two dozen
   * they overlap at every rotation and none of them reads.
   */
  MAX_FMS_INTEGRATION_LOGOS: 24,

  /*
   * The growth path. The tiers sit in a three-column grid that the design is
   * built around - a fourth would wrap to its own row and read as an
   * afterthought - so the cap is a little above what ships rather than open.
   * The ticks under each are capped at what fits before the card outgrows its
   * neighbours and the row stops comparing like with like.
   */
  MAX_FMS_GROWTH_TIERS: 4,
  MAX_FMS_GROWTH_FEATURES: 12,

  /*
   * The customer outcomes carousel. The stories rotate on a timer, so the cap
   * is about how long a visitor will wait to come back round rather than about
   * what fits. The figures are not: the card draws them in a three-column grid,
   * and a fourth would wrap to a row of its own and read as an afterthought.
   */
  MAX_FMS_OUTCOME_STORIES: 8,
  MAX_FMS_OUTCOME_STATS: 3,

  /** The POS page, on the same caps as the FMS page's equivalents. */
  MAX_POS_HERO_SLIDES: 12,
  MAX_POS_FAQ_ENTRIES: 24,
} as const;

// ── Publicly served uploads ──────────────────────────────────────────────

/**
 * The entity types whose uploaded images are served to anonymous visitors.
 *
 * Uploads are private by default: the files module requires FILES_READ and
 * hands everything back as an attachment. But an image authored for the
 * marketing home page has to load in an <img> on a site that holds no
 * credentials, so those files opt in - at upload time, by entity type.
 *
 * This is an allowlist rather than "any image by id". An unguessable UUID is
 * not authorisation, and the files table also holds uploads that were never
 * meant to leave the panel.
 */
export const PUBLIC_FILE_ENTITY_TYPES = [
  'home_hero_slide',
  'home_trust_logo',
  'home_industries_video',
  'home_values_card',
  'home_integrations_logo',
  'home_integrations_centre_logo',
  'home_testimonial_poster',
  'home_testimonial_video',
  'home_cta_image',
  'home_cta_report',
  'erp_hero_slide',
  'erp_cta_image',
  'erp_trust_logo',
  'erp_industry_image',
  'erp_industry_dashboard',
  'erp_journey_avatar',
  'sfa_hero_slide',
  'sfa_cta_image',
  'sfa_cta_dashboard',
  'sfa_proof_logo',
  'sfa_compliance_background',
  'sfa_outcome_photo',
  'fms_hero_slide',
  'fms_cta_image',
  'fms_proof_logo',
  'fms_franchise_icon',
  'fms_franchise_photo',
  'fms_video',
  'fms_outcome_logo',
  'fms_outcome_photo',
  'pos_hero_slide',
  'pos_cta_image',
  'fms_integration_logo',
  'fms_integration_centre_logo',
  'sfa_video',
  'comparison_column_logo',
  'erp_outcome_image',
] as const;

export type PublicFileEntityType = (typeof PUBLIC_FILE_ENTITY_TYPES)[number];

/**
 * The media types the public route will serve to anonymous visitors.
 *
 * Prefixes rather than exact types, so adding a codec to the upload allowlist
 * does not also mean remembering to add it here. Everything else an admin can
 * upload - spreadsheets, CSVs, documents - stays behind authentication even
 * when it carries a public entity type.
 *
 * PDF is the one exact type on the list rather than a prefix: the home page's
 * report download hands a visitor a PDF, and no other application/* type
 * should come with it.
 */
export const PUBLIC_FILE_MIME_PREFIXES = ['image/', 'video/', 'application/pdf'] as const;

export const isPubliclyServableMimeType = (mimeType: string): boolean =>
  PUBLIC_FILE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));

export const isPubliclyServableEntityType = (
  entityType: string | null,
): entityType is PublicFileEntityType =>
  entityType !== null &&
  (PUBLIC_FILE_ENTITY_TYPES as readonly string[]).includes(entityType);

// ── Page section copy ────────────────────────────────────────────────────

/**
 * The pages the CMS authors, and the sections each one shares copy across.
 *
 * Copy - an eyebrow, a heading and a subtext - is stored once per section
 * rather than repeated on every entry, keyed by the page and section together.
 * The pair is what is unique: the ERP page has a 'faq' and so does the home
 * page, and they are different content.
 *
 * Mirrored by CHECK constraints on page_section_copy, so a key here always
 * exists in the database and a key checked in code always exists here.
 *
 * The home page's hero is deliberately absent: its slides each carry their own
 * eyebrow, heading and subtext, because the carousel shows four different
 * pitches. The ERP page's hero is listed because its slider shares one.
 */
export const PAGE_SECTION_KEYS = {
  home: ['trust', 'industries', 'values', 'integrations', 'testimonials', 'faq', 'cta'],
  erp: [
    'trust',
    'recognition',
    'benefits',
    'alternatives',
    'outcomes',
    'establishers',
    'faq',
    'cta',
  ],
  /*
   * The hero is absent on purpose, here as on the other pages: its slides each
   * carry their own eyebrow, headline and subhead, because the slider shows
   * five different pitches rather than one.
   */
  'sfa-dms': [
    'proof',
    'video',
    'packages',
    'alternatives',
    'outcomes',
    'establishers',
    'faq',
    'cta',
  ],
  /*
   * The hero is absent on purpose, here as on the other pages: its slides each
   * carry their own eyebrow, headline and subhead.
   */
  fms: [
    'proof',
    'recognition',
    'video',
    'integrations',
    'packages',
    'alternatives',
    'outcomes',
    'faq',
    'cta',
  ],
  /*
   * The hero is absent on purpose, here as on the other pages: its slides each
   * carry their own eyebrow, headline and subhead.
   */
  pos: ['faq', 'cta'],
} as const;

export const PAGE_KEYS = Object.keys(PAGE_SECTION_KEYS) as Array<keyof typeof PAGE_SECTION_KEYS>;

export type PageKey = (typeof PAGE_KEYS)[number];

/** Every section key any page uses, for the one CHECK the table carries. */
export type SectionKey = (typeof PAGE_SECTION_KEYS)[PageKey][number];

export const isSectionOfPage = (pageKey: string, sectionKey: string): boolean =>
  (PAGE_KEYS as readonly string[]).includes(pageKey) &&
  (PAGE_SECTION_KEYS[pageKey as PageKey] as readonly string[]).includes(sectionKey);

