import { PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import { closePool, withTransaction } from '../../config/database';
import { env } from '../../config/env';
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLE_DESCRIPTIONS,
  SETTING_KEYS,
  SYSTEM_ROLES,
  SystemRole,
} from '../../config/constants';
import { logger } from '../../core/utils/logger';
import {
  INSIDER_FEATURE_SECTION,
  INSIDER_HERO_SLIDES,
  INSIDER_ISSUES,
} from './insider-page.data';
import {
  CONTACT_DETAILS_SECTION,
  CONTACT_FORM_SECTION,
  CONTACT_HERO_SECTION,
} from './contact-page.data';
import { CAREER_VACANCIES } from './careers.data';
import { PARTNER_PROGRAM_HERO } from './partner-program.data';
import {
  ABOUT_CTA,
  ABOUT_FOUNDER_NOTE,
  ABOUT_HERO,
  ABOUT_NUMBER_STATS,
  ABOUT_NUMBERS_SECTION,
  ABOUT_TEAM_MEMBERS,
  ABOUT_TEAM_SECTION,
} from './about-page.data';

/**
 * Idempotent seed. Safe to run repeatedly - every statement is an upsert or a
 * conditional insert, so re-running never duplicates or clobbers live data.
 */

// ── permissions ───────────────────────────────────────────────────────────
async function seedPermissions(client: PoolClient): Promise<number> {
  // Read from the constants catalogue, so a key checked in code always exists
  // in the database and vice versa.
  const rows = ALL_PERMISSION_KEYS.map((key) => {
    const [module, action] = key.split('.');
    return { key, module, action, description: PERMISSION_DESCRIPTIONS[key] };
  });

  const result = await client.query(
    `
    INSERT INTO permissions (key, module, action, description)
    SELECT unnested.key, unnested.module, unnested.action, unnested.description
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS unnested(key, module, action, description)
    ON CONFLICT (key) DO UPDATE
      SET description = EXCLUDED.description
    `,
    [
      rows.map((row) => row.key),
      rows.map((row) => row.module),
      rows.map((row) => row.action),
      rows.map((row) => row.description),
    ],
  );

  return result.rowCount ?? 0;
}

