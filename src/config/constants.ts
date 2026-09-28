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

/**
 * What one of the footer's contact lines IS, which decides how the site links
 * it: an ADDRESS is plain text, an EMAIL becomes a mailto:, a PHONE a tel:
 * with everything but the digits and a leading + stripped, and a WEBSITE an
 * https:// link (the scheme added when the line is written as a bare host).
 *
 * A closed list rather than inferring the kind from the text, because the text
 * alone cannot say it - '+91 93568 98277' is a phone number, but so is nothing
 * about a line that reads 'Sales: 1800-123-4567' - and a guess that turned an
 * address into a dead tel: link would ship silently. It is also what the
 * validator keys its per-kind rule on, so the value an admin types is checked
 * against the link it will become.
 *
 * The four are exactly the four lines the footer renders today. Several rows of
 * one kind are allowed (two phone numbers is an ordinary footer), so this is a
 * type, not a slot.
 *
 * Mirrored by social_contact_lines_kind_check.
 */
export const SOCIAL_CONTACT_LINE_KINDS = ['ADDRESS', 'EMAIL', 'PHONE', 'WEBSITE'] as const;
export type SocialContactLineKind = (typeof SOCIAL_CONTACT_LINE_KINDS)[number];

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

  // The site footer's contact lines and social icons. Two keys, like
  // about_page.*, even though both halves are ordered lists whose rows are
  // created and deleted - and for the same reason: a contact line or a social
  // icon is not an object anybody posts and retires on its own schedule, it is
  // one entry in the "how to reach us" block, and whoever may change the phone
  // number printed there is the same person who adds the second one below it.
  // Splitting create and delete out would produce a role that may reword the
  // footer's address but not add a line to it, which nobody asked for.
  //
  // Its own module rather than a section of the Contact page's keys: the
  // footer is on every page of the site, not on /contact, and the admin panel
  // gives it its own sidebar item. contact_page.* governs one page's copy.
  SOCIAL_MEDIA_LINKS_READ: 'social_media_links.read',
  SOCIAL_MEDIA_LINKS_UPDATE: 'social_media_links.update',

  // The Blog, under the admin panel's "Resource Page" sidebar parent: the
  // /blog hero, the "Insights by Topic" intro, the topic categories and the
  // posts themselves. Two keys, like about_page.* and social_media_links.*,
  // even though categories and posts are rows that are created and deleted.
  //
  // The question the insider_page.* split answers - "may this person retire
  // content, or only reword it?" - does not come up here the way it does for
  // a monthly issue. A blog is one editorial desk: whoever may rewrite a
  // post's lead is the person who decides it goes out, and whoever renames a
  // topic is the one who adds the next. A role that may edit a post but not
  // publish or delete one is a review workflow, and that is a feature of its
  // own (drafts, approvers), not a permission split. The two destructive
  // edges are guarded by the data instead: a category that still holds posts
  // cannot be deleted (BLOG_CATEGORY_IN_USE), and unpublishing is always
  // available as the reversible alternative to deleting.
  //
  // Its own module rather than a section of home_page.*: the blog is its own
  // page with its own sidebar item, and granting it must not also grant the
  // home page.
  BLOG_READ: 'blog.read',
  BLOG_UPDATE: 'blog.update',
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

  'social_media_links.read': "View the site footer's contact lines and social media links",
  'social_media_links.update':
    "Update, reorder and publish the site footer's contact lines and social media links",

  'blog.read': 'View Blog page content: the hero, the topics intro, categories, and posts',
  'blog.update':
    'Create, update, reorder, publish and delete Blog page content, including its categories and posts',
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

  POS_PROOF_LOGO_CREATED: 'POS_PROOF_LOGO_CREATED',
  POS_PROOF_LOGO_UPDATED: 'POS_PROOF_LOGO_UPDATED',
  POS_PROOF_LOGO_DELETED: 'POS_PROOF_LOGO_DELETED',
  POS_PROOF_LOGOS_REORDERED: 'POS_PROOF_LOGOS_REORDERED',

  POS_PROOF_STAT_CREATED: 'POS_PROOF_STAT_CREATED',
  POS_PROOF_STAT_UPDATED: 'POS_PROOF_STAT_UPDATED',
  POS_PROOF_STAT_DELETED: 'POS_PROOF_STAT_DELETED',
  POS_PROOF_STATS_REORDERED: 'POS_PROOF_STATS_REORDERED',

  POS_RECOGNITION_CATEGORY_CREATED: 'POS_RECOGNITION_CATEGORY_CREATED',
  POS_RECOGNITION_CATEGORY_UPDATED: 'POS_RECOGNITION_CATEGORY_UPDATED',
  POS_RECOGNITION_CATEGORY_DELETED: 'POS_RECOGNITION_CATEGORY_DELETED',
  POS_RECOGNITION_CATEGORIES_REORDERED: 'POS_RECOGNITION_CATEGORIES_REORDERED',

  POS_VIDEO_ENTRY_CREATED: 'POS_VIDEO_ENTRY_CREATED',
  POS_VIDEO_ENTRY_UPDATED: 'POS_VIDEO_ENTRY_UPDATED',
  POS_VIDEO_ENTRY_DELETED: 'POS_VIDEO_ENTRY_DELETED',
  POS_VIDEO_ENTRIES_REORDERED: 'POS_VIDEO_ENTRIES_REORDERED',

  POS_GROWTH_SECTION_UPDATED: 'POS_GROWTH_SECTION_UPDATED',
  POS_GROWTH_TIER_CREATED: 'POS_GROWTH_TIER_CREATED',
  POS_GROWTH_TIER_UPDATED: 'POS_GROWTH_TIER_UPDATED',
  POS_GROWTH_TIER_DELETED: 'POS_GROWTH_TIER_DELETED',
  POS_GROWTH_TIERS_REORDERED: 'POS_GROWTH_TIERS_REORDERED',
  POS_GROWTH_FEATURE_CREATED: 'POS_GROWTH_FEATURE_CREATED',
  POS_GROWTH_FEATURE_UPDATED: 'POS_GROWTH_FEATURE_UPDATED',
  POS_GROWTH_FEATURE_DELETED: 'POS_GROWTH_FEATURE_DELETED',
  POS_GROWTH_FEATURES_REORDERED: 'POS_GROWTH_FEATURES_REORDERED',

  POS_SECURITY_SECTION_UPDATED: 'POS_SECURITY_SECTION_UPDATED',
  POS_SECURITY_BADGE_CREATED: 'POS_SECURITY_BADGE_CREATED',
  POS_SECURITY_BADGE_UPDATED: 'POS_SECURITY_BADGE_UPDATED',
  POS_SECURITY_BADGE_DELETED: 'POS_SECURITY_BADGE_DELETED',
  POS_SECURITY_BADGES_REORDERED: 'POS_SECURITY_BADGES_REORDERED',
  POS_SECURITY_LOGO_CREATED: 'POS_SECURITY_LOGO_CREATED',
  POS_SECURITY_LOGO_UPDATED: 'POS_SECURITY_LOGO_UPDATED',
  POS_SECURITY_LOGO_DELETED: 'POS_SECURITY_LOGO_DELETED',
  POS_SECURITY_LOGOS_REORDERED: 'POS_SECURITY_LOGOS_REORDERED',
  POS_SECURITY_ASSURANCE_CREATED: 'POS_SECURITY_ASSURANCE_CREATED',
  POS_SECURITY_ASSURANCE_UPDATED: 'POS_SECURITY_ASSURANCE_UPDATED',
  POS_SECURITY_ASSURANCE_DELETED: 'POS_SECURITY_ASSURANCE_DELETED',
  POS_SECURITY_ASSURANCES_REORDERED: 'POS_SECURITY_ASSURANCES_REORDERED',

  POS_ALTERNATIVES_SECTION_UPDATED: 'POS_ALTERNATIVES_SECTION_UPDATED',
  POS_ALTERNATIVES_COLUMN_CREATED: 'POS_ALTERNATIVES_COLUMN_CREATED',
  POS_ALTERNATIVES_COLUMN_UPDATED: 'POS_ALTERNATIVES_COLUMN_UPDATED',
  POS_ALTERNATIVES_COLUMN_DELETED: 'POS_ALTERNATIVES_COLUMN_DELETED',
  POS_ALTERNATIVES_COLUMNS_REORDERED: 'POS_ALTERNATIVES_COLUMNS_REORDERED',
  POS_ALTERNATIVES_ROW_CREATED: 'POS_ALTERNATIVES_ROW_CREATED',
  POS_ALTERNATIVES_ROW_UPDATED: 'POS_ALTERNATIVES_ROW_UPDATED',
  POS_ALTERNATIVES_ROW_DELETED: 'POS_ALTERNATIVES_ROW_DELETED',
  POS_ALTERNATIVES_ROWS_REORDERED: 'POS_ALTERNATIVES_ROWS_REORDERED',

  POS_OUTCOME_STORY_CREATED: 'POS_OUTCOME_STORY_CREATED',
  POS_OUTCOME_STORY_UPDATED: 'POS_OUTCOME_STORY_UPDATED',
  POS_OUTCOME_STORY_DELETED: 'POS_OUTCOME_STORY_DELETED',
  POS_OUTCOME_STORIES_REORDERED: 'POS_OUTCOME_STORIES_REORDERED',

  HREASY_HERO_SLIDE_CREATED: 'HREASY_HERO_SLIDE_CREATED',
  HREASY_HERO_SLIDE_UPDATED: 'HREASY_HERO_SLIDE_UPDATED',
  HREASY_HERO_SLIDE_DELETED: 'HREASY_HERO_SLIDE_DELETED',
  HREASY_HERO_SLIDES_REORDERED: 'HREASY_HERO_SLIDES_REORDERED',

  HREASY_FAQ_ENTRY_CREATED: 'HREASY_FAQ_ENTRY_CREATED',
  HREASY_FAQ_ENTRY_UPDATED: 'HREASY_FAQ_ENTRY_UPDATED',
  HREASY_FAQ_ENTRY_DELETED: 'HREASY_FAQ_ENTRY_DELETED',
  HREASY_FAQ_ENTRIES_REORDERED: 'HREASY_FAQ_ENTRIES_REORDERED',

  HREASY_CTA_SECTION_UPDATED: 'HREASY_CTA_SECTION_UPDATED',
  HREASY_CTA_TRUST_ITEM_CREATED: 'HREASY_CTA_TRUST_ITEM_CREATED',
  HREASY_CTA_TRUST_ITEM_UPDATED: 'HREASY_CTA_TRUST_ITEM_UPDATED',
  HREASY_CTA_TRUST_ITEM_DELETED: 'HREASY_CTA_TRUST_ITEM_DELETED',
  HREASY_CTA_TRUST_ITEMS_REORDERED: 'HREASY_CTA_TRUST_ITEMS_REORDERED',

  HREASY_PROOF_TILE_CREATED: 'HREASY_PROOF_TILE_CREATED',
  HREASY_PROOF_TILE_UPDATED: 'HREASY_PROOF_TILE_UPDATED',
  HREASY_PROOF_TILE_DELETED: 'HREASY_PROOF_TILE_DELETED',
  HREASY_PROOF_CELL_CREATED: 'HREASY_PROOF_CELL_CREATED',
  HREASY_PROOF_CELL_UPDATED: 'HREASY_PROOF_CELL_UPDATED',
  HREASY_PROOF_CELL_DELETED: 'HREASY_PROOF_CELL_DELETED',
  HREASY_PROOF_CELLS_REORDERED: 'HREASY_PROOF_CELLS_REORDERED',

  HREASY_CAPABILITY_MODULE_CREATED: 'HREASY_CAPABILITY_MODULE_CREATED',
  HREASY_CAPABILITY_MODULE_UPDATED: 'HREASY_CAPABILITY_MODULE_UPDATED',
  HREASY_CAPABILITY_MODULE_DELETED: 'HREASY_CAPABILITY_MODULE_DELETED',
  HREASY_CAPABILITY_MODULES_REORDERED: 'HREASY_CAPABILITY_MODULES_REORDERED',

  HREASY_LIFECYCLE_CARD_CREATED: 'HREASY_LIFECYCLE_CARD_CREATED',
  HREASY_LIFECYCLE_CARD_UPDATED: 'HREASY_LIFECYCLE_CARD_UPDATED',
  HREASY_LIFECYCLE_CARD_DELETED: 'HREASY_LIFECYCLE_CARD_DELETED',
  HREASY_LIFECYCLE_CARDS_REORDERED: 'HREASY_LIFECYCLE_CARDS_REORDERED',

  HREASY_PACKAGE_TIER_CREATED: 'HREASY_PACKAGE_TIER_CREATED',
  HREASY_PACKAGE_TIER_UPDATED: 'HREASY_PACKAGE_TIER_UPDATED',
  HREASY_PACKAGE_TIER_DELETED: 'HREASY_PACKAGE_TIER_DELETED',
  HREASY_PACKAGE_TIERS_REORDERED: 'HREASY_PACKAGE_TIERS_REORDERED',
  HREASY_PACKAGE_FEATURE_CREATED: 'HREASY_PACKAGE_FEATURE_CREATED',
  HREASY_PACKAGE_FEATURE_UPDATED: 'HREASY_PACKAGE_FEATURE_UPDATED',
  HREASY_PACKAGE_FEATURE_DELETED: 'HREASY_PACKAGE_FEATURE_DELETED',
  HREASY_PACKAGE_FEATURES_REORDERED: 'HREASY_PACKAGE_FEATURES_REORDERED',

  HREASY_ALTERNATIVES_SECTION_UPDATED: 'HREASY_ALTERNATIVES_SECTION_UPDATED',
  HREASY_ALTERNATIVES_COLUMN_CREATED: 'HREASY_ALTERNATIVES_COLUMN_CREATED',
  HREASY_ALTERNATIVES_COLUMN_UPDATED: 'HREASY_ALTERNATIVES_COLUMN_UPDATED',
  HREASY_ALTERNATIVES_COLUMN_DELETED: 'HREASY_ALTERNATIVES_COLUMN_DELETED',
  HREASY_ALTERNATIVES_COLUMNS_REORDERED: 'HREASY_ALTERNATIVES_COLUMNS_REORDERED',
  HREASY_ALTERNATIVES_ROW_CREATED: 'HREASY_ALTERNATIVES_ROW_CREATED',
  HREASY_ALTERNATIVES_ROW_UPDATED: 'HREASY_ALTERNATIVES_ROW_UPDATED',
  HREASY_ALTERNATIVES_ROW_DELETED: 'HREASY_ALTERNATIVES_ROW_DELETED',
  HREASY_ALTERNATIVES_ROWS_REORDERED: 'HREASY_ALTERNATIVES_ROWS_REORDERED',

  HREASY_OUTCOME_STORY_CREATED: 'HREASY_OUTCOME_STORY_CREATED',
  HREASY_OUTCOME_STORY_UPDATED: 'HREASY_OUTCOME_STORY_UPDATED',
  HREASY_OUTCOME_STORY_DELETED: 'HREASY_OUTCOME_STORY_DELETED',
  HREASY_OUTCOME_STORIES_REORDERED: 'HREASY_OUTCOME_STORIES_REORDERED',
  HREASY_OUTCOME_STAT_CREATED: 'HREASY_OUTCOME_STAT_CREATED',
  HREASY_OUTCOME_STAT_UPDATED: 'HREASY_OUTCOME_STAT_UPDATED',
  HREASY_OUTCOME_STAT_DELETED: 'HREASY_OUTCOME_STAT_DELETED',
  HREASY_OUTCOME_STATS_REORDERED: 'HREASY_OUTCOME_STATS_REORDERED',

  WMS_HERO_SLIDE_CREATED: 'WMS_HERO_SLIDE_CREATED',
  WMS_HERO_SLIDE_UPDATED: 'WMS_HERO_SLIDE_UPDATED',
  WMS_HERO_SLIDE_DELETED: 'WMS_HERO_SLIDE_DELETED',
  WMS_HERO_SLIDES_REORDERED: 'WMS_HERO_SLIDES_REORDERED',

  WMS_FAQ_ENTRY_CREATED: 'WMS_FAQ_ENTRY_CREATED',
  WMS_FAQ_ENTRY_UPDATED: 'WMS_FAQ_ENTRY_UPDATED',
  WMS_FAQ_ENTRY_DELETED: 'WMS_FAQ_ENTRY_DELETED',
  WMS_FAQ_ENTRIES_REORDERED: 'WMS_FAQ_ENTRIES_REORDERED',

  WMS_CTA_SECTION_UPDATED: 'WMS_CTA_SECTION_UPDATED',
  WMS_CTA_TRUST_ITEM_CREATED: 'WMS_CTA_TRUST_ITEM_CREATED',
  WMS_CTA_TRUST_ITEM_UPDATED: 'WMS_CTA_TRUST_ITEM_UPDATED',
  WMS_CTA_TRUST_ITEM_DELETED: 'WMS_CTA_TRUST_ITEM_DELETED',
  WMS_CTA_TRUST_ITEMS_REORDERED: 'WMS_CTA_TRUST_ITEMS_REORDERED',

  WMS_PROOF_CARD_CREATED: 'WMS_PROOF_CARD_CREATED',
  WMS_PROOF_CARD_UPDATED: 'WMS_PROOF_CARD_UPDATED',
  WMS_PROOF_CARD_DELETED: 'WMS_PROOF_CARD_DELETED',
  WMS_PROOF_CARDS_REORDERED: 'WMS_PROOF_CARDS_REORDERED',
  WMS_PROOF_SLIDE_CREATED: 'WMS_PROOF_SLIDE_CREATED',
  WMS_PROOF_SLIDE_UPDATED: 'WMS_PROOF_SLIDE_UPDATED',
  WMS_PROOF_SLIDE_DELETED: 'WMS_PROOF_SLIDE_DELETED',
  WMS_PROOF_SLIDES_REORDERED: 'WMS_PROOF_SLIDES_REORDERED',

  WMS_RECOGNITION_CARD_CREATED: 'WMS_RECOGNITION_CARD_CREATED',
  WMS_RECOGNITION_CARD_UPDATED: 'WMS_RECOGNITION_CARD_UPDATED',
  WMS_RECOGNITION_CARD_DELETED: 'WMS_RECOGNITION_CARD_DELETED',
  WMS_RECOGNITION_CARDS_REORDERED: 'WMS_RECOGNITION_CARDS_REORDERED',

  WMS_CAPABILITY_MODULE_CREATED: 'WMS_CAPABILITY_MODULE_CREATED',
  WMS_CAPABILITY_MODULE_UPDATED: 'WMS_CAPABILITY_MODULE_UPDATED',
  WMS_CAPABILITY_MODULE_DELETED: 'WMS_CAPABILITY_MODULE_DELETED',
  WMS_CAPABILITY_MODULES_REORDERED: 'WMS_CAPABILITY_MODULES_REORDERED',

  WMS_OUTCOME_CARD_CREATED: 'WMS_OUTCOME_CARD_CREATED',
  WMS_OUTCOME_CARD_UPDATED: 'WMS_OUTCOME_CARD_UPDATED',
  WMS_OUTCOME_CARD_DELETED: 'WMS_OUTCOME_CARD_DELETED',
  WMS_OUTCOME_CARDS_REORDERED: 'WMS_OUTCOME_CARDS_REORDERED',

  // ── Vendor Portal (VMS) page ────────────────────────────────────────────
  VMS_HERO_SLIDE_CREATED: 'VMS_HERO_SLIDE_CREATED',
  VMS_HERO_SLIDE_UPDATED: 'VMS_HERO_SLIDE_UPDATED',
  VMS_HERO_SLIDE_DELETED: 'VMS_HERO_SLIDE_DELETED',
  VMS_HERO_SLIDES_REORDERED: 'VMS_HERO_SLIDES_REORDERED',

  VMS_PROOF_TILE_CREATED: 'VMS_PROOF_TILE_CREATED',
  VMS_PROOF_TILE_UPDATED: 'VMS_PROOF_TILE_UPDATED',
  VMS_PROOF_TILE_DELETED: 'VMS_PROOF_TILE_DELETED',
  VMS_PROOF_TILES_REORDERED: 'VMS_PROOF_TILES_REORDERED',

  VMS_CAPABILITY_CARD_CREATED: 'VMS_CAPABILITY_CARD_CREATED',
  VMS_CAPABILITY_CARD_UPDATED: 'VMS_CAPABILITY_CARD_UPDATED',
  VMS_CAPABILITY_CARD_DELETED: 'VMS_CAPABILITY_CARD_DELETED',
  VMS_CAPABILITY_CARDS_REORDERED: 'VMS_CAPABILITY_CARDS_REORDERED',

  VMS_OUTCOME_VIDEO_CREATED: 'VMS_OUTCOME_VIDEO_CREATED',
  VMS_OUTCOME_VIDEO_UPDATED: 'VMS_OUTCOME_VIDEO_UPDATED',
  VMS_OUTCOME_VIDEO_DELETED: 'VMS_OUTCOME_VIDEO_DELETED',
  VMS_OUTCOME_VIDEOS_REORDERED: 'VMS_OUTCOME_VIDEOS_REORDERED',

  VMS_FAQ_ENTRY_CREATED: 'VMS_FAQ_ENTRY_CREATED',
  VMS_FAQ_ENTRY_UPDATED: 'VMS_FAQ_ENTRY_UPDATED',
  VMS_FAQ_ENTRY_DELETED: 'VMS_FAQ_ENTRY_DELETED',
  VMS_FAQ_ENTRIES_REORDERED: 'VMS_FAQ_ENTRIES_REORDERED',

  VMS_CTA_SECTION_UPDATED: 'VMS_CTA_SECTION_UPDATED',

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

  ENGINEERING_HERO_SLIDE_CREATED: 'ENGINEERING_HERO_SLIDE_CREATED',
  ENGINEERING_HERO_SLIDE_UPDATED: 'ENGINEERING_HERO_SLIDE_UPDATED',
  ENGINEERING_HERO_SLIDE_DELETED: 'ENGINEERING_HERO_SLIDE_DELETED',
  ENGINEERING_HERO_SLIDES_REORDERED: 'ENGINEERING_HERO_SLIDES_REORDERED',

  ENGINEERING_TRUST_LOGO_CREATED: 'ENGINEERING_TRUST_LOGO_CREATED',
  ENGINEERING_TRUST_LOGO_UPDATED: 'ENGINEERING_TRUST_LOGO_UPDATED',
  ENGINEERING_TRUST_LOGO_DELETED: 'ENGINEERING_TRUST_LOGO_DELETED',
  ENGINEERING_TRUST_LOGOS_REORDERED: 'ENGINEERING_TRUST_LOGOS_REORDERED',
  ENGINEERING_TRUST_CARD_CREATED: 'ENGINEERING_TRUST_CARD_CREATED',
  ENGINEERING_TRUST_CARD_UPDATED: 'ENGINEERING_TRUST_CARD_UPDATED',
  ENGINEERING_TRUST_CARD_DELETED: 'ENGINEERING_TRUST_CARD_DELETED',
  ENGINEERING_TRUST_CARDS_REORDERED: 'ENGINEERING_TRUST_CARDS_REORDERED',

  ENGINEERING_CAPABILITY_CREATED: 'ENGINEERING_CAPABILITY_CREATED',
  ENGINEERING_CAPABILITY_UPDATED: 'ENGINEERING_CAPABILITY_UPDATED',
  ENGINEERING_CAPABILITY_DELETED: 'ENGINEERING_CAPABILITY_DELETED',
  ENGINEERING_CAPABILITIES_REORDERED: 'ENGINEERING_CAPABILITIES_REORDERED',

  ENGINEERING_PLATFORM_PANEL_UPDATED: 'ENGINEERING_PLATFORM_PANEL_UPDATED',
  ENGINEERING_PLATFORM_WORKFLOW_CREATED: 'ENGINEERING_PLATFORM_WORKFLOW_CREATED',
  ENGINEERING_PLATFORM_WORKFLOW_UPDATED: 'ENGINEERING_PLATFORM_WORKFLOW_UPDATED',
  ENGINEERING_PLATFORM_WORKFLOW_DELETED: 'ENGINEERING_PLATFORM_WORKFLOW_DELETED',
  ENGINEERING_PLATFORM_WORKFLOWS_REORDERED: 'ENGINEERING_PLATFORM_WORKFLOWS_REORDERED',

  ENGINEERING_COVERAGE_PANEL_UPDATED: 'ENGINEERING_COVERAGE_PANEL_UPDATED',
  ENGINEERING_COVERAGE_CATEGORY_CREATED: 'ENGINEERING_COVERAGE_CATEGORY_CREATED',
  ENGINEERING_COVERAGE_CATEGORY_UPDATED: 'ENGINEERING_COVERAGE_CATEGORY_UPDATED',
  ENGINEERING_COVERAGE_CATEGORY_DELETED: 'ENGINEERING_COVERAGE_CATEGORY_DELETED',
  ENGINEERING_COVERAGE_CATEGORIES_REORDERED: 'ENGINEERING_COVERAGE_CATEGORIES_REORDERED',

  ENGINEERING_FAQ_ENTRY_CREATED: 'ENGINEERING_FAQ_ENTRY_CREATED',
  ENGINEERING_FAQ_ENTRY_UPDATED: 'ENGINEERING_FAQ_ENTRY_UPDATED',
  ENGINEERING_FAQ_ENTRY_DELETED: 'ENGINEERING_FAQ_ENTRY_DELETED',
  ENGINEERING_FAQ_ENTRIES_REORDERED: 'ENGINEERING_FAQ_ENTRIES_REORDERED',

  ENGINEERING_CTA_SECTION_UPDATED: 'ENGINEERING_CTA_SECTION_UPDATED',

  BEVERAGE_HERO_SLIDE_CREATED: 'BEVERAGE_HERO_SLIDE_CREATED',
  BEVERAGE_HERO_SLIDE_UPDATED: 'BEVERAGE_HERO_SLIDE_UPDATED',
  BEVERAGE_HERO_SLIDE_DELETED: 'BEVERAGE_HERO_SLIDE_DELETED',
  BEVERAGE_HERO_SLIDES_REORDERED: 'BEVERAGE_HERO_SLIDES_REORDERED',

  BEVERAGE_TRUST_LOGO_CREATED: 'BEVERAGE_TRUST_LOGO_CREATED',
  BEVERAGE_TRUST_LOGO_UPDATED: 'BEVERAGE_TRUST_LOGO_UPDATED',
  BEVERAGE_TRUST_LOGO_DELETED: 'BEVERAGE_TRUST_LOGO_DELETED',
  BEVERAGE_TRUST_LOGOS_REORDERED: 'BEVERAGE_TRUST_LOGOS_REORDERED',
  BEVERAGE_TRUST_STAT_CREATED: 'BEVERAGE_TRUST_STAT_CREATED',
  BEVERAGE_TRUST_STAT_UPDATED: 'BEVERAGE_TRUST_STAT_UPDATED',
  BEVERAGE_TRUST_STAT_DELETED: 'BEVERAGE_TRUST_STAT_DELETED',
  BEVERAGE_TRUST_STATS_REORDERED: 'BEVERAGE_TRUST_STATS_REORDERED',

  BEVERAGE_CAPABILITIES_PANEL_UPDATED: 'BEVERAGE_CAPABILITIES_PANEL_UPDATED',
  BEVERAGE_CAPABILITY_CREATED: 'BEVERAGE_CAPABILITY_CREATED',
  BEVERAGE_CAPABILITY_UPDATED: 'BEVERAGE_CAPABILITY_UPDATED',
  BEVERAGE_CAPABILITY_DELETED: 'BEVERAGE_CAPABILITY_DELETED',
  BEVERAGE_CAPABILITIES_REORDERED: 'BEVERAGE_CAPABILITIES_REORDERED',

  BEVERAGE_PLATFORM_PANEL_UPDATED: 'BEVERAGE_PLATFORM_PANEL_UPDATED',
  BEVERAGE_PLATFORM_WORKFLOW_CREATED: 'BEVERAGE_PLATFORM_WORKFLOW_CREATED',
  BEVERAGE_PLATFORM_WORKFLOW_UPDATED: 'BEVERAGE_PLATFORM_WORKFLOW_UPDATED',
  BEVERAGE_PLATFORM_WORKFLOW_DELETED: 'BEVERAGE_PLATFORM_WORKFLOW_DELETED',
  BEVERAGE_PLATFORM_WORKFLOWS_REORDERED: 'BEVERAGE_PLATFORM_WORKFLOWS_REORDERED',

  BEVERAGE_COVERAGE_CATEGORY_CREATED: 'BEVERAGE_COVERAGE_CATEGORY_CREATED',
  BEVERAGE_COVERAGE_CATEGORY_UPDATED: 'BEVERAGE_COVERAGE_CATEGORY_UPDATED',
  BEVERAGE_COVERAGE_CATEGORY_DELETED: 'BEVERAGE_COVERAGE_CATEGORY_DELETED',
  BEVERAGE_COVERAGE_CATEGORIES_REORDERED: 'BEVERAGE_COVERAGE_CATEGORIES_REORDERED',

  BEVERAGE_FAQ_ENTRY_CREATED: 'BEVERAGE_FAQ_ENTRY_CREATED',
  BEVERAGE_FAQ_ENTRY_UPDATED: 'BEVERAGE_FAQ_ENTRY_UPDATED',
  BEVERAGE_FAQ_ENTRY_DELETED: 'BEVERAGE_FAQ_ENTRY_DELETED',
  BEVERAGE_FAQ_ENTRIES_REORDERED: 'BEVERAGE_FAQ_ENTRIES_REORDERED',

  BEVERAGE_CTA_SECTION_UPDATED: 'BEVERAGE_CTA_SECTION_UPDATED',

  SPICES_AGRO_HERO_SLIDE_CREATED: 'SPICES_AGRO_HERO_SLIDE_CREATED',
  SPICES_AGRO_HERO_SLIDE_UPDATED: 'SPICES_AGRO_HERO_SLIDE_UPDATED',
  SPICES_AGRO_HERO_SLIDE_DELETED: 'SPICES_AGRO_HERO_SLIDE_DELETED',
  SPICES_AGRO_HERO_SLIDES_REORDERED: 'SPICES_AGRO_HERO_SLIDES_REORDERED',

  SPICES_AGRO_TRUST_LOGO_CREATED: 'SPICES_AGRO_TRUST_LOGO_CREATED',
  SPICES_AGRO_TRUST_LOGO_UPDATED: 'SPICES_AGRO_TRUST_LOGO_UPDATED',
  SPICES_AGRO_TRUST_LOGO_DELETED: 'SPICES_AGRO_TRUST_LOGO_DELETED',
  SPICES_AGRO_TRUST_LOGOS_REORDERED: 'SPICES_AGRO_TRUST_LOGOS_REORDERED',
  SPICES_AGRO_TRUST_PANEL_UPDATED: 'SPICES_AGRO_TRUST_PANEL_UPDATED',

  SPICES_AGRO_CAPABILITIES_PANEL_UPDATED: 'SPICES_AGRO_CAPABILITIES_PANEL_UPDATED',
  SPICES_AGRO_CAPABILITY_CREATED: 'SPICES_AGRO_CAPABILITY_CREATED',
  SPICES_AGRO_CAPABILITY_UPDATED: 'SPICES_AGRO_CAPABILITY_UPDATED',
  SPICES_AGRO_CAPABILITY_DELETED: 'SPICES_AGRO_CAPABILITY_DELETED',
  SPICES_AGRO_CAPABILITIES_REORDERED: 'SPICES_AGRO_CAPABILITIES_REORDERED',

  SPICES_AGRO_PLATFORM_PANEL_UPDATED: 'SPICES_AGRO_PLATFORM_PANEL_UPDATED',
  SPICES_AGRO_PLATFORM_GROUP_CREATED: 'SPICES_AGRO_PLATFORM_GROUP_CREATED',
  SPICES_AGRO_PLATFORM_GROUP_UPDATED: 'SPICES_AGRO_PLATFORM_GROUP_UPDATED',
  SPICES_AGRO_PLATFORM_GROUP_DELETED: 'SPICES_AGRO_PLATFORM_GROUP_DELETED',
  SPICES_AGRO_PLATFORM_GROUPS_REORDERED: 'SPICES_AGRO_PLATFORM_GROUPS_REORDERED',

  SPICES_AGRO_COVERAGE_CATEGORY_CREATED: 'SPICES_AGRO_COVERAGE_CATEGORY_CREATED',
  SPICES_AGRO_COVERAGE_CATEGORY_UPDATED: 'SPICES_AGRO_COVERAGE_CATEGORY_UPDATED',
  SPICES_AGRO_COVERAGE_CATEGORY_DELETED: 'SPICES_AGRO_COVERAGE_CATEGORY_DELETED',
  SPICES_AGRO_COVERAGE_CATEGORIES_REORDERED: 'SPICES_AGRO_COVERAGE_CATEGORIES_REORDERED',

  SPICES_AGRO_FAQ_ENTRY_CREATED: 'SPICES_AGRO_FAQ_ENTRY_CREATED',
  SPICES_AGRO_FAQ_ENTRY_UPDATED: 'SPICES_AGRO_FAQ_ENTRY_UPDATED',
  SPICES_AGRO_FAQ_ENTRY_DELETED: 'SPICES_AGRO_FAQ_ENTRY_DELETED',
  SPICES_AGRO_FAQ_ENTRIES_REORDERED: 'SPICES_AGRO_FAQ_ENTRIES_REORDERED',

  SPICES_AGRO_CTA_SECTION_UPDATED: 'SPICES_AGRO_CTA_SECTION_UPDATED',

  QSR_FRANCHISE_HERO_SLIDE_CREATED: 'QSR_FRANCHISE_HERO_SLIDE_CREATED',
  QSR_FRANCHISE_HERO_SLIDE_UPDATED: 'QSR_FRANCHISE_HERO_SLIDE_UPDATED',
  QSR_FRANCHISE_HERO_SLIDE_DELETED: 'QSR_FRANCHISE_HERO_SLIDE_DELETED',
  QSR_FRANCHISE_HERO_SLIDES_REORDERED: 'QSR_FRANCHISE_HERO_SLIDES_REORDERED',
  QSR_FRANCHISE_TRUST_LOGO_CREATED: 'QSR_FRANCHISE_TRUST_LOGO_CREATED',
  QSR_FRANCHISE_TRUST_LOGO_UPDATED: 'QSR_FRANCHISE_TRUST_LOGO_UPDATED',
  QSR_FRANCHISE_TRUST_LOGO_DELETED: 'QSR_FRANCHISE_TRUST_LOGO_DELETED',
  QSR_FRANCHISE_TRUST_LOGOS_REORDERED: 'QSR_FRANCHISE_TRUST_LOGOS_REORDERED',
  QSR_FRANCHISE_TRUST_STAT_CREATED: 'QSR_FRANCHISE_TRUST_STAT_CREATED',
  QSR_FRANCHISE_TRUST_STAT_UPDATED: 'QSR_FRANCHISE_TRUST_STAT_UPDATED',
  QSR_FRANCHISE_TRUST_STAT_DELETED: 'QSR_FRANCHISE_TRUST_STAT_DELETED',
  QSR_FRANCHISE_TRUST_STATS_REORDERED: 'QSR_FRANCHISE_TRUST_STATS_REORDERED',
  QSR_FRANCHISE_TRUST_PANEL_UPDATED: 'QSR_FRANCHISE_TRUST_PANEL_UPDATED',
  QSR_FRANCHISE_CAPABILITIES_PANEL_UPDATED: 'QSR_FRANCHISE_CAPABILITIES_PANEL_UPDATED',
  QSR_FRANCHISE_CAPABILITY_CREATED: 'QSR_FRANCHISE_CAPABILITY_CREATED',
  QSR_FRANCHISE_CAPABILITY_UPDATED: 'QSR_FRANCHISE_CAPABILITY_UPDATED',
  QSR_FRANCHISE_CAPABILITY_DELETED: 'QSR_FRANCHISE_CAPABILITY_DELETED',
  QSR_FRANCHISE_CAPABILITIES_REORDERED: 'QSR_FRANCHISE_CAPABILITIES_REORDERED',
  QSR_FRANCHISE_PLATFORM_PANEL_UPDATED: 'QSR_FRANCHISE_PLATFORM_PANEL_UPDATED',
  QSR_FRANCHISE_PLATFORM_WORKFLOW_CREATED: 'QSR_FRANCHISE_PLATFORM_WORKFLOW_CREATED',
  QSR_FRANCHISE_PLATFORM_WORKFLOW_UPDATED: 'QSR_FRANCHISE_PLATFORM_WORKFLOW_UPDATED',
  QSR_FRANCHISE_PLATFORM_WORKFLOW_DELETED: 'QSR_FRANCHISE_PLATFORM_WORKFLOW_DELETED',
  QSR_FRANCHISE_PLATFORM_WORKFLOWS_REORDERED: 'QSR_FRANCHISE_PLATFORM_WORKFLOWS_REORDERED',
  QSR_FRANCHISE_COVERAGE_CATEGORY_CREATED: 'QSR_FRANCHISE_COVERAGE_CATEGORY_CREATED',
  QSR_FRANCHISE_COVERAGE_CATEGORY_UPDATED: 'QSR_FRANCHISE_COVERAGE_CATEGORY_UPDATED',
  QSR_FRANCHISE_COVERAGE_CATEGORY_DELETED: 'QSR_FRANCHISE_COVERAGE_CATEGORY_DELETED',
  QSR_FRANCHISE_COVERAGE_CATEGORIES_REORDERED: 'QSR_FRANCHISE_COVERAGE_CATEGORIES_REORDERED',
  QSR_FRANCHISE_FAQ_ENTRY_CREATED: 'QSR_FRANCHISE_FAQ_ENTRY_CREATED',
  QSR_FRANCHISE_FAQ_ENTRY_UPDATED: 'QSR_FRANCHISE_FAQ_ENTRY_UPDATED',
  QSR_FRANCHISE_FAQ_ENTRY_DELETED: 'QSR_FRANCHISE_FAQ_ENTRY_DELETED',
  QSR_FRANCHISE_FAQ_ENTRIES_REORDERED: 'QSR_FRANCHISE_FAQ_ENTRIES_REORDERED',
  QSR_FRANCHISE_CTA_SECTION_UPDATED: 'QSR_FRANCHISE_CTA_SECTION_UPDATED',

  WHY_UPWON_HERO_SECTION_UPDATED: 'WHY_UPWON_HERO_SECTION_UPDATED',
  WHY_UPWON_INDUSTRY_CREATED: 'WHY_UPWON_INDUSTRY_CREATED',
  WHY_UPWON_INDUSTRY_UPDATED: 'WHY_UPWON_INDUSTRY_UPDATED',
  WHY_UPWON_INDUSTRY_DELETED: 'WHY_UPWON_INDUSTRY_DELETED',
  WHY_UPWON_INDUSTRIES_REORDERED: 'WHY_UPWON_INDUSTRIES_REORDERED',
  WHY_UPWON_TESTIMONIAL_CREATED: 'WHY_UPWON_TESTIMONIAL_CREATED',
  WHY_UPWON_TESTIMONIAL_UPDATED: 'WHY_UPWON_TESTIMONIAL_UPDATED',
  WHY_UPWON_TESTIMONIAL_DELETED: 'WHY_UPWON_TESTIMONIAL_DELETED',
  WHY_UPWON_TESTIMONIALS_REORDERED: 'WHY_UPWON_TESTIMONIALS_REORDERED',
  WHY_UPWON_CLIENT_LOGO_CREATED: 'WHY_UPWON_CLIENT_LOGO_CREATED',
  WHY_UPWON_CLIENT_LOGO_UPDATED: 'WHY_UPWON_CLIENT_LOGO_UPDATED',
  WHY_UPWON_CLIENT_LOGO_DELETED: 'WHY_UPWON_CLIENT_LOGO_DELETED',
  WHY_UPWON_CLIENT_LOGOS_REORDERED: 'WHY_UPWON_CLIENT_LOGOS_REORDERED',
  WHY_UPWON_TESTIMONIALS_PANEL_UPDATED: 'WHY_UPWON_TESTIMONIALS_PANEL_UPDATED',
  WHY_UPWON_PROOF_PANEL_UPDATED: 'WHY_UPWON_PROOF_PANEL_UPDATED',
  WHY_UPWON_PROOF_CALLOUT_CREATED: 'WHY_UPWON_PROOF_CALLOUT_CREATED',
  WHY_UPWON_PROOF_CALLOUT_UPDATED: 'WHY_UPWON_PROOF_CALLOUT_UPDATED',
  WHY_UPWON_PROOF_CALLOUT_DELETED: 'WHY_UPWON_PROOF_CALLOUT_DELETED',
  WHY_UPWON_PROOF_CALLOUTS_REORDERED: 'WHY_UPWON_PROOF_CALLOUTS_REORDERED',
  WHY_UPWON_RESULTS_PANEL_UPDATED: 'WHY_UPWON_RESULTS_PANEL_UPDATED',
  WHY_UPWON_RESULT_CREATED: 'WHY_UPWON_RESULT_CREATED',
  WHY_UPWON_RESULT_UPDATED: 'WHY_UPWON_RESULT_UPDATED',
  WHY_UPWON_RESULT_DELETED: 'WHY_UPWON_RESULT_DELETED',
  WHY_UPWON_RESULTS_REORDERED: 'WHY_UPWON_RESULTS_REORDERED',
  WHY_UPWON_CTA_SECTION_UPDATED: 'WHY_UPWON_CTA_SECTION_UPDATED',

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

  /*
   * The site footer's two ordered lists, on the same pattern as every other
   * ordered CMS row set in this API. Two families rather than one
   * SOCIAL_MEDIA_LINK_* for both, because the trail's job is to say WHICH list
   * changed - a phone number printed under the brand block and an icon in the
   * row beneath it are different edits - without anybody having to read the
   * entity type.
   */
  SOCIAL_CONTACT_LINE_CREATED: 'SOCIAL_CONTACT_LINE_CREATED',
  SOCIAL_CONTACT_LINE_UPDATED: 'SOCIAL_CONTACT_LINE_UPDATED',
  SOCIAL_CONTACT_LINE_STATUS_CHANGED: 'SOCIAL_CONTACT_LINE_STATUS_CHANGED',
  SOCIAL_CONTACT_LINES_REORDERED: 'SOCIAL_CONTACT_LINES_REORDERED',
  SOCIAL_CONTACT_LINE_DELETED: 'SOCIAL_CONTACT_LINE_DELETED',

  SOCIAL_LINK_CREATED: 'SOCIAL_LINK_CREATED',
  SOCIAL_LINK_UPDATED: 'SOCIAL_LINK_UPDATED',
  SOCIAL_LINK_STATUS_CHANGED: 'SOCIAL_LINK_STATUS_CHANGED',
  SOCIAL_LINKS_REORDERED: 'SOCIAL_LINKS_REORDERED',
  SOCIAL_LINK_DELETED: 'SOCIAL_LINK_DELETED',

  /*
   * The Blog. The two copy blocks are singletons, each with one action, on the
   * About page's pattern. Categories are an ordered list like every other one
   * in this API; posts are not ordered at all - the page sorts them by their
   * publish date - so they have no REORDERED action.
   *
   * Category and post families are kept apart for the reason the footer's two
   * lists are: the trail should say WHICH kind of thing changed without anybody
   * having to read the entity type, and renaming a topic chip is a different
   * edit from rewriting an article.
   */
  BLOG_HERO_UPDATED: 'BLOG_HERO_UPDATED',
  BLOG_TOPICS_UPDATED: 'BLOG_TOPICS_UPDATED',

  BLOG_CATEGORY_CREATED: 'BLOG_CATEGORY_CREATED',
  BLOG_CATEGORY_UPDATED: 'BLOG_CATEGORY_UPDATED',
  BLOG_CATEGORY_STATUS_CHANGED: 'BLOG_CATEGORY_STATUS_CHANGED',
  BLOG_CATEGORIES_REORDERED: 'BLOG_CATEGORIES_REORDERED',
  BLOG_CATEGORY_DELETED: 'BLOG_CATEGORY_DELETED',

  BLOG_POST_CREATED: 'BLOG_POST_CREATED',
  BLOG_POST_UPDATED: 'BLOG_POST_UPDATED',
  BLOG_POST_STATUS_CHANGED: 'BLOG_POST_STATUS_CHANGED',
  BLOG_POST_DELETED: 'BLOG_POST_DELETED',
  BAKERY_HERO_SLIDE_CREATED: 'BAKERY_HERO_SLIDE_CREATED',
  BAKERY_HERO_SLIDE_UPDATED: 'BAKERY_HERO_SLIDE_UPDATED',
  BAKERY_HERO_SLIDE_DELETED: 'BAKERY_HERO_SLIDE_DELETED',
  BAKERY_HERO_SLIDES_REORDERED: 'BAKERY_HERO_SLIDES_REORDERED',

  BAKERY_TRUST_LOGO_CREATED: 'BAKERY_TRUST_LOGO_CREATED',
  BAKERY_TRUST_LOGO_UPDATED: 'BAKERY_TRUST_LOGO_UPDATED',
  BAKERY_TRUST_LOGO_DELETED: 'BAKERY_TRUST_LOGO_DELETED',
  BAKERY_TRUST_LOGOS_REORDERED: 'BAKERY_TRUST_LOGOS_REORDERED',

  BAKERY_TRUST_STAT_CREATED: 'BAKERY_TRUST_STAT_CREATED',
  BAKERY_TRUST_STAT_UPDATED: 'BAKERY_TRUST_STAT_UPDATED',
  BAKERY_TRUST_STAT_DELETED: 'BAKERY_TRUST_STAT_DELETED',
  BAKERY_TRUST_STATS_REORDERED: 'BAKERY_TRUST_STATS_REORDERED',

  BAKERY_PLATFORM_TILE_CREATED: 'BAKERY_PLATFORM_TILE_CREATED',
  BAKERY_PLATFORM_TILE_UPDATED: 'BAKERY_PLATFORM_TILE_UPDATED',
  BAKERY_PLATFORM_TILE_DELETED: 'BAKERY_PLATFORM_TILE_DELETED',
  BAKERY_PLATFORM_TILES_REORDERED: 'BAKERY_PLATFORM_TILES_REORDERED',

  BAKERY_HELP_VISUAL_CREATED: 'BAKERY_HELP_VISUAL_CREATED',
  BAKERY_HELP_VISUAL_UPDATED: 'BAKERY_HELP_VISUAL_UPDATED',
  BAKERY_HELP_VISUAL_DELETED: 'BAKERY_HELP_VISUAL_DELETED',
  BAKERY_HELP_VISUALS_REORDERED: 'BAKERY_HELP_VISUALS_REORDERED',

  BAKERY_FAQ_ENTRY_CREATED: 'BAKERY_FAQ_ENTRY_CREATED',
  BAKERY_FAQ_ENTRY_UPDATED: 'BAKERY_FAQ_ENTRY_UPDATED',
  BAKERY_FAQ_ENTRY_DELETED: 'BAKERY_FAQ_ENTRY_DELETED',
  BAKERY_FAQ_ENTRIES_REORDERED: 'BAKERY_FAQ_ENTRIES_REORDERED',

  BAKERY_CTA_FEATURE_CREATED: 'BAKERY_CTA_FEATURE_CREATED',
  BAKERY_CTA_FEATURE_UPDATED: 'BAKERY_CTA_FEATURE_UPDATED',
  BAKERY_CTA_FEATURE_DELETED: 'BAKERY_CTA_FEATURE_DELETED',
  BAKERY_CTA_FEATURES_REORDERED: 'BAKERY_CTA_FEATURES_REORDERED',

  BAKERY_CTA_SECTION_UPDATED: 'BAKERY_CTA_SECTION_UPDATED',

  FMCG_HERO_SLIDE_CREATED: 'FMCG_HERO_SLIDE_CREATED',
  FMCG_HERO_SLIDE_UPDATED: 'FMCG_HERO_SLIDE_UPDATED',
  FMCG_HERO_SLIDE_DELETED: 'FMCG_HERO_SLIDE_DELETED',
  FMCG_HERO_SLIDES_REORDERED: 'FMCG_HERO_SLIDES_REORDERED',

  FMCG_TRUST_LOGO_CREATED: 'FMCG_TRUST_LOGO_CREATED',
  FMCG_TRUST_LOGO_UPDATED: 'FMCG_TRUST_LOGO_UPDATED',
  FMCG_TRUST_LOGO_DELETED: 'FMCG_TRUST_LOGO_DELETED',
  FMCG_TRUST_LOGOS_REORDERED: 'FMCG_TRUST_LOGOS_REORDERED',

  FMCG_TRUST_STAT_CREATED: 'FMCG_TRUST_STAT_CREATED',
  FMCG_TRUST_STAT_UPDATED: 'FMCG_TRUST_STAT_UPDATED',
  FMCG_TRUST_STAT_DELETED: 'FMCG_TRUST_STAT_DELETED',
  FMCG_TRUST_STATS_REORDERED: 'FMCG_TRUST_STATS_REORDERED',

  FMCG_PLATFORM_TILE_CREATED: 'FMCG_PLATFORM_TILE_CREATED',
  FMCG_PLATFORM_TILE_UPDATED: 'FMCG_PLATFORM_TILE_UPDATED',
  FMCG_PLATFORM_TILE_DELETED: 'FMCG_PLATFORM_TILE_DELETED',
  FMCG_PLATFORM_TILES_REORDERED: 'FMCG_PLATFORM_TILES_REORDERED',

  FMCG_FAQ_ENTRY_CREATED: 'FMCG_FAQ_ENTRY_CREATED',
  FMCG_FAQ_ENTRY_UPDATED: 'FMCG_FAQ_ENTRY_UPDATED',
  FMCG_FAQ_ENTRY_DELETED: 'FMCG_FAQ_ENTRY_DELETED',
  FMCG_FAQ_ENTRIES_REORDERED: 'FMCG_FAQ_ENTRIES_REORDERED',

  FMCG_CTA_SECTION_UPDATED: 'FMCG_CTA_SECTION_UPDATED',

  SWEETS_HERO_SLIDE_CREATED: 'SWEETS_HERO_SLIDE_CREATED',
  SWEETS_HERO_SLIDE_UPDATED: 'SWEETS_HERO_SLIDE_UPDATED',
  SWEETS_HERO_SLIDE_DELETED: 'SWEETS_HERO_SLIDE_DELETED',
  SWEETS_HERO_SLIDES_REORDERED: 'SWEETS_HERO_SLIDES_REORDERED',

  SWEETS_TRUST_LOGO_CREATED: 'SWEETS_TRUST_LOGO_CREATED',
  SWEETS_TRUST_LOGO_UPDATED: 'SWEETS_TRUST_LOGO_UPDATED',
  SWEETS_TRUST_LOGO_DELETED: 'SWEETS_TRUST_LOGO_DELETED',
  SWEETS_TRUST_LOGOS_REORDERED: 'SWEETS_TRUST_LOGOS_REORDERED',

  SWEETS_TRUST_STAT_CREATED: 'SWEETS_TRUST_STAT_CREATED',
  SWEETS_TRUST_STAT_UPDATED: 'SWEETS_TRUST_STAT_UPDATED',
  SWEETS_TRUST_STAT_DELETED: 'SWEETS_TRUST_STAT_DELETED',
  SWEETS_TRUST_STATS_REORDERED: 'SWEETS_TRUST_STATS_REORDERED',

  SWEETS_PLATFORM_TILE_CREATED: 'SWEETS_PLATFORM_TILE_CREATED',
  SWEETS_PLATFORM_TILE_UPDATED: 'SWEETS_PLATFORM_TILE_UPDATED',
  SWEETS_PLATFORM_TILE_DELETED: 'SWEETS_PLATFORM_TILE_DELETED',
  SWEETS_PLATFORM_TILES_REORDERED: 'SWEETS_PLATFORM_TILES_REORDERED',

  SWEETS_FAQ_ENTRY_CREATED: 'SWEETS_FAQ_ENTRY_CREATED',
  SWEETS_FAQ_ENTRY_UPDATED: 'SWEETS_FAQ_ENTRY_UPDATED',
  SWEETS_FAQ_ENTRY_DELETED: 'SWEETS_FAQ_ENTRY_DELETED',
  SWEETS_FAQ_ENTRIES_REORDERED: 'SWEETS_FAQ_ENTRIES_REORDERED',

  SWEETS_CTA_SECTION_UPDATED: 'SWEETS_CTA_SECTION_UPDATED',

  FOOD_PROCESSING_HERO_SLIDE_CREATED: 'FOOD_PROCESSING_HERO_SLIDE_CREATED',
  FOOD_PROCESSING_HERO_SLIDE_UPDATED: 'FOOD_PROCESSING_HERO_SLIDE_UPDATED',
  FOOD_PROCESSING_HERO_SLIDE_DELETED: 'FOOD_PROCESSING_HERO_SLIDE_DELETED',
  FOOD_PROCESSING_HERO_SLIDES_REORDERED: 'FOOD_PROCESSING_HERO_SLIDES_REORDERED',

  FOOD_PROCESSING_TRUST_LOGO_CREATED: 'FOOD_PROCESSING_TRUST_LOGO_CREATED',
  FOOD_PROCESSING_TRUST_LOGO_UPDATED: 'FOOD_PROCESSING_TRUST_LOGO_UPDATED',
  FOOD_PROCESSING_TRUST_LOGO_DELETED: 'FOOD_PROCESSING_TRUST_LOGO_DELETED',
  FOOD_PROCESSING_TRUST_LOGOS_REORDERED: 'FOOD_PROCESSING_TRUST_LOGOS_REORDERED',

  FOOD_PROCESSING_TRUST_STAT_CREATED: 'FOOD_PROCESSING_TRUST_STAT_CREATED',
  FOOD_PROCESSING_TRUST_STAT_UPDATED: 'FOOD_PROCESSING_TRUST_STAT_UPDATED',
  FOOD_PROCESSING_TRUST_STAT_DELETED: 'FOOD_PROCESSING_TRUST_STAT_DELETED',
  FOOD_PROCESSING_TRUST_STATS_REORDERED: 'FOOD_PROCESSING_TRUST_STATS_REORDERED',

  FOOD_PROCESSING_PLATFORM_TILE_CREATED: 'FOOD_PROCESSING_PLATFORM_TILE_CREATED',
  FOOD_PROCESSING_PLATFORM_TILE_UPDATED: 'FOOD_PROCESSING_PLATFORM_TILE_UPDATED',
  FOOD_PROCESSING_PLATFORM_TILE_DELETED: 'FOOD_PROCESSING_PLATFORM_TILE_DELETED',
  FOOD_PROCESSING_PLATFORM_TILES_REORDERED: 'FOOD_PROCESSING_PLATFORM_TILES_REORDERED',

  FOOD_PROCESSING_FAQ_ENTRY_CREATED: 'FOOD_PROCESSING_FAQ_ENTRY_CREATED',
  FOOD_PROCESSING_FAQ_ENTRY_UPDATED: 'FOOD_PROCESSING_FAQ_ENTRY_UPDATED',
  FOOD_PROCESSING_FAQ_ENTRY_DELETED: 'FOOD_PROCESSING_FAQ_ENTRY_DELETED',
  FOOD_PROCESSING_FAQ_ENTRIES_REORDERED: 'FOOD_PROCESSING_FAQ_ENTRIES_REORDERED',

  FOOD_PROCESSING_COVERAGE_ITEM_CREATED: 'FOOD_PROCESSING_COVERAGE_ITEM_CREATED',
  FOOD_PROCESSING_COVERAGE_ITEM_UPDATED: 'FOOD_PROCESSING_COVERAGE_ITEM_UPDATED',
  FOOD_PROCESSING_COVERAGE_ITEM_DELETED: 'FOOD_PROCESSING_COVERAGE_ITEM_DELETED',
  FOOD_PROCESSING_COVERAGE_ITEMS_REORDERED: 'FOOD_PROCESSING_COVERAGE_ITEMS_REORDERED',

  FOOD_PROCESSING_CTA_SECTION_UPDATED: 'FOOD_PROCESSING_CTA_SECTION_UPDATED',
  FOOD_PROCESSING_TRUST_PANEL_UPDATED: 'FOOD_PROCESSING_TRUST_PANEL_UPDATED',

  NON_FOOD_FMCG_HERO_SLIDE_CREATED: 'NON_FOOD_FMCG_HERO_SLIDE_CREATED',
  NON_FOOD_FMCG_HERO_SLIDE_UPDATED: 'NON_FOOD_FMCG_HERO_SLIDE_UPDATED',
  NON_FOOD_FMCG_HERO_SLIDE_DELETED: 'NON_FOOD_FMCG_HERO_SLIDE_DELETED',
  NON_FOOD_FMCG_HERO_SLIDES_REORDERED: 'NON_FOOD_FMCG_HERO_SLIDES_REORDERED',

  NON_FOOD_FMCG_TRUST_LOGO_CREATED: 'NON_FOOD_FMCG_TRUST_LOGO_CREATED',
  NON_FOOD_FMCG_TRUST_LOGO_UPDATED: 'NON_FOOD_FMCG_TRUST_LOGO_UPDATED',
  NON_FOOD_FMCG_TRUST_LOGO_DELETED: 'NON_FOOD_FMCG_TRUST_LOGO_DELETED',
  NON_FOOD_FMCG_TRUST_LOGOS_REORDERED: 'NON_FOOD_FMCG_TRUST_LOGOS_REORDERED',

  NON_FOOD_FMCG_TRUST_STAT_CREATED: 'NON_FOOD_FMCG_TRUST_STAT_CREATED',
  NON_FOOD_FMCG_TRUST_STAT_UPDATED: 'NON_FOOD_FMCG_TRUST_STAT_UPDATED',
  NON_FOOD_FMCG_TRUST_STAT_DELETED: 'NON_FOOD_FMCG_TRUST_STAT_DELETED',
  NON_FOOD_FMCG_TRUST_STATS_REORDERED: 'NON_FOOD_FMCG_TRUST_STATS_REORDERED',

  NON_FOOD_FMCG_PLATFORM_TILE_CREATED: 'NON_FOOD_FMCG_PLATFORM_TILE_CREATED',
  NON_FOOD_FMCG_PLATFORM_TILE_UPDATED: 'NON_FOOD_FMCG_PLATFORM_TILE_UPDATED',
  NON_FOOD_FMCG_PLATFORM_TILE_DELETED: 'NON_FOOD_FMCG_PLATFORM_TILE_DELETED',
  NON_FOOD_FMCG_PLATFORM_TILES_REORDERED: 'NON_FOOD_FMCG_PLATFORM_TILES_REORDERED',

  NON_FOOD_FMCG_FAQ_ENTRY_CREATED: 'NON_FOOD_FMCG_FAQ_ENTRY_CREATED',
  NON_FOOD_FMCG_FAQ_ENTRY_UPDATED: 'NON_FOOD_FMCG_FAQ_ENTRY_UPDATED',
  NON_FOOD_FMCG_FAQ_ENTRY_DELETED: 'NON_FOOD_FMCG_FAQ_ENTRY_DELETED',
  NON_FOOD_FMCG_FAQ_ENTRIES_REORDERED: 'NON_FOOD_FMCG_FAQ_ENTRIES_REORDERED',

  NON_FOOD_FMCG_CAPABILITY_CARD_CREATED: 'NON_FOOD_FMCG_CAPABILITY_CARD_CREATED',
  NON_FOOD_FMCG_CAPABILITY_CARD_UPDATED: 'NON_FOOD_FMCG_CAPABILITY_CARD_UPDATED',
  NON_FOOD_FMCG_CAPABILITY_CARD_DELETED: 'NON_FOOD_FMCG_CAPABILITY_CARD_DELETED',
  NON_FOOD_FMCG_CAPABILITY_CARDS_REORDERED: 'NON_FOOD_FMCG_CAPABILITY_CARDS_REORDERED',

  NON_FOOD_FMCG_BENEFIT_ITEM_CREATED: 'NON_FOOD_FMCG_BENEFIT_ITEM_CREATED',
  NON_FOOD_FMCG_BENEFIT_ITEM_UPDATED: 'NON_FOOD_FMCG_BENEFIT_ITEM_UPDATED',
  NON_FOOD_FMCG_BENEFIT_ITEM_DELETED: 'NON_FOOD_FMCG_BENEFIT_ITEM_DELETED',
  NON_FOOD_FMCG_BENEFIT_ITEMS_REORDERED: 'NON_FOOD_FMCG_BENEFIT_ITEMS_REORDERED',

  NON_FOOD_FMCG_COVERAGE_ITEM_CREATED: 'NON_FOOD_FMCG_COVERAGE_ITEM_CREATED',
  NON_FOOD_FMCG_COVERAGE_ITEM_UPDATED: 'NON_FOOD_FMCG_COVERAGE_ITEM_UPDATED',
  NON_FOOD_FMCG_COVERAGE_ITEM_DELETED: 'NON_FOOD_FMCG_COVERAGE_ITEM_DELETED',
  NON_FOOD_FMCG_COVERAGE_ITEMS_REORDERED: 'NON_FOOD_FMCG_COVERAGE_ITEMS_REORDERED',

  NON_FOOD_FMCG_CTA_SECTION_UPDATED: 'NON_FOOD_FMCG_CTA_SECTION_UPDATED',
  NON_FOOD_FMCG_COVERAGE_PANEL_UPDATED: 'NON_FOOD_FMCG_COVERAGE_PANEL_UPDATED',

  DAIRY_HERO_SLIDE_CREATED: 'DAIRY_HERO_SLIDE_CREATED',
  DAIRY_HERO_SLIDE_UPDATED: 'DAIRY_HERO_SLIDE_UPDATED',
  DAIRY_HERO_SLIDE_DELETED: 'DAIRY_HERO_SLIDE_DELETED',
  DAIRY_HERO_SLIDES_REORDERED: 'DAIRY_HERO_SLIDES_REORDERED',

  DAIRY_TRUST_LOGO_CREATED: 'DAIRY_TRUST_LOGO_CREATED',
  DAIRY_TRUST_LOGO_UPDATED: 'DAIRY_TRUST_LOGO_UPDATED',
  DAIRY_TRUST_LOGO_DELETED: 'DAIRY_TRUST_LOGO_DELETED',
  DAIRY_TRUST_LOGOS_REORDERED: 'DAIRY_TRUST_LOGOS_REORDERED',

  DAIRY_TRUST_STAT_CREATED: 'DAIRY_TRUST_STAT_CREATED',
  DAIRY_TRUST_STAT_UPDATED: 'DAIRY_TRUST_STAT_UPDATED',
  DAIRY_TRUST_STAT_DELETED: 'DAIRY_TRUST_STAT_DELETED',
  DAIRY_TRUST_STATS_REORDERED: 'DAIRY_TRUST_STATS_REORDERED',

  DAIRY_CAPABILITY_CARD_CREATED: 'DAIRY_CAPABILITY_CARD_CREATED',
  DAIRY_CAPABILITY_CARD_UPDATED: 'DAIRY_CAPABILITY_CARD_UPDATED',
  DAIRY_CAPABILITY_CARD_DELETED: 'DAIRY_CAPABILITY_CARD_DELETED',
  DAIRY_CAPABILITY_CARDS_REORDERED: 'DAIRY_CAPABILITY_CARDS_REORDERED',

  DAIRY_PLATFORM_TILE_CREATED: 'DAIRY_PLATFORM_TILE_CREATED',
  DAIRY_PLATFORM_TILE_UPDATED: 'DAIRY_PLATFORM_TILE_UPDATED',
  DAIRY_PLATFORM_TILE_DELETED: 'DAIRY_PLATFORM_TILE_DELETED',
  DAIRY_PLATFORM_TILES_REORDERED: 'DAIRY_PLATFORM_TILES_REORDERED',

  DAIRY_BENEFIT_ITEM_CREATED: 'DAIRY_BENEFIT_ITEM_CREATED',
  DAIRY_BENEFIT_ITEM_UPDATED: 'DAIRY_BENEFIT_ITEM_UPDATED',
  DAIRY_BENEFIT_ITEM_DELETED: 'DAIRY_BENEFIT_ITEM_DELETED',
  DAIRY_BENEFIT_ITEMS_REORDERED: 'DAIRY_BENEFIT_ITEMS_REORDERED',

  DAIRY_COVERAGE_ITEM_CREATED: 'DAIRY_COVERAGE_ITEM_CREATED',
  DAIRY_COVERAGE_ITEM_UPDATED: 'DAIRY_COVERAGE_ITEM_UPDATED',
  DAIRY_COVERAGE_ITEM_DELETED: 'DAIRY_COVERAGE_ITEM_DELETED',
  DAIRY_COVERAGE_ITEMS_REORDERED: 'DAIRY_COVERAGE_ITEMS_REORDERED',

  DAIRY_FAQ_ENTRY_CREATED: 'DAIRY_FAQ_ENTRY_CREATED',
  DAIRY_FAQ_ENTRY_UPDATED: 'DAIRY_FAQ_ENTRY_UPDATED',
  DAIRY_FAQ_ENTRY_DELETED: 'DAIRY_FAQ_ENTRY_DELETED',
  DAIRY_FAQ_ENTRIES_REORDERED: 'DAIRY_FAQ_ENTRIES_REORDERED',

  DAIRY_CTA_SECTION_UPDATED: 'DAIRY_CTA_SECTION_UPDATED',
  DAIRY_CAPABILITIES_PANEL_UPDATED: 'DAIRY_CAPABILITIES_PANEL_UPDATED',
  DAIRY_BENEFITS_PANEL_UPDATED: 'DAIRY_BENEFITS_PANEL_UPDATED',

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
  /*
   * Twelve was right for a prose grid, where each row is four paragraphs. A
   * rating grid is one line per row, and the POS page's ships twelve already
   * - the old cap left an editor unable to add one on day one. Sixteen keeps
   * a prose grid comfortable and gives a rating grid somewhere to grow.
   */
  MAX_COMPARISON_ROWS: 16,

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
  MAX_POS_PROOF_LOGOS: 24,
  /*
   * Four, not the FMS page's four-by-chance: this strip is a single divided
   * row, and a fifth figure would either overflow it or force a second row
   * with one card in it.
   */
  MAX_POS_PROOF_STATS: 4,
  /*
   * Twelve, against the ten the page ships. The grid is three columns, so
   * twelve is four whole rows - a cap that lands on a ragged half-row would
   * be inviting an editor to make the section look unfinished.
   */
  MAX_POS_RECOGNITION_CATEGORIES: 12,
  /*
   * Ten, as on the other pages. Only one plays at a time - the rest are drafts
   * and previous cuts kept beside it, and past ten that stops being an archive
   * and starts being clutter in a list nobody prunes.
   */
  MAX_POS_VIDEO_ENTRIES: 10,
  /** The row is three cards wide; a fourth already crowds it on a laptop. */
  MAX_POS_GROWTH_TIERS: 4,
  MAX_POS_GROWTH_FEATURES: 12,
  /*
   * The badges flank the shield in two columns, so an even count sits level.
   * Six allows three a side; the page ships four.
   */
  MAX_POS_SECURITY_BADGES: 6,
  MAX_POS_SECURITY_LOGOS: 24,
  MAX_POS_SECURITY_ASSURANCES: 6,
  MAX_POS_OUTCOME_STORIES: 8,

  /** The HREasy page, on the same caps as the POS page's equivalents. */
  MAX_HREASY_HERO_SLIDES: 12,
  MAX_HREASY_FAQ_ENTRIES: 24,
  /*
   * The trust strip is one row of four under the buttons. Six allows a second
   * line of three on a narrow viewport without the row falling apart.
   */
  MAX_HREASY_CTA_TRUST_ITEMS: 6,
  /*
   * The bento scrolls, so the cap is about how long the loop takes to come
   * round rather than what fits on screen. Twelve columns of up to three
   * cards is already a long read at the speed it moves.
   */
  MAX_HREASY_PROOF_CELLS: 12,
  MAX_HREASY_PROOF_TILES: 36,
  /*
   * The lifecycle list down the left of the capabilities section. Seven
   * stages today; past a dozen the column runs taller than the panel beside
   * it and the section stops reading as one screen.
   */
  MAX_HREASY_CAPABILITY_MODULES: 12,
  /*
   * The card grid further down the page. Four across, so twelve is three full
   * rows - past that the grid stops reading as a summary of the lifecycle and
   * starts being the feature list the section exists to avoid.
   */
  MAX_HREASY_LIFECYCLE_CARDS: 12,
  /*
   * The pricing row. Three cards today, and the grid is three across - a
   * fourth already wraps, and a fifth stops being a comparison a visitor can
   * hold in their head.
   */
  MAX_HREASY_PACKAGE_TIERS: 4,
  MAX_HREASY_PACKAGE_FEATURES: 16,
  MAX_HREASY_OUTCOME_STORIES: 8,
  /*
   * The dark panel draws its small figures in a row of three, so a fourth
   * would wrap under the rule and break the card's proportions.
   */
  MAX_HREASY_OUTCOME_STATS: 3,

  /** The WMS page, on the same caps as the HREasy page's equivalents. */
  MAX_WMS_HERO_SLIDES: 12,
  MAX_WMS_FAQ_ENTRIES: 24,
  /*
   * The trust strip is one row of four under the buttons. Six allows a second
   * line of three on a narrow viewport without the row falling apart.
   */
  MAX_WMS_CTA_TRUST_ITEMS: 6,
  /*
   * The proof row is three columns wide on a desktop grid, so a fourth card
   * wraps onto a line of its own and the row stops reading as one strip.
   */
  MAX_WMS_PROOF_CARDS: 4,
  /*
   * How many images one card flips through. Three today at 5.5 seconds each;
   * past eight the loop takes longer to come round than a visitor stays.
   */
  MAX_WMS_PROOF_SLIDES: 8,
  /*
   * The warehouse-type map. Seven cards today, laid out four across and then
   * three. Twelve is three full rows - past that the grid stops being a list
   * a visitor scans for their own operation and becomes one they read.
   */
  MAX_WMS_RECOGNITION_CARDS: 12,
  /*
   * The capability stack. Seven bands today, and the subtext above them says
   * "Seven connected capabilities" - so the practical ceiling is whatever an
   * editor is willing to rewrite that line for. Twelve bands is already a
   * long scroll before the FAQ.
   */
  MAX_WMS_CAPABILITY_MODULES: 12,
  /*
   * The customer-outcomes row. Five cards today, and the grid is five across
   * on a desktop - a sixth wraps onto a line of its own and the row stops
   * reading as one strip. Ten is two full rows for anyone who wants them.
   */
  MAX_WMS_OUTCOME_CARDS: 10,

  /** The Vendor Portal page, on the same caps as its WMS equivalents. */
  MAX_VMS_HERO_SLIDES: 12,
  MAX_VMS_FAQ_ENTRIES: 24,
  /*
   * The proof bento. Five tiles today across two rows of twelve columns.
   * Eight is four rows at the narrowest span the grid allows, which is past
   * the point the strip reads as one glance.
   */
  MAX_VMS_PROOF_TILES: 8,
  /*
   * The capability carousel. Seven cards today; it scrolls, so the ceiling is
   * patience rather than layout - twelve is already a long sideways trip.
   */
  MAX_VMS_CAPABILITY_CARDS: 12,
  /*
   * The outcome showcase's tab strip. Three today, stacked beside the player;
   * past six the strip is taller than the video it switches.
   */
  MAX_VMS_OUTCOME_VIDEOS: 6,
  /** The Engineering & Manufacturing industry page, on the POS page's caps. */
  MAX_ENGINEERING_HERO_SLIDES: 12,
  // The trust section's marquee, on the FMS proof strip's cap. The cards sit in
  // a three-column row, and a fourth would wrap onto a row of its own.
  MAX_ENGINEERING_TRUST_LOGOS: 24,
  MAX_ENGINEERING_TRUST_CARDS: 3,
  // The core capabilities artwork draws eight cards, one per capability - a
  // ninth would have nowhere to go on it.
  MAX_ENGINEERING_CAPABILITIES: 8,
  // The connected platform section's workflow column. It stacks, so the cap is
  // about the column staying level with the illustration beside it, not fit.
  MAX_ENGINEERING_PLATFORM_WORKFLOWS: 16,
  // The industry coverage grid is four across, so four full rows.
  MAX_ENGINEERING_COVERAGE_CATEGORIES: 16,
  // The FAQ, on the POS page's cap.
  MAX_ENGINEERING_FAQ_ENTRIES: 24,
  /** The Beverages & Juices industry page, on the Engineering page's caps. */
  MAX_BEVERAGE_HERO_SLIDES: 12,
  MAX_BEVERAGE_TRUST_LOGOS: 24,
  // The stat card turns over one figure at a time, with a progress dot for
  // each; past eight the dots stop reading as a count and the cycle is long.
  MAX_BEVERAGE_TRUST_STATS: 8,
  // The core capabilities are a vertical tab list beside the screenshot; past
  // a dozen the list runs well below the frame it controls.
  MAX_BEVERAGE_CAPABILITIES: 12,
  // The connected platform grid is five across on desktop, so four full rows.
  MAX_BEVERAGE_PLATFORM_WORKFLOWS: 20,
  // The industry coverage grid is four across, so five full rows.
  MAX_BEVERAGE_COVERAGE_CATEGORIES: 20,
  // The FAQ, on the Engineering page's cap.
  MAX_BEVERAGE_FAQ_ENTRIES: 24,
  /** The Spices & Agro Processing industry page, on the other industry pages' caps. */
  MAX_SPICES_AGRO_HERO_SLIDES: 12,
  MAX_SPICES_AGRO_TRUST_LOGOS: 24,
  // The core capabilities grid is four across on wide screens, with hairlines
  // between the rows; past three rows the panel outgrows its background.
  MAX_SPICES_AGRO_CAPABILITIES: 12,
  // The connected platform groups sit six across on wide screens, so two rows.
  MAX_SPICES_AGRO_PLATFORM_GROUPS: 12,
  // The coverage tiles sit six across on wide screens, so three full rows.
  MAX_SPICES_AGRO_COVERAGE_CATEGORIES: 18,
  // The FAQ, on the other industry pages' cap.
  MAX_SPICES_AGRO_FAQ_ENTRIES: 24,
  /** The QSR & Franchise F&B industry page, on the other industry pages' caps. */
  MAX_QSR_FRANCHISE_HERO_SLIDES: 12,
  MAX_QSR_FRANCHISE_TRUST_LOGOS: 24,
  /** The mosaic has three places for a stat tile. */
  MAX_QSR_FRANCHISE_TRUST_STATS: 3,
  MAX_QSR_FRANCHISE_CAPABILITIES: 12,
  MAX_QSR_FRANCHISE_PLATFORM_WORKFLOWS: 20,
  MAX_QSR_FRANCHISE_COVERAGE_CATEGORIES: 24,
  MAX_QSR_FRANCHISE_FAQ_ENTRIES: 24,
  /** The Why UpWon page's industry trust row. */
  MAX_WHY_UPWON_INDUSTRIES: 21,
  MAX_WHY_UPWON_TESTIMONIALS: 12,
  MAX_WHY_UPWON_CLIENT_LOGOS: 24,
  /** The product proof artwork draws four connectors, one per callout. */
  MAX_WHY_UPWON_PROOF_CALLOUTS: 4,
  /** The proof & results section has three visuals, one per card. */
  MAX_WHY_UPWON_RESULTS: 3,
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

  // The footer's contact lines stack in a column under the brand block, beside
  // four link columns they have to stay level with. The site ships four; six
  // leaves room for a second phone number and a second email before that
  // column outgrows its neighbours and the footer stops being a footer.
  MAX_SOCIAL_CONTACT_LINES: 6,
  // The social icons are one row of small squares under those lines. The site
  // ships two; eight covers every network a B2B company is realistically on,
  // and past that the row stops being a set of icons and becomes a directory.
  MAX_SOCIAL_LINKS: 8,

  // The blog's topic chips sit in one centred, wrapping row above the post
  // grid, next to an "All" chip. The site ships six; twelve is two full rows
  // on a laptop, and past that the row stops being a filter a reader scans and
  // becomes a tag cloud - and the reorder list stops being usable.
  MAX_BLOG_CATEGORIES: 12,
  /*
   * Posts are not paged: the admin list, the public index and the category
   * counts on the chips all read the whole set, the way every other CMS list
   * in this API does. That is only sound while the set is bounded, so it is.
   * At two deep-reads a month - the cadence the page's own hero promises -
   * five hundred posts is twenty years of publishing; a public index of that
   * many summaries is still a few hundred kilobytes. If the blog ever gets
   * near it, the answer is paging these reads, not raising this number.
   */
  MAX_BLOG_POSTS: 500,
  /** The Bakery & Confectionery industry page. */
  MAX_BAKERY_HERO_SLIDES: 12,
  // The logo row is a six-up grid; two full rows is as far as it should go.
  MAX_BAKERY_TRUST_LOGOS: 12,
  // The figures strip is a five-up grid on desktop - a sixth wraps under five.
  MAX_BAKERY_TRUST_STATS: 5,
  // Three tiles on the first row and two under them; two such rows at most.
  MAX_BAKERY_PLATFORM_TILES: 10,
  // One diagram is live; the rest are replacements being prepared.
  MAX_BAKERY_HELP_VISUALS: 10,
  MAX_BAKERY_FAQ_ENTRIES: 24,
  // The marks under the buttons are a four-up grid; a fifth wraps.
  MAX_BAKERY_CTA_FEATURES: 4,

  /** The FMCG Distribution industry page. */
  MAX_FMCG_HERO_SLIDES: 12,
  // The logos scroll as a marquee, so the cap is how many a visitor will watch
  // go by rather than what fits - the same ceiling as the home page's strip.
  MAX_FMCG_TRUST_LOGOS: 24,
  // The figures are a three-up grid; two full rows at most.
  MAX_FMCG_TRUST_STATS: 6,
  MAX_FMCG_PLATFORM_TILES: 10,
  MAX_FMCG_FAQ_ENTRIES: 24,

  /** The Sweets & Namkeen industry page. */
  MAX_SWEETS_HERO_SLIDES: 12,
  // A scrolling marquee, on the same ceiling as the FMCG page's.
  MAX_SWEETS_TRUST_LOGOS: 24,
  // The figures are a six-up row on desktop; a seventh wraps under six.
  MAX_SWEETS_TRUST_STATS: 6,
  MAX_SWEETS_PLATFORM_TILES: 10,
  MAX_SWEETS_FAQ_ENTRIES: 24,

  /** The Food Processing industry page. */
  MAX_FOOD_PROCESSING_HERO_SLIDES: 12,
  MAX_FOOD_PROCESSING_TRUST_LOGOS: 24,
  // The figures sit three-up beside the photograph; a fourth would wrap.
  MAX_FOOD_PROCESSING_TRUST_STATS: 3,
  MAX_FOOD_PROCESSING_PLATFORM_TILES: 10,
  // A wrapping six-up grid; two dozen is four full rows.
  MAX_FOOD_PROCESSING_COVERAGE_ITEMS: 24,
  MAX_FOOD_PROCESSING_FAQ_ENTRIES: 24,

  /** The Non-Food FMCG industry page. */
  MAX_NON_FOOD_FMCG_HERO_SLIDES: 12,
  MAX_NON_FOOD_FMCG_TRUST_LOGOS: 24,
  // A six-up row on desktop; a seventh wraps.
  MAX_NON_FOOD_FMCG_TRUST_STATS: 6,
  // Four-up then centred; three rows at most.
  MAX_NON_FOOD_FMCG_CAPABILITY_CARDS: 12,
  MAX_NON_FOOD_FMCG_PLATFORM_TILES: 10,
  // Three-up beside the copy; past a dozen it outruns the artwork.
  MAX_NON_FOOD_FMCG_BENEFIT_ITEMS: 12,
  // A four-up grid; two dozen is six full rows.
  MAX_NON_FOOD_FMCG_COVERAGE_ITEMS: 24,
  MAX_NON_FOOD_FMCG_FAQ_ENTRIES: 24,

  /** The Dairy & Ice Cream industry page. */
  MAX_DAIRY_HERO_SLIDES: 12,
  MAX_DAIRY_TRUST_LOGOS: 24,
  // The card rotates through the figures one at a time, each with its photo.
  MAX_DAIRY_TRUST_STATS: 6,
  // Numbered two-up beside the collage; past a dozen it outruns the artwork.
  MAX_DAIRY_CAPABILITY_CARDS: 12,
  MAX_DAIRY_PLATFORM_TILES: 10,
  // Numbered two-up beside the image; past a dozen it outruns the artwork.
  MAX_DAIRY_BENEFIT_ITEMS: 12,
  // One horizontally scrolling row; two dozen is already a long scroll.
  MAX_DAIRY_COVERAGE_ITEMS: 24,
  MAX_DAIRY_FAQ_ENTRIES: 24,
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
 * banner - and the Blog's post images, which are the card, the featured card
 * and the article's full-bleed header all at once.
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
  'pos_proof_logo',
  'pos_video',
  'pos_security_shield',
  'pos_security_logo',
  'pos_security_illustration',
  'pos_outcome_logo',
  'pos_outcome_photo',
  'hreasy_hero_slide',
  'hreasy_cta_banner',
  'hreasy_proof_logo',
  /*
   * The last three were missed when those sections were built, the same way
   * the WMS slots below were: the admin panel tags an upload with the slot's
   * entity type, and every CMS image slot refuses a file whose type is not on
   * this list - so the upload succeeded and the save that attached it failed
   * with FILE_NOT_PUBLIC.
   */
  'hreasy_capability_module',
  'hreasy_lifecycle_card',
  'hreasy_outcome_logo',
  /*
   * The WMS page's five image slots.
   *
   * The first three were missed when those sections were built, which made
   * their uploads unusable rather than merely unserved: the admin panel tags
   * an upload with the slot's entity type, and every CMS image slot refuses a
   * file whose type is not on this list - so saving a hero slide, a proof
   * slide or the closing band's artwork failed with FILE_NOT_PUBLIC even
   * though the upload itself had succeeded.
   *
   * 'wms_cta_banner' covers both halves of the closing band; that form sends
   * one type for the desktop photograph and its phone crop alike.
   */
  'wms_hero_slide',
  'wms_proof_slide',
  'wms_cta_banner',
  'wms_recognition_card',
  'wms_capability_panel',
  'vms_hero_slide',
  'vms_proof_image',
  'vms_capability_image',
  'vms_outcome_video',
  'vms_outcome_poster',
  'vms_cta_image',
  'engineering_hero_slide',
  'engineering_trust_logo',
  'engineering_platform_image',
  'engineering_coverage_image',
  'engineering_cta_image',
  'beverage_hero_slide',
  'beverage_trust_logo',
  'beverage_trust_stat',
  'beverage_capabilities_image',
  'beverage_capability',
  'beverage_platform_image',
  'beverage_cta_image',
  'spices_agro_hero_slide',
  'spices_agro_trust_logo',
  'spices_agro_trust_panel',
  'spices_agro_capabilities_image',
  'spices_agro_platform_image',
  'spices_agro_coverage_category',
  'spices_agro_cta_image',
  'qsr_franchise_hero_slide',
  'qsr_franchise_trust_logo',
  'qsr_franchise_trust_panel',
  'qsr_franchise_capabilities_panel',
  'qsr_franchise_platform_image',
  'qsr_franchise_coverage_category',
  'qsr_franchise_cta_image',
  'why_upwon_hero_image',
  'why_upwon_industry',
  'why_upwon_testimonial',
  'why_upwon_client_logo',
  'why_upwon_proof_panel',
  'why_upwon_results_panel',
  'why_upwon_cta_image',
  'fms_integration_logo',
  'fms_integration_centre_logo',
  'bakery_hero_slide',
  'bakery_trust_logo',
  'bakery_trust_stat_icon',
  'bakery_platform_icon',
  'bakery_help_visual',
  'bakery_cta_image',
  'fmcg_hero_slide',
  'fmcg_trust_logo',
  'fmcg_platform_icon',
  'fmcg_cta_image',
  'sweets_hero_slide',
  'sweets_trust_logo',
  'sweets_platform_icon',
  'sweets_cta_image',
  'food_processing_hero_slide',
  'food_processing_trust_logo',
  'food_processing_trust_panel',
  'food_processing_platform_icon',
  'food_processing_coverage_image',
  'food_processing_cta_image',
  'non_food_fmcg_hero_slide',
  'non_food_fmcg_trust_logo',
  'non_food_fmcg_capability_image',
  'non_food_fmcg_platform_icon',
  'non_food_fmcg_coverage_panel',
  'non_food_fmcg_cta_image',
  'dairy_hero_slide',
  'dairy_trust_logo',
  'dairy_trust_stat_image',
  'dairy_capabilities_panel',
  'dairy_platform_icon',
  'dairy_benefits_panel',
  'dairy_coverage_image',
  'dairy_cta_image',
  'sfa_video',
  'comparison_column_logo',
  'erp_outcome_image',
  'insider_hero_slide',
  'insider_story',
  'insider_feature',
  'contact_hero',
  'partner_program_hero',
  'about_hero',
  'about_founder',
  'about_team_member',
  'about_cta',
  'blog_post_image',
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
  /*
   * The HREasy page. Keyed by the product id rather than its URL slug, which
   * is 'hrms' - they differ on this one product, and every other name in the
   * codebase follows the id.
   */
  /*
   * 'capabilities' heads the module showcase - the nav list whose panel is one
   * composite image. 'lifecycle' heads the card grid below it. They list the
   * same seven stages and are two different sections.
   */
  hreasy: [
    'proof',
    'capabilities',
    'lifecycle',
    'packages',
    'alternatives',
    'outcomes',
    'faq',
    'cta',
  ],
  pos: [
    'proof',
    'recognition',
    'video',
    'packages',
    'establishers',
    'alternatives',
    'outcomes',
    'faq',
    'cta',
  ],
  /*
   * The WMS page. The hero is absent on purpose, as on every other product
   * page: its slides each carry their own eyebrow, headline and subhead.
   *
   * Only the sections built so far - the rest of the page is still static,
   * and each key arrives with its section.
   */
  wms: ['proof', 'recognition', 'capabilities', 'outcomes', 'faq', 'cta'],
  /*
   * The Vendor Portal page. The hero is absent on purpose, as on every other
   * product page: its slides each carry their own eyebrow, headline and
   * subhead.
   */
  vms: ['proof', 'capabilities', 'outcomes', 'faq', 'cta'],
  /*
   * The first industry page. The hero is absent for the same reason it is
   * everywhere else - each slide carries its own copy.
   */
  bakery: ['trust', 'platform', 'helps', 'faq', 'cta'],
  // The second industry page - the same sections less How UpWON Helps.
  fmcg: ['trust', 'platform', 'faq', 'cta'],
  // The third industry page - the same sections as FMCG Distribution.
  sweets: ['trust', 'platform', 'faq', 'cta'],
  // The fourth and fifth industry pages, which add the coverage grid - and on
  // Non-Food FMCG the capability cards and the benefits grid.
  'food-processing': ['trust', 'platform', 'coverage', 'faq', 'cta'],
  'non-food-fmcg': ['trust', 'capabilities', 'platform', 'benefits', 'coverage', 'faq', 'cta'],
  dairy: ['trust', 'capabilities', 'platform', 'benefits', 'coverage', 'faq', 'cta'],
  /*
   * The first industry page. The hero is absent here too: its slides each
   * carry their own copy.
   */
  'engineering-manufacturing': ['trust', 'capabilities', 'platform', 'coverage', 'faq', 'cta'],
  /*
   * The second industry page, built section by section. The hero is absent
   * here too: its slides each carry their own copy.
   */
  beverage: ['trust', 'capabilities', 'platform', 'coverage', 'faq', 'cta'],
  /* The third industry page, built section by section. */
  'spices-agro': ['trust', 'capabilities', 'platform', 'coverage', 'faq', 'cta'],
  /* The fourth industry page, built section by section. */
  'qsr-franchise': ['trust', 'capabilities', 'platform', 'coverage', 'faq', 'cta'],
  /*
   * The Why UpWon page, built section by section. Unlike the industry pages its
   * hero is one record rather than a slider, so its copy lives here too.
   */
  'why-upwon': ['hero', 'industries', 'testimonials', 'proof', 'outcomes', 'cta'],
} as const;

export const PAGE_KEYS = Object.keys(PAGE_SECTION_KEYS) as Array<keyof typeof PAGE_SECTION_KEYS>;

export type PageKey = (typeof PAGE_KEYS)[number];

/** Every section key any page uses, for the one CHECK the table carries. */
export type SectionKey = (typeof PAGE_SECTION_KEYS)[PageKey][number];

export const isSectionOfPage = (pageKey: string, sectionKey: string): boolean =>
  (PAGE_KEYS as readonly string[]).includes(pageKey) &&
  (PAGE_SECTION_KEYS[pageKey as PageKey] as readonly string[]).includes(sectionKey);


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
