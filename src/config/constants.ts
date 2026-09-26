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

/**
 * How a vacancy is worked, as the Careers page prints it.
 *
 * A closed list rather than free text because the public card renders it as a
 * chip beside the location and the admin table filters on it - two roles typed
 * as 'Hybrid' and 'hybrid ' would be two chips and two filter values. The four
 * entries are the ones the page already uses: the roles hardcoded there today
 * read 'Nashik · On-site', 'Nashik · Hybrid' and 'Pan-India · Field', and
 * Remote is the obvious fourth a recruiter reaches for next.
 *
 * Mirrored by career_vacancies_work_mode_check.
 */
export const WORK_MODES = ['On-site', 'Hybrid', 'Remote', 'Field'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

/**
 * Where a submitted application has got to.
 *
 * The one status in this CMS that is not ACTIVE/INACTIVE, because it is not a
 * publish state - nothing a candidate sees changes with it. It is the
 * recruiter's own triage column, and these five are the whole funnel: it
 * arrived, somebody is reading it, it is worth a conversation, and the two
 * ways it ends.
 *
 * Mirrored by career_applications_status_check.
 */
export const APPLICATION_STATUSES = [
  'NEW',
  'IN_REVIEW',
  'SHORTLISTED',
  'REJECTED',
  'HIRED',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

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

  // The Insider (newsletter) page, on the same module-wide pattern: its hero,
  // issues, stories, and feature section all share these four.
  INSIDER_PAGE_READ: 'insider_page.read',
  INSIDER_PAGE_CREATE: 'insider_page.create',
  INSIDER_PAGE_UPDATE: 'insider_page.update',
  INSIDER_PAGE_DELETE: 'insider_page.delete',

  // The Contact page, module-wide like the two above. Only two keys, not four:
  // every section is a singleton that its own first save creates and every
  // later save replaces, so there is nothing for a create or a delete
  // permission to guard.
  CONTACT_PAGE_READ: 'contact_page.read',
  CONTACT_PAGE_UPDATE: 'contact_page.update',

  // The enquiries that page's form produces. Deliberately NOT folded into
  // contact_page.*: those two keys govern the page's copy, these govern
  // strangers' names, work addresses and phone numbers. Someone trusted to
  // reword a heading is not automatically someone who should read the inbox.
  // No create key - the only writer is an anonymous visitor - and no update
  // key, because an enquiry is a record of what was sent, not a draft.
  CONTACT_ENQUIRIES_READ: 'contact_enquiries.read',
  CONTACT_ENQUIRIES_DELETE: 'contact_enquiries.delete',

  // The vacancies the Careers page lists. Four keys, like the home and Insider
  // pages, because a vacancy is a row that is created, edited, published and
  // deleted rather than a singleton section.
  CAREERS_READ: 'careers.read',
  CAREERS_CREATE: 'careers.create',
  CAREERS_UPDATE: 'careers.update',
  CAREERS_DELETE: 'careers.delete',

  // The applications those vacancies collect. Split from careers.* for the
  // same reason contact_enquiries.* is split from contact_page.*: those four
  // keys govern job adverts, these govern real candidates' names, phone
  // numbers and CVs. Someone trusted to post a role is not automatically
  // someone who should read everyone who applied for it.
  //
  // No create key - the only writer is an anonymous applicant - and no delete
  // key, because nobody asked for one and an application nobody can delete is
  // the safer default to start from. The update key covers exactly one thing:
  // moving an application along the funnel.
  CAREER_APPLICATIONS_READ: 'career_applications.read',
  CAREER_APPLICATIONS_UPDATE: 'career_applications.update',

  // The Partner Program page. Two keys, like contact_page.*: the only authored
  // thing on that page is its hero, a singleton that its own first save creates
  // and every later save replaces, so there is nothing for a create or a delete
  // permission to guard.
  PARTNER_PROGRAM_READ: 'partner_program.read',
  PARTNER_PROGRAM_UPDATE: 'partner_program.update',

  // The applications that page's form produces. Split from partner_program.*
  // for the same reason contact_enquiries.* is split from contact_page.* and
  // career_applications.* from careers.*: those two keys govern a headline,
  // these govern named strangers' mobile numbers and work addresses. Someone
  // trusted to reword the hero is not automatically someone who should read
  // everyone who applied.
  //
  // No create key - the only writer is an anonymous applicant - and no update
  // key, because an application is a record of what was sent, not a draft. A
  // delete key, unlike career_applications.*, because this is an inbox and spam
  // arrives in inboxes: the Contact one was given exactly the same way out.
  PARTNER_APPLICATIONS_READ: 'partner_applications.read',
  PARTNER_APPLICATIONS_DELETE: 'partner_applications.delete',

  // The About page. Two keys, like contact_page.* and partner_program.*, even
  // though two of its five sections carry ordered child rows that are created
  // and deleted.
  //
  // Those rows are not a list of their own the way career_vacancies is - a
  // vacancy is an object the business has opinions about, posted and taken down
  // on its own schedule. A person on the team grid and a stat card are parts of
  // their section: whoever opens the People tab to reword its headline is the
  // same person who adds the new hire two lines below it, in the same sitting.
  // contact_details_section's offices are the precedent - an ordered list of
  // entries added and removed under contact_page.update - and they live in
  // jsonb only because they need no status and no order of their own. Splitting
  // create and delete out here would produce a role that may rewrite the People
  // section but not add a person to it, which is not a distinction anybody
  // asked for.
  ABOUT_PAGE_READ: 'about_page.read',
  ABOUT_PAGE_UPDATE: 'about_page.update',

  // The discovery calls that page's form produces. Split from about_page.* for
  // the same reason contact_enquiries.* is split from contact_page.*: those two
  // keys govern a headline, these govern named strangers' mobile numbers.
  // Someone trusted to reword the founder's note is not automatically someone
  // who should read everyone who asked for a call.
  //
  // No create key - the only writer is an anonymous visitor - and no update
  // key, because a booking is a record of what was sent, not a draft. A delete
  // key, because this is an inbox and spam arrives in inboxes: the Contact and
  // Partner Program inboxes were given exactly the same way out.
  DISCOVERY_CALLS_READ: 'discovery_calls.read',
  DISCOVERY_CALLS_DELETE: 'discovery_calls.delete',
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

  'insider_page.read': 'View Insider page content: hero, issues, stories, and feature',
  'insider_page.create': 'Create Insider hero slides, issues, and stories',
  'insider_page.update': 'Update, reorder, and publish Insider page content',
  'insider_page.delete': 'Delete Insider hero slides, issues, and stories',

  'contact_page.read': 'View Contact page content: hero, enquiry form, and contact details',
  'contact_page.update': 'Update and publish Contact page section content',

  'contact_enquiries.read': 'View enquiries submitted through the Contact page form',
  'contact_enquiries.delete': 'Delete submitted Contact page enquiries',

  'careers.read': 'View vacancies listed on the Careers page',
  'careers.create': 'Create Careers page vacancies',
  'careers.update': 'Update, reorder, and publish Careers page vacancies',
  'careers.delete': 'Delete Careers page vacancies',

  'career_applications.read':
    'View applications submitted through the Careers page, and download their resumes',
  'career_applications.update': 'Change the status of a submitted job application',

  'partner_program.read': 'View Partner Program page content: the page hero',
  'partner_program.update': 'Update and publish Partner Program page section content',

  'partner_applications.read':
    'View applications submitted through the Partner Program page form',
  'partner_applications.delete': 'Delete submitted Partner Program applications',

  'about_page.read':
    'View About page content: hero, founder note, people, numbers, and closing CTA',
  'about_page.update':
    'Update and publish About page section content, including its people and stat cards',

  'discovery_calls.read': 'View discovery calls booked through the About page form',
  'discovery_calls.delete': 'Delete booked discovery calls',
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

  INSIDER_HERO_SLIDE_CREATED: 'INSIDER_HERO_SLIDE_CREATED',
  INSIDER_HERO_SLIDE_UPDATED: 'INSIDER_HERO_SLIDE_UPDATED',
  INSIDER_HERO_SLIDE_STATUS_CHANGED: 'INSIDER_HERO_SLIDE_STATUS_CHANGED',
  INSIDER_HERO_SLIDES_REORDERED: 'INSIDER_HERO_SLIDES_REORDERED',
  INSIDER_HERO_SLIDE_DELETED: 'INSIDER_HERO_SLIDE_DELETED',

  INSIDER_ISSUE_CREATED: 'INSIDER_ISSUE_CREATED',
  INSIDER_ISSUE_UPDATED: 'INSIDER_ISSUE_UPDATED',
  INSIDER_ISSUE_STATUS_CHANGED: 'INSIDER_ISSUE_STATUS_CHANGED',
  INSIDER_ISSUE_SET_CURRENT: 'INSIDER_ISSUE_SET_CURRENT',
  INSIDER_ISSUE_DELETED: 'INSIDER_ISSUE_DELETED',

  INSIDER_STORY_CREATED: 'INSIDER_STORY_CREATED',
  INSIDER_STORY_UPDATED: 'INSIDER_STORY_UPDATED',
  INSIDER_STORY_STATUS_CHANGED: 'INSIDER_STORY_STATUS_CHANGED',
  INSIDER_STORIES_REORDERED: 'INSIDER_STORIES_REORDERED',
  INSIDER_STORY_DELETED: 'INSIDER_STORY_DELETED',

  INSIDER_FEATURE_SECTION_UPDATED: 'INSIDER_FEATURE_SECTION_UPDATED',

  // Contact page. One action per section: each is a singleton whose only write
  // is a full replace, so there is no create / delete / reorder to record.
  CONTACT_HERO_UPDATED: 'CONTACT_HERO_UPDATED',
  CONTACT_FORM_UPDATED: 'CONTACT_FORM_UPDATED',
  CONTACT_DETAILS_UPDATED: 'CONTACT_DETAILS_UPDATED',

  // The enquiry inbox. One action, because deleting is the only thing an
  // administrator does to an enquiry: a submission has no admin actor to
  // attribute, and reading one is not an event worth burying the trail under.
  CONTACT_ENQUIRY_DELETED: 'CONTACT_ENQUIRY_DELETED',

  // Careers: the vacancy list, on the same pattern as every other ordered CMS
  // row set.
  CAREER_VACANCY_CREATED: 'CAREER_VACANCY_CREATED',
  CAREER_VACANCY_UPDATED: 'CAREER_VACANCY_UPDATED',
  CAREER_VACANCY_STATUS_CHANGED: 'CAREER_VACANCY_STATUS_CHANGED',
  CAREER_VACANCIES_REORDERED: 'CAREER_VACANCIES_REORDERED',
  CAREER_VACANCY_DELETED: 'CAREER_VACANCY_DELETED',

  /*
   * The application inbox. Two actions, and neither is a read of the list -
   * an inbox that wrote a row every time somebody scrolled it would bury the
   * entries that matter, and who may see the list is decided by
   * career_applications.read.
   *
   * The resume download IS recorded, unlike every other read in this API.
   * Opening somebody's CV is not scrolling a list: it is one identifiable
   * person's document leaving the panel, and "who downloaded it, and when" is
   * the question that gets asked afterwards. There is no matching
   * CAREER_APPLICATION_VIEWED, because the detail read is the inbox and
   * recording it would make the download entries impossible to find.
   */
  CAREER_APPLICATION_STATUS_CHANGED: 'CAREER_APPLICATION_STATUS_CHANGED',
  CAREER_RESUME_DOWNLOADED: 'CAREER_RESUME_DOWNLOADED',

  // The Partner Program page's hero. One action, because it is a singleton
  // whose only write is a full replace - no create, no delete, no reorder.
  PARTNER_HERO_UPDATED: 'PARTNER_HERO_UPDATED',

  // Its application list. One action, for the reason CONTACT_ENQUIRY_DELETED is
  // the only one on that inbox: deleting is the only thing an administrator
  // does to an application, a submission has no admin actor to attribute, and
  // reading one is not an event worth burying the trail under.
  PARTNER_APPLICATION_DELETED: 'PARTNER_APPLICATION_DELETED',

  /*
   * The About page. One action per section, because each of the five is a
   * singleton whose only write is a full replace - no create, no delete, no
   * reorder - and five actions rather than one ABOUT_SECTION_UPDATED because
   * the audit trail's job is to say WHICH band of the page changed without
   * anybody having to read the diff.
   */
  ABOUT_HERO_UPDATED: 'ABOUT_HERO_UPDATED',
  ABOUT_FOUNDER_NOTE_UPDATED: 'ABOUT_FOUNDER_NOTE_UPDATED',
  ABOUT_TEAM_SECTION_UPDATED: 'ABOUT_TEAM_SECTION_UPDATED',
  ABOUT_NUMBERS_SECTION_UPDATED: 'ABOUT_NUMBERS_SECTION_UPDATED',
  ABOUT_CTA_UPDATED: 'ABOUT_CTA_UPDATED',

  // Its two ordered child lists, on the same pattern as every other ordered
  // CMS row set in this API.
  ABOUT_TEAM_MEMBER_CREATED: 'ABOUT_TEAM_MEMBER_CREATED',
  ABOUT_TEAM_MEMBER_UPDATED: 'ABOUT_TEAM_MEMBER_UPDATED',
  ABOUT_TEAM_MEMBER_STATUS_CHANGED: 'ABOUT_TEAM_MEMBER_STATUS_CHANGED',
  ABOUT_TEAM_MEMBERS_REORDERED: 'ABOUT_TEAM_MEMBERS_REORDERED',
  ABOUT_TEAM_MEMBER_DELETED: 'ABOUT_TEAM_MEMBER_DELETED',

  ABOUT_NUMBER_STAT_CREATED: 'ABOUT_NUMBER_STAT_CREATED',
  ABOUT_NUMBER_STAT_UPDATED: 'ABOUT_NUMBER_STAT_UPDATED',
  ABOUT_NUMBER_STAT_STATUS_CHANGED: 'ABOUT_NUMBER_STAT_STATUS_CHANGED',
  ABOUT_NUMBER_STATS_REORDERED: 'ABOUT_NUMBER_STATS_REORDERED',
  ABOUT_NUMBER_STAT_DELETED: 'ABOUT_NUMBER_STAT_DELETED',

  // The discovery call inbox. One action, for the reason
  // CONTACT_ENQUIRY_DELETED and PARTNER_APPLICATION_DELETED are the only ones
  // on those inboxes: deleting is the only thing an administrator does to a
  // booking, a submission has no admin actor to attribute, and reading one is
  // not an event worth burying the trail under.
  ABOUT_DISCOVERY_CALL_DELETED: 'ABOUT_DISCOVERY_CALL_DELETED',

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
  // The Insider hero is the same auto-rotating slider, so the same reasoning.
  MAX_INSIDER_HERO_SLIDES: 12,
  // An issue is a monthly digest laid out in rows of three; past a dozen
  // stories it stops being a digest and the reorder list stops being usable.
  MAX_INSIDER_STORIES_PER_ISSUE: 12,

  // The Contact enquiry form's three choice lists. These render as chips and
  // button grids the visitor scans before picking one, so the ceilings are the
  // point at which scanning stops working, not a storage limit.
  MAX_CONTACT_BUSINESS_TYPES: 12,
  MAX_CONTACT_REVENUE_RANGES: 8,
  MAX_CONTACT_PLATFORMS: 12,
  // The "Where we are" card is a short list beside the form, not a directory.
  MAX_CONTACT_OFFICES: 6,

  // A vacancy's two bullet lists, as they render in the details popup. Past
  // this many bullets a candidate stops reading them and the popup stops
  // fitting on a phone, which is the real ceiling - not storage.
  MAX_VACANCY_REQUIREMENTS: 20,
  MAX_VACANCY_SKILLS: 20,
  // The Open Roles list is one scannable table on the Careers page. A company
  // of thirty people hiring for more than this many roles at once has a
  // different problem than a display_order.
  MAX_VACANCIES: 60,

  // The About hero's rotating backdrops. The slider holds each one for five
  // seconds, so six is half a minute of photographs before the first one comes
  // round again - past that nobody on the page ever sees the last of them. The
  // page ships three today.
  MAX_ABOUT_HERO_BACKDROPS: 6,
  // The people grid is three cards wide. Twelve is four full rows, which is
  // where a "senior leads" grid stops being one and the reorder list stops
  // being usable.
  MAX_ABOUT_TEAM_MEMBERS: 12,
  // The stat cards render four to a row. Eight is two tidy rows; a third row
  // of numbers is a table, and nobody counts past it.
  MAX_ABOUT_NUMBER_STATS: 8,
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
 *
 * One entry per CMS image slot: the home hero, the Insider page's hero, story
 * cards and long-form feature, the Contact page's hero, the Partner Program
 * page's hero backdrop, and the About page's four - its rotating hero
 * backdrops, the founder's portrait, the team headshots and the closing CTA
 * banner.
 *
 * One entry per section rather than per viewport: a section's desktop and
 * mobile crops are the same slot authored twice, and splitting them would only
 * mean two allowlist entries that are always granted together.
 *
 * 'career_resume' IS DELIBERATELY NOT HERE, and must never be added. A resume
 * is a named stranger's home address, phone number and employment history,
 * uploaded by an anonymous visitor who was promised it went to a recruiter -
 * not to anyone who can put a UUID in a URL. It is served by exactly one
 * route, GET /careers/applications/:id/resume, behind authentication and
 * career_applications.read, as an attachment, and every download is audited.
 * Adding the entity type here would hand that document to the open internet
 * with one line and no other change anywhere.
 */
export const PUBLIC_FILE_ENTITY_TYPES = [
  'home_hero_slide',
  'insider_hero_slide',
  'insider_story',
  'insider_feature',
  'contact_hero',
  'partner_program_hero',
  'about_hero',
  'about_founder',
  'about_team_member',
  'about_cta',
] as const;

export type PublicFileEntityType = (typeof PUBLIC_FILE_ENTITY_TYPES)[number];

export const isPubliclyServableEntityType = (
  entityType: string | null,
): entityType is PublicFileEntityType =>
  entityType !== null &&
  (PUBLIC_FILE_ENTITY_TYPES as readonly string[]).includes(entityType);

/**
 * Uploads the GENERIC files routes must not touch, because another module owns
 * them and enforces its own rules about who may read one and what that read
 * costs.
 *
 * Keeping 'career_resume' off PUBLIC_FILE_ENTITY_TYPES above closes the
 * anonymous door only. Every resume is still a row in the shared `files` table,
 * and GET /files, GET /files/:id/download and DELETE /files/:id ask for
 * files.read and files.delete - not career_applications.read - and write no
 * CAREER_RESUME_DOWNLOADED audit entry. files.read and files.upload are exactly
 * what a content-editor role needs for the CMS image slots, so in any realistic
 * non-admin role that door stands open: the editor filters the list by
 * entityType 'career_resume', reads back every candidate's file id and original
 * filename, and downloads the lot with nothing in audit_logs to show for it.
 * files.delete destroys a CV outright, and because the files row is only
 * soft-deleted the FK's ON DELETE SET NULL never fires - the application simply
 * renders with no resume, and nothing ties the loss back here.
 *
 * So the files module refuses these outright: a 404 rather than a 403, so a
 * files.read holder cannot even confirm an id exists, and they are dropped from
 * the list and from its entityType filter. A resume stays reachable through
 * exactly one route, GET /careers/applications/:id/resume, which reads it via
 * careers' readResume() straight from the repository and is unaffected by this.
 */
export const MANAGED_FILE_ENTITY_TYPES = ['career_resume'] as const;

export const isModuleOwnedEntityType = (entityType: string | null): boolean =>
  entityType !== null &&
  (MANAGED_FILE_ENTITY_TYPES as readonly string[]).includes(entityType);