// ── roles ─────────────────────────────────────────────────────────────────
async function seedRoles(client: PoolClient): Promise<void> {
  const roleNames = Object.values(SYSTEM_ROLES) as SystemRole[];

  for (const name of roleNames) {
    await client.query(
      `
      INSERT INTO roles (name, description, is_system_role)
      VALUES ($1, $2, true)
      ON CONFLICT (name) DO UPDATE
        SET description = EXCLUDED.description, is_system_role = true
      `,
      [name, ROLE_DESCRIPTIONS[name]],
    );
  }

  // ADMIN is deliberately absent from DEFAULT_ROLE_PERMISSIONS: its
  // access is a short-circuit in the authorization middleware, not a set of
  // rows. Granting them here would create a class of bug where deleting a row
  // silently downgrades the break-glass role.
  for (const [roleName, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    await client.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
        FROM roles r
        JOIN permissions p ON p.key = ANY($2::text[])
       WHERE r.name = $1
      ON CONFLICT (role_id, permission_id) DO NOTHING
      `,
      [roleName, permissionKeys],
    );
  }
}

// ── super admin ───────────────────────────────────────────────────────────
async function seedRootAdmin(client: PoolClient): Promise<{ created: boolean; email: string }> {
  const email = (process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@upwon.local')
    .trim()
    .toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const firstName = process.env.SEED_SUPER_ADMIN_FIRST_NAME ?? 'Super';
  const lastName = process.env.SEED_SUPER_ADMIN_LAST_NAME ?? 'Admin';

  if (!password) {
    throw new Error(
      'SEED_SUPER_ADMIN_PASSWORD is required. Set it in .env before seeding.',
    );
  }
  if (password.length < 12) {
    throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const existing = await client.query<{ id: string }>(
    'SELECT id FROM admins WHERE email = $1 AND deleted_at IS NULL',
    [email],
  );

  if (existing.rows.length > 0) {
    // Never overwrite an existing admin's password from a seed script.
    await client.query(
      `
      INSERT INTO admin_roles (admin_id, role_id)
      SELECT $1, r.id FROM roles r WHERE r.name = $2
      ON CONFLICT (admin_id, role_id) DO NOTHING
      `,
      [existing.rows[0].id, SYSTEM_ROLES.ADMIN],
    );
    return { created: false, email };
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);

  const inserted = await client.query<{ id: string }>(
    `
    INSERT INTO admins (first_name, last_name, email, password_hash, status)
    VALUES ($1, $2, $3, $4, 'ACTIVE')
    RETURNING id
    `,
    [firstName, lastName, email, passwordHash],
  );

  await client.query(
    `
    INSERT INTO admin_roles (admin_id, role_id)
    SELECT $1, r.id FROM roles r WHERE r.name = $2
    `,
    [inserted.rows[0].id, SYSTEM_ROLES.ADMIN],
  );

  return { created: true, email };
}

// ── settings ──────────────────────────────────────────────────────────────
async function seedSettings(client: PoolClient): Promise<void> {
  const defaults: Array<{
    key: string;
    value: unknown;
    description: string;
    isSensitive: boolean;
  }> = [
    {
      key: SETTING_KEYS.PLATFORM_NAME,
      value: 'Upwon',
      description: 'Display name of the platform',
      isSensitive: false,
    },
    {
      key: SETTING_KEYS.SUPPORT_EMAIL,
      value: 'support@upwon.local',
      description: 'Address shown to customers for support enquiries',
      isSensitive: false,
    },
    {
      key: SETTING_KEYS.MAINTENANCE_MODE,
      value: { enabled: false, message: null },
      description: 'Platform-wide maintenance banner and gate',
      isSensitive: false,
    },
    {
      key: SETTING_KEYS.DEFAULT_SUBSCRIPTION_PLAN,
      value: null,
      description: 'Plan code assigned to new organizations by default',
      isSensitive: false,
    },
    {
      key: SETTING_KEYS.SECURITY_SETTINGS,
      value: {
        passwordMinLength: 12,
        sessionIdleMinutes: 60,
        maxLoginAttempts: 5,
        requireMfa: false,
      },
      description: 'Security policy knobs. ADMIN only.',
      isSensitive: true,
    },
  ];

  for (const setting of defaults) {
    // DO NOTHING, not DO UPDATE: re-running the seed must never revert a value
    // an administrator has deliberately changed.
    await client.query(
      `
      INSERT INTO settings (key, value, description, is_sensitive)
      VALUES ($1, $2::jsonb, $3, $4)
      ON CONFLICT (key) DO NOTHING
      `,
      [setting.key, JSON.stringify(setting.value), setting.description, setting.isSensitive],
    );
  }
}

// ── home page: hero section ───────────────────────────────────────────────
/**
 * The slides the website's HeroSection previously held as a hardcoded array, so
 * the homepage renders identically the moment it starts reading from the API.
 *
 * Headings use the authoring markup from modules/home-page/utils/heading-markup:
 * a newline is a line break, **like this** is the orange accent.
 */
const HERO_SLIDES: Array<{
  eyebrow: string;
  heading: string;
  subtext: string;
  imageUrl: string;
  shine: boolean;
}> = [
  {
    eyebrow: 'Byte Elephant Presents',
    heading:
      'UPWON - The Business Growth Suite for\nAmbitious Food & FMCG Brands **Ready to Scale**.',
    subtext:
      'Built for food manufacturers, FMCG distributors and franchise brands to run production, distribution, HR and finance in one integrated platform.',
    imageUrl:
      'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&w=1280&q=45',
    shine: false,
  },
  {
    eyebrow: 'Built for Franchises',
    heading:
      'The 200th outlet should be as easy to\nrun as the first. Now **run the system** that makes it so.',
    subtext:
      'Open new outlets without operational challenges. One platform handles ordering, kitchens, billing, royalty and Swiggy / Zomato - across every store.',
    imageUrl:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1280&q=45',
    shine: false,
  },
  {
    eyebrow: 'Scale Without Chaos',
    heading:
      'Your 200th outlet should feel like your first.\nNow run the **system that makes** it so.',
    subtext:
      'Open new outlets without opening new headaches. One platform handles ordering, kitchens, billing, royalty and Swiggy / Zomato - across every store.',
    imageUrl:
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1280&q=45',
    shine: false,
  },
  {
    eyebrow: 'One Suite - Seven Platforms',
    heading: 'One suite. Seven platforms.\nYour **entire business** - covered.',
    subtext:
      'ERP, SFA-DMS, FMS, POS, HRMS, WMS and Vendor Portal - choose one platform or deploy the full suite. Same data layer, zero reconciliation.',
    imageUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=45',
    shine: false,
  },
  {
    eyebrow: 'AI-Powered From Day One',
    heading: 'AI Built-In. Smarter From Day One.',
    subtext:
      'Every solution ships with AI at its core - automating workflows, surfacing insights and helping you make faster, smarter decisions from day one.',
    imageUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=45',
    shine: true,
  },
];

async function seedHomeHeroSlides(client: PoolClient): Promise<number> {
  // Seeded only into an empty table. Slides have no natural key to upsert on, so
  // anything else would either duplicate the set or clobber copy an
  // administrator has since edited.
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM home_hero_slides',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO home_hero_slides
      (eyebrow, heading, subtext, image_url, shine, display_order, status)
    SELECT unnested.eyebrow, unnested.heading, unnested.subtext, unnested.image_url,
           unnested.shine, unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::boolean[], $6::int[])
        AS unnested(eyebrow, heading, subtext, image_url, shine, display_order)
    `,
    [
      HERO_SLIDES.map((slide) => slide.eyebrow),
      HERO_SLIDES.map((slide) => slide.heading),
      HERO_SLIDES.map((slide) => slide.subtext),
      HERO_SLIDES.map((slide) => slide.imageUrl),
      HERO_SLIDES.map((slide) => slide.shine),
      HERO_SLIDES.map((_slide, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

// ── insider page ──────────────────────────────────────────────────────────
/*
 * The content the website's Insider (newsletter) page previously held as static
 * data - see insider-page.data.ts for where each part came from. Each section
 * is seeded only into an empty table, for the same reason as the home hero:
 * re-running the seed must never duplicate content or revert an admin's edits.
 */

async function seedInsiderHeroSlides(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM insider_hero_slides',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO insider_hero_slides
      (heading, subtext, image_url, display_order, status)
    SELECT unnested.heading, unnested.subtext, unnested.image_url,
           unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
        AS unnested(heading, subtext, image_url, display_order)
    `,
    [
      INSIDER_HERO_SLIDES.map((slide) => slide.heading),
      INSIDER_HERO_SLIDES.map((slide) => slide.subtext),
      INSIDER_HERO_SLIDES.map((slide) => slide.imageUrl),
      INSIDER_HERO_SLIDES.map((_slide, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

async function seedInsiderIssues(
  client: PoolClient,
): Promise<{ issues: number; stories: number }> {
  // Issues and their stories are one unit: an empty issues table means neither
  // has been authored, and a non-empty one means both belong to an admin now.
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM insider_issues',
  );
  if (Number(existing.rows[0].count) > 0) return { issues: 0, stories: 0 };

  let stories = 0;

  for (const issue of INSIDER_ISSUES) {
    const inserted = await client.query<{ id: string }>(
      `
      INSERT INTO insider_issues (slug, label, issue_number, is_current, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      RETURNING id
      `,
      [issue.slug, issue.label, issue.issueNumber, issue.isCurrent],
    );

    if (issue.stories.length === 0) continue;

    // Bodies travel as JSON text and are cast per row: pg would encode a JS
    // array of arrays as a Postgres array literal, which is not jsonb.
    const result = await client.query(
      `
      INSERT INTO insider_stories
        (issue_id, slug, eyebrow, cta_label, title, blurb, image_url, read_time,
         body, display_order, status)
      SELECT $1::uuid, unnested.slug, unnested.eyebrow, unnested.cta_label, unnested.title,
             unnested.blurb, unnested.image_url, unnested.read_time,
             unnested.body::jsonb, unnested.display_order, 'ACTIVE'
        FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
                    $7::text[], $8::text[], $9::text[], $10::int[])
          AS unnested(slug, eyebrow, cta_label, title, blurb, image_url, read_time,
                      body, display_order)
      `,
      [
        inserted.rows[0].id,
        issue.stories.map((story) => story.slug),
        issue.stories.map((story) => story.eyebrow),
        issue.stories.map((story) => story.ctaLabel),
        issue.stories.map((story) => story.title),
        issue.stories.map((story) => story.blurb),
        issue.stories.map((story) => story.imageUrl),
        issue.stories.map((story) => story.readTime),
        issue.stories.map((story) => JSON.stringify(story.body)),
        issue.stories.map((_story, index) => index),
      ],
    );
    stories += result.rowCount ?? 0;
  }

  return { issues: INSIDER_ISSUES.length, stories };
}

async function seedInsiderFeatureSection(client: PoolClient): Promise<number> {
  // A singleton pinned to id = 1, so DO NOTHING is exactly "only when empty".
  const section = INSIDER_FEATURE_SECTION;
  const result = await client.query(
    `
    INSERT INTO insider_feature_section
      (id, badge, eyebrow, heading, body, bullets, image_url, status)
    VALUES (1, $1, $2, $3, $4, $5::jsonb, $6, 'ACTIVE')
    ON CONFLICT (id) DO NOTHING
    `,
    [
      section.badge,
      section.eyebrow,
      section.heading,
      section.body,
      JSON.stringify(section.bullets),
      section.imageUrl,
    ],
  );

  return result.rowCount ?? 0;
}

// ── contact page ──────────────────────────────────────────────────────────
/*
 * The content the website's /contact page previously held in its own files -
 * see contact-page.data.ts for where each part came from. Every section is a
 * singleton pinned to id = 1, so ON CONFLICT DO NOTHING is exactly "only when
 * it has never been authored": re-running the seed never reverts an admin's
 * edits.
 *
 * The seeded images are the paths the site already ships (image_url), not
 * uploads. An admin replacing one uploads a file and the row switches to
 * image_file_id - the two sources are mutually exclusive by CHECK.
 */

async function seedContactHeroSection(client: PoolClient): Promise<number> {
  const section = CONTACT_HERO_SECTION;
  const result = await client.query(
    `
    INSERT INTO contact_hero_section
      (id, heading, subtext, image_url, mobile_image_url)
    VALUES (1, $1, $2, $3, $4)
    ON CONFLICT (id) DO NOTHING
    `,
    [section.heading, section.subtext, section.imageUrl, section.mobileImageUrl],
  );

  return result.rowCount ?? 0;
}

async function seedContactFormSection(client: PoolClient): Promise<number> {
  const section = CONTACT_FORM_SECTION;
  // The three lists are serialised explicitly: handed a JS array, pg would
  // encode it as a Postgres array literal, which is not valid jsonb.
  const result = await client.query(
    `
    INSERT INTO contact_form_section
      (id, eyebrow, heading, business_types, revenue_ranges, platforms,
       footnote, success_heading, success_body)
    VALUES (1, $1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      section.eyebrow,
      section.heading,
      JSON.stringify(section.businessTypes),
      JSON.stringify(section.revenueRanges),
      JSON.stringify(section.platforms),
      section.footnote,
      section.successHeading,
      section.successBody,
    ],
  );

  return result.rowCount ?? 0;
}

async function seedContactDetailsSection(client: PoolClient): Promise<number> {
  const section = CONTACT_DETAILS_SECTION;
  const result = await client.query(
    `
    INSERT INTO contact_details_section
      (id, offices_title, offices, direct_title, email, phone, whatsapp)
    VALUES (1, $1, $2::jsonb, $3, $4, $5, $6)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      section.officesTitle,
      JSON.stringify(section.offices),
      section.directTitle,
      section.email,
      section.phone,
      section.whatsapp,
    ],
  );

  return result.rowCount ?? 0;
}

// ── careers page ──────────────────────────────────────────────────────────
/*
 * The six roles the website's Careers page held as a hardcoded array - see
 * careers.data.ts for where each field came from and which ones are new.
 *
 * Seeded only into an empty table, for the same reason as the home hero:
 * vacancies have no natural key to upsert on, so anything else would either
 * duplicate the set or clobber a role an administrator has since edited,
 * unpublished or deliberately deleted.
 *
 * No applications are seeded. Every row in career_applications is a real
 * person who really applied, and inventing six of them would put fake names,
 * addresses and phone numbers in front of a recruiter who has no way to tell
 * them from the real thing.
 */
async function seedCareerVacancies(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM career_vacancies',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  // The two lists travel as JSON text and are cast per row: pg would encode a
  // JS array of arrays as a Postgres array literal, which is not jsonb.
  const result = await client.query(
    `
    INSERT INTO career_vacancies
      (title, department, location, work_mode, description,
       requirements, skills, experience, display_order, status)
    SELECT unnested.title, unnested.department, unnested.location, unnested.work_mode,
           unnested.description, unnested.requirements::jsonb, unnested.skills::jsonb,
           unnested.experience, unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                  $6::text[], $7::text[], $8::text[], $9::int[])
        AS unnested(title, department, location, work_mode, description,
                    requirements, skills, experience, display_order)
    `,
    [
      CAREER_VACANCIES.map((vacancy) => vacancy.title),
      CAREER_VACANCIES.map((vacancy) => vacancy.department),
      CAREER_VACANCIES.map((vacancy) => vacancy.location),
      CAREER_VACANCIES.map((vacancy) => vacancy.workMode),
      CAREER_VACANCIES.map((vacancy) => vacancy.description),
      CAREER_VACANCIES.map((vacancy) => JSON.stringify(vacancy.requirements)),
      CAREER_VACANCIES.map((vacancy) => JSON.stringify(vacancy.skills)),
      CAREER_VACANCIES.map((vacancy) => vacancy.experience),
      // The order they appear on the page today.
      CAREER_VACANCIES.map((_vacancy, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

// ── partner program page ──────────────────────────────────────────────────
/*
 * The hero the website's /partners page held as props on its shared <PageHero> -
 * see partner-program.data.ts for where each string came from and why no image
 * and no applications are seeded.
 *
 * A singleton pinned to id = 1, so ON CONFLICT DO NOTHING is exactly "only when
 * it has never been authored": re-running the seed never reverts an admin's
 * edits.
 */
async function seedPartnerProgramHero(client: PoolClient): Promise<number> {
  const section = PARTNER_PROGRAM_HERO;
  const result = await client.query(
    `
    INSERT INTO partner_program_hero (id, eyebrow, heading, subtext)
    VALUES (1, $1, $2, $3)
    ON CONFLICT (id) DO NOTHING
    `,
    [section.eyebrow, section.heading, section.subtext],
  );

  return result.rowCount ?? 0;
}

// ── about page ────────────────────────────────────────────────────────────
/*
 * The five bands of the website's /about page that become editable - see
 * about-page.data.ts for where every string came from, which ones changed shape
 * on the way in, and why no photographs and no discovery calls are seeded.
 *
 * The five sections are singletons pinned to id = 1, so ON CONFLICT DO NOTHING is
 * exactly "only when it has never been authored": re-running the seed never
 * reverts an admin's edits.
 *
 * The two child lists have no natural key to upsert on, so they are seeded only
 * into an empty table, exactly as the home hero slides and the career vacancies
 * are: anything else would either duplicate the set or clobber a person an
 * administrator has since renamed, unpublished or deliberately deleted.
 */

async function seedAboutHeroSection(client: PoolClient): Promise<number> {
  const section = ABOUT_HERO;
  // The backdrop list is serialised explicitly: handed a JS array, pg would
  // encode it as a Postgres array literal, which is not valid jsonb.
  const result = await client.query(
    `
    INSERT INTO about_hero_section (id, eyebrow, heading, subtext, backdrops)
    VALUES (1, $1, $2, $3, $4::jsonb)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      section.eyebrow,
      section.heading,
      section.subtext,
      JSON.stringify(section.backdrops),
    ],
  );

  return result.rowCount ?? 0;
}

async function seedAboutFounderNote(client: PoolClient): Promise<number> {
  const section = ABOUT_FOUNDER_NOTE;
  const result = await client.query(
    `
    INSERT INTO about_founder_note
      (id, founder_name, founder_role, company_line, quote, body)
    VALUES (1, $1, $2, $3, $4, $5)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      section.founderName,
      section.founderRole,
      section.companyLine,
      section.quote,
      section.body,
    ],
  );

  return result.rowCount ?? 0;
}

async function seedAboutTeamSection(client: PoolClient): Promise<number> {
  const section = ABOUT_TEAM_SECTION;
  const result = await client.query(
    `
    INSERT INTO about_team_section (id, eyebrow, heading, subtext)
    VALUES (1, $1, $2, $3)
    ON CONFLICT (id) DO NOTHING
    `,
    [section.eyebrow, section.heading, section.subtext],
  );

  return result.rowCount ?? 0;
}

async function seedAboutTeamMembers(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM about_team_members',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO about_team_members (name, role, meta, display_order, status)
    SELECT unnested.name, unnested.role, unnested.meta, unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
        AS unnested(name, role, meta, display_order)
    `,
    [
      ABOUT_TEAM_MEMBERS.map((member) => member.name),
      ABOUT_TEAM_MEMBERS.map((member) => member.role),
      ABOUT_TEAM_MEMBERS.map((member) => member.meta),
      // The order they appear on the page today.
      ABOUT_TEAM_MEMBERS.map((_member, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

async function seedAboutNumbersSection(client: PoolClient): Promise<number> {
  const section = ABOUT_NUMBERS_SECTION;
  const result = await client.query(
    `
    INSERT INTO about_numbers_section (id, eyebrow, heading, subtext)
    VALUES (1, $1, $2, $3)
    ON CONFLICT (id) DO NOTHING
    `,
    [section.eyebrow, section.heading, section.subtext],
  );

  return result.rowCount ?? 0;
}

async function seedAboutNumberStats(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM about_number_stats',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO about_number_stats (value, label, description, display_order, status)
    SELECT unnested.value, unnested.label, unnested.description,
           unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
        AS unnested(value, label, description, display_order)
    `,
    [
      ABOUT_NUMBER_STATS.map((stat) => stat.value),
      ABOUT_NUMBER_STATS.map((stat) => stat.label),
      ABOUT_NUMBER_STATS.map((stat) => stat.description),
      // The order they appear on the page today.
      ABOUT_NUMBER_STATS.map((_stat, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

async function seedAboutCtaSection(client: PoolClient): Promise<number> {
  const section = ABOUT_CTA;
  const result = await client.query(
    `
    INSERT INTO about_cta_section (id, heading, subtext, image_url)
    VALUES (1, $1, $2, $3)
    ON CONFLICT (id) DO NOTHING
    `,
    [section.heading, section.subtext, section.imageUrl],
  );

  return result.rowCount ?? 0;
}

// ── runner ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  try {
    const summary = await withTransaction(async (client) => {
      const permissionCount = await seedPermissions(client);
      await seedRoles(client);
      await seedSettings(client);
      const heroSlideCount = await seedHomeHeroSlides(client);
      const insiderHeroSlideCount = await seedInsiderHeroSlides(client);
      const insiderIssueCounts = await seedInsiderIssues(client);
      const insiderFeatureCount = await seedInsiderFeatureSection(client);
      const contactHeroCount = await seedContactHeroSection(client);
      const contactFormCount = await seedContactFormSection(client);
      const contactDetailsCount = await seedContactDetailsSection(client);
      const careerVacancyCount = await seedCareerVacancies(client);
      const partnerProgramHeroCount = await seedPartnerProgramHero(client);
      const aboutHeroCount = await seedAboutHeroSection(client);
      const aboutFounderNoteCount = await seedAboutFounderNote(client);
      const aboutTeamSectionCount = await seedAboutTeamSection(client);
      const aboutTeamMemberCount = await seedAboutTeamMembers(client);
      const aboutNumbersSectionCount = await seedAboutNumbersSection(client);
      const aboutNumberStatCount = await seedAboutNumberStats(client);
      const aboutCtaCount = await seedAboutCtaSection(client);
      const rootAdmin = await seedRootAdmin(client);
      return {
        permissionCount,
        heroSlideCount,
        insiderHeroSlideCount,
        insiderIssueCounts,
        insiderFeatureCount,
        contactHeroCount,
        contactFormCount,
        contactDetailsCount,
        careerVacancyCount,
        partnerProgramHeroCount,
        aboutHeroCount,
        aboutFounderNoteCount,
        aboutTeamSectionCount,
        aboutTeamMemberCount,
        aboutNumbersSectionCount,
        aboutNumberStatCount,
        aboutCtaCount,
        rootAdmin,
      };
    });

    logger.info('Seed complete', {
      permissions: summary.permissionCount,
      roles: Object.keys(SYSTEM_ROLES).length,
      homeHeroSlides: summary.heroSlideCount,
      insiderHeroSlides: summary.insiderHeroSlideCount,
      insiderIssues: summary.insiderIssueCounts.issues,
      insiderStories: summary.insiderIssueCounts.stories,
      insiderFeatureSection: summary.insiderFeatureCount,
      contactHeroSection: summary.contactHeroCount,
      contactFormSection: summary.contactFormCount,
      contactDetailsSection: summary.contactDetailsCount,
      careerVacancies: summary.careerVacancyCount,
      partnerProgramHero: summary.partnerProgramHeroCount,
      aboutHeroSection: summary.aboutHeroCount,
      aboutFounderNote: summary.aboutFounderNoteCount,
      aboutTeamSection: summary.aboutTeamSectionCount,
      aboutTeamMembers: summary.aboutTeamMemberCount,
      aboutNumbersSection: summary.aboutNumbersSectionCount,
      aboutNumberStats: summary.aboutNumberStatCount,
      aboutCtaSection: summary.aboutCtaCount,
      rootAdminEmail: summary.rootAdmin.email,
      rootAdminCreated: summary.rootAdmin.created,
    });

    if (summary.rootAdmin.created) {
      console.log(
        `\n  ADMIN created: ${summary.rootAdmin.email}` +
          `\n  Sign in with the password from SEED_SUPER_ADMIN_PASSWORD, then change it.\n`,
      );
    } else {
      console.log(
        `\n  ADMIN already exists (${summary.rootAdmin.email}) - password unchanged.\n`,
      );
    }

    await closePool();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed', { message: (error as Error).message });
    await closePool().catch(() => undefined);
    process.exit(1);
  }
}

void main();
