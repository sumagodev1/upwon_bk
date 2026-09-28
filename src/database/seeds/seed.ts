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
import { seedErpIndustries } from './erp-recognition.seed';
import { seedErpJourney } from './erp-journey.seed';
import { seedErpComparison } from './erp-comparison.seed';
import { seedErpOutcomes } from './erp-outcomes.seed';
import { seedErpEstablishers } from './erp-establishers.seed';
import { seedSfaDmsPage } from './sfa-dms.seed';
import { seedFmsPage } from './fms.seed';
import { seedPosPage } from './pos.seed';
import { seedHreasyPage } from './hreasy.seed';
import { seedWmsPage } from './wms.seed';
import { seedVendorPortalPage } from './vendor-portal.seed';
import { seedBakeryPage } from './bakery.seed';
import { seedFmcgPage } from './fmcg.seed';
import { seedSweetsPage } from './sweets.seed';
import { seedFoodProcessingPage } from './food-processing.seed';
import { seedNonFoodFmcgPage } from './non-food-fmcg.seed';
import { seedDairyPage } from './dairy.seed';
import { seedEngineeringManufacturingPage } from './engineering-manufacturing.seed';
import { seedBeveragePage } from './beverage.seed';
import { seedSpicesAgroPage } from './spices-agro.seed';
import { seedQsrFranchisePage } from './qsr-franchise.seed';
import { seedWhyUpwonPage } from './why-upwon.seed';
import { logger } from '../../core/utils/logger';
import {
  INSIDER_FEATURE_SECTION,
  INSIDER_HERO_SLIDES,
  INSIDER_ISSUES,
} from './insider-page.data';
import {
  CLIENTS_CASE_CARDS,
  CLIENTS_CASE_STORIES,
  CLIENTS_CASES_SECTION_COPY,
  CLIENTS_HERO_SLIDES,
  CLIENTS_NETWORK_SECTION_COPY,
  CLIENTS_NETWORK_STATES,
  CLIENTS_ROSTER_LOGOS,
  CLIENTS_ROSTER_SECTION_COPY,
  CLIENTS_TESTIMONIALS,
  CLIENTS_TESTIMONIALS_SECTION_COPY,
} from './clients-page.data';
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
import { SOCIAL_CONTACT_LINES, SOCIAL_LINKS } from './social-media-links.data';
import { socialLinkLabel } from '../../modules/social-media-links/utils/icons';
import {
  BLOG_CATEGORIES,
  BLOG_HERO_SLIDES,
  BLOG_POSTS,
  BLOG_TOPICS_SECTION,
} from './blog.data';
import { FREE_AUDIT_HERO_SLIDES } from './free-audit.data';
import { KB_ARTICLES, KB_CATEGORIES, KB_HERO_SLIDES } from './knowledgebase.data';
import {
  VS_SAP_ANSWER_SECTION,
  VS_SAP_CAPABILITIES,
  VS_SAP_COMPARISON_SECTION,
  VS_SAP_HERO_SLIDES,
} from './vs-sap-page.data';

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
/**
 * Hero slides - the five the site rotates through.
 *
 * Copied from FALLBACK_SLIDES in the website's HeroSection, with its
 * headingLines folded back into the authored markup this CMS stores: a newline
 * for a line break, **like this** for the orange accent.
 *
 * imageUrl is null on every one, which is deliberate rather than missing data.
 * None of the real slides carries artwork of its own - they all fall through
 * to the house background - and the site keys its legibility scrim off whether
 * a slide has an image, so pointing them at that background explicitly would
 * darken a hero that is meant to be pale.
 */
const HERO_SLIDES: Array<{
  eyebrow: string;
  heading: string;
  subtext: string;
  imageUrl: string | null;
  shine: boolean;
}> = [
  {
    eyebrow: 'Byte Elephant Presents',
    heading:
      'UPWON - The Business Growth Suite for\nAmbitious Food & FMCG Brands **Ready to Scale**.',
    subtext:
      'Built for food manufacturers, FMCG distributors and franchise brands to run production, distribution, HR and finance in one integrated platform.',
    imageUrl: null,
    shine: false,
  },
  {
    eyebrow: 'Built for Franchises',
    // 'first.Now' reproduces the site's own copy, missing space and all - it is
    // editable in the panel now, which is where a typo like that should be fixed.
    heading:
      'The 200th outlet should be as easy to\nrun as the first.Now **run the system** that makes it so.',
    subtext:
      'Open new outlets without operational challenges. One platform handles ordering, kitchens, billing, royalty and Swiggy / Zomato — across every store.',
    imageUrl: null,
    shine: false,
  },
  {
    eyebrow: 'Scale Without Chaos',
    heading:
      'Your 200th outlet should feel like your first.\nNow run the **system that makes** it so.',
    subtext:
      'Open new outlets without opening new headaches. One platform handles ordering, kitchens, billing, royalty and Swiggy / Zomato — across every store.',
    imageUrl: null,
    shine: false,
  },
  {
    eyebrow: 'One Suite · Seven Platforms',
    heading: 'One suite. Seven platforms.\nYour **entire business** — covered.',
    subtext:
      'ERP · SFA-DMS · FMS · POS · HRMS · WMS · Vendor Portal — choose one platform or deploy the full suite. Same data layer, zero reconciliation.',
    imageUrl: null,
    shine: false,
  },
  {
    // The closing slide carries the animated headline shine.
    eyebrow: 'AI-Powered From Day One',
    heading: 'AI Built-In. Smarter From Day One.',
    subtext:
      'Every solution ships with AI at its core — automating workflows, surfacing insights and helping you make faster, smarter decisions from day one.',
    imageUrl: null,
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


/**
 * Trust section - the six brand logos and four scale stats the site ships.
 *
 * Zipped into rows the same way 014 folded the old JSONB lists: entry N carries
 * logo N and stat N, and the run continues to the longer of the two, so the
 * last two entries are logo-only. The section copy repeats on every row and the
 * public read takes it from the first active one.
 */
const TRUST_LOGOS: Array<{ imageUrl: string; alt: string }> = [
  { imageUrl: '/images/testimonial/gokul.webp', alt: 'Gokul' },
  { imageUrl: '/images/testimonial/kaka%20halwai.webp', alt: 'Kaka Halwai' },
  { imageUrl: '/images/testimonial/mongignis.webp', alt: 'Monginis' },
  { imageUrl: '/images/testimonial/ofc.webp', alt: 'OFC' },
  { imageUrl: '/images/testimonial/u2cake.webp', alt: 'U2 Cake' },
  { imageUrl: '/images/testimonial/winni.webp', alt: 'Winni' },
];

const TRUST_STATS: Array<{ value: string; label: string }> = [
  { value: '10,000+', label: 'Invoices daily' },
  { value: '8000+', label: 'Orders every day' },
  { value: '50+', label: 'Brands live' },
  { value: '4,200+', label: 'Outlets connected' },
];

const TRUST_COPY = {
  eyebrow: "Trusted across India's food belt",
  heading: 'The brands that feed India **run on UPWON.**',
  subtext: "50+ of India's food and FMCG businesses run their daily operations on UPWON.",
};

async function seedHomeTrustEntries(client: PoolClient): Promise<number> {
  // Seeded only into an empty table, for the same reason as the hero slides:
  // there is no natural key to upsert on, so a re-run would either duplicate
  // the set or clobber copy an administrator has since edited.
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM home_trust_entries',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const rows = Math.max(TRUST_LOGOS.length, TRUST_STATS.length);
  const result = await client.query(
    `
    INSERT INTO home_trust_entries
      (image_url, image_alt, stat_value, stat_label, display_order, status)
    SELECT u.image_url, u.image_alt, u.stat_value, u.stat_label, u.position, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
        AS u(image_url, image_alt, stat_value, stat_label, position)
    `,
    [
      Array.from({ length: rows }, (_, i) => TRUST_LOGOS[i]?.imageUrl ?? null),
      Array.from({ length: rows }, (_, i) => TRUST_LOGOS[i]?.alt ?? null),
      Array.from({ length: rows }, (_, i) => TRUST_STATS[i]?.value ?? null),
      Array.from({ length: rows }, (_, i) => TRUST_STATS[i]?.label ?? null),
      Array.from({ length: rows }, (_, i) => i),
    ],
  );

  return result.rowCount ?? 0;
}

/**
 * Industries video intro - the single block the site ships.
 *
 * Only one entry may be active at a time (see migration 016), so this inserts
 * exactly one row.
 */
async function seedHomeIndustriesEntries(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM home_industries_entries',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO home_industries_entries
      (video_url, display_order, status)
    VALUES ($1, 0, 'ACTIVE')
    `,
    ['/video/video_test.mp4'],
  );

  return result.rowCount ?? 0;
}

/**
 * Values and work culture - the six cards the site ships.
 *
 * Photos are seeded as the site-relative paths the component already uses, so
 * the live grid renders identically. Two consequences worth knowing:
 *
 *   - The admin panel is served from a different origin, so these thumbnails
 *     will not load there until a card's image is replaced with an upload.
 *   - The three fms_hero files are 1600x566 hero artwork reused as
 *     placeholders. The card crops to 4:3, so they are visibly sliced on the
 *     live site today, and the card image spec would reject them as uploads.
 *     They are seeded as-is because this is the site's current content, not
 *     because they are the right artwork.
 */
const VALUES_COPY = {
  eyebrow: 'Our Customers Appreciate Us',
  heading: 'Values & **Work Culture**',
  subtext: 'These core values guide how we work, grow, and lead.',
};

const VALUES_CARDS: Array<{ title: string; body: string; imageUrl: string }> = [
  {
    title: 'Genuine Advice',
    body: 'UPWON values honest and transparent communication to provide practical, well-researched solutions tailored to your needs. Honesty is the basis of our advice.',
    imageUrl: '/images/fms_hero1.webp',
  },
  {
    title: 'Proactive Approach',
    body: 'We anticipate challenges and proactively address potential issues before they arise, ensuring smooth and efficient project execution.',
    imageUrl: '/images/fms_hero2.webp',
  },
  {
    title: 'Result Oriented, Time-Bound Working',
    body: 'We focus on delivering measurable results within agreed timelines and maintaining efficiency while ensuring quality outcomes.',
    imageUrl: '/images/fms_hero3.webp',
  },
  {
    title: 'Comprehensive Product Range',
    body: 'UPWON offers a wide range of software solutions to meet the diverse needs of the FMCG sector, giving clients integrated tools that cover every operational aspect.',
    imageUrl: '/images/discovery1.webp',
  },
  {
    title: 'Dedicated Support',
    body: 'We offer continuous and reliable support to our customers, ensuring the system is always optimized and functioning, with a team ready to help.',
    imageUrl: '/images/onboarding1.webp',
  },
  {
    title: 'Personalized Assistance',
    body: "We offer customized solutions and services. Every customer's requirements are different, so we provide a single point of contact after implementation and individual training.",
    imageUrl: '/images/distrubutor_rollout1.webp',
  },
];

async function seedHomeValuesEntries(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM home_values_entries',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO home_values_entries
      (image_url, card_title, card_body, display_order, status)
    SELECT u.image_url, u.card_title, u.card_body, u.position, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
        AS u(image_url, card_title, card_body, position)
    `,
    [
      VALUES_CARDS.map((card) => card.imageUrl),
      VALUES_CARDS.map((card) => card.title),
      VALUES_CARDS.map((card) => card.body),
      VALUES_CARDS.map((_card, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

/**
 * Platform integrations - the sixteen brand marks the sphere already carries.
 *
 * Order follows the component: the enterprise/hardware stack first, then the
 * commerce and payments stack. The site distributes them over the sphere by
 * farthest-point sampling rather than reading them in pairs, so the order here
 * is an authoring order, not a layout.
 *
 * Images are seeded as the site-relative paths the component already uses, so
 * the live sphere renders identically. The admin panel resolves those against
 * VITE_SITE_BASE_URL to preview them; replacing one with an upload through the
 * panel moves it into the database, which is where new artwork should go.
 */
const INTEGRATIONS_COPY = {
  eyebrow: 'Platform Integrations',
  heading: 'One Platform. Connected\nto Your Entire **Business.**',
  subtext:
    'UPWON seamlessly integrates with the systems you already use—ERP, POS, accounting, payments, CRM, analytics, and plant-floor devices—bringing everything together in one unified platform with a single source of truth.',
  centreLogoUrl: '/upwon-logo.png',
};

const INTEGRATION_LOGOS: Array<{ imageUrl: string; alt: string }> = [
  { imageUrl: '/images/platform_integration_client/PhonePe.webp', alt: 'PhonePe' },
  { imageUrl: '/images/platform_integration_client/Tally.webp', alt: 'Tally' },
  { imageUrl: '/images/platform_integration_client/SAP.webp', alt: 'SAP' },
  { imageUrl: '/images/platform_integration_client/Oracle.webp', alt: 'Oracle' },
  {
    imageUrl: '/images/platform_integration_client/Dynamics.webp',
    alt: 'Microsoft Dynamics 365',
  },
  { imageUrl: '/images/platform_integration_client/Tcsion.webp', alt: 'TCS iON' },
  { imageUrl: '/images/platform_integration_client/EPSON.webp', alt: 'EPSON' },
  { imageUrl: '/images/platform_integration_client/eSSL.webp', alt: 'eSSL' },
  { imageUrl: '/images/platform_integration_client/zomato.webp', alt: 'Zomato' },
  { imageUrl: '/images/platform_integration_client/swiggy.webp', alt: 'Swiggy' },
  { imageUrl: '/images/platform_integration_client/ondc.webp', alt: 'ONDC' },
  { imageUrl: '/images/platform_integration_client/unzo.webp', alt: 'Dunzo' },
  { imageUrl: '/images/platform_integration_client/paytm.webp', alt: 'Paytm' },
  { imageUrl: '/images/platform_integration_client/upi.webp', alt: 'UPI' },
  { imageUrl: '/images/platform_integration_client/Gpay.webp', alt: 'Google Pay' },
  { imageUrl: '/images/platform_integration_client/BharatPe.webp', alt: 'BharatPe' },
];

async function seedHomeIntegrationsEntries(client: PoolClient): Promise<number> {
  // Seeded only into an empty table, for the same reason as the hero slides:
  // there is no natural key to upsert on, so a re-run would either duplicate
  // the set or clobber copy an administrator has since edited.
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM home_integrations_entries',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO home_integrations_entries
      (centre_logo_url, logo_url, logo_alt, display_order, status)
    SELECT $1, u.logo_url, u.logo_alt, u.position, 'ACTIVE'
      FROM unnest($2::text[], $3::text[], $4::int[])
        AS u(logo_url, logo_alt, position)
    `,
    [
      INTEGRATIONS_COPY.centreLogoUrl,
      INTEGRATION_LOGOS.map((logo) => logo.imageUrl),
      INTEGRATION_LOGOS.map((logo) => logo.alt),
      INTEGRATION_LOGOS.map((_logo, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

/**
 * Client video testimonials - the eight cards the site ships.
 *
 * Posters are the remote Unsplash URLs the component already uses, so the live
 * marquee renders identically and the admin previews load anywhere. They are
 * placeholders, not customer footage: replacing one with an upload through the
 * panel is what moves it into the database.
 *
 * The clips are seeded as null rather than as the /videos/*.mp4 paths in the
 * component. Those paths are dead - public/videos does not exist, so every
 * card's play button currently opens a broken player. Seeding them would copy
 * that bug into the CMS and make eight rows look configured when they are not;
 * as null, each card honestly shows no play button until a clip is uploaded.
 */
const TESTIMONIALS_COPY = {
  eyebrow: 'Client Testimonials',
  heading: 'Discover how food brands **drive impact.**',
  subtext:
    'Food and FMCG businesses across India run on UPWON — cutting wastage, closing books faster, and scaling without the chaos. Hear it in their own words.',
};

const UNSPLASH = 'https://images.unsplash.com/photo-';
const POSTER_PARAMS = '?auto=format&fit=crop&w=900&q=75';

const TESTIMONIALS: Array<{
  clientName: string;
  clientPosition: string;
  quote: string;
  posterUrl: string;
}> = [
  {
    clientName: 'Monginis',
    clientPosition: 'Operations Leadership · Bakery',
    quote: 'UPWON rebuilt how we run a bakery business at scale.',
    posterUrl: `${UNSPLASH}1509440159596-0249088772ff${POSTER_PARAMS}`,
  },
  {
    clientName: 'Regional FMCG',
    clientPosition: 'National Sales Head · Distribution',
    quote: 'Profitability by territory — finally visible and actionable.',
    posterUrl: `${UNSPLASH}1553413077-190dd305871c${POSTER_PARAMS}`,
  },
  {
    clientName: 'Vatsalya Dairy',
    clientPosition: 'Supply Chain Head · Dairy',
    quote: 'Expiry write-offs went to zero with automatic FEFO.',
    posterUrl: `${UNSPLASH}1550583724-b2692b85b150${POSTER_PARAMS}`,
  },
  {
    clientName: 'Kaka Halwai',
    clientPosition: 'Plant Operations Head · Sweets',
    quote: 'The first system that finally speaks our language.',
    posterUrl: `${UNSPLASH}1571115177098-24ec42ed204d${POSTER_PARAMS}`,
  },
  {
    clientName: 'Gokul',
    clientPosition: 'Retail Operations · Sweets',
    quote: 'Counter billing went from 11 minutes to 5.',
    posterUrl: `${UNSPLASH}1556909212-d5b604d0c90d${POSTER_PARAMS}`,
  },
  {
    clientName: 'Winni',
    clientPosition: 'Finance · Gifting',
    quote: 'Credit notes that took days now close same-day.',
    posterUrl: `${UNSPLASH}1522124624696-7ea32eb9592c${POSTER_PARAMS}`,
  },
  {
    clientName: 'U2 Cake & Burger',
    clientPosition: 'Franchise Operations · QSR',
    quote: 'We scaled to 250 outlets without breaking.',
    posterUrl: `${UNSPLASH}1571091718767-18b5b1457add${POSTER_PARAMS}`,
  },
  {
    clientName: 'OFC',
    clientPosition: 'Operations · Food',
    quote: 'Real-time visibility across every plant, finally.',
    posterUrl: `${UNSPLASH}1581092160607-ee22621dd758${POSTER_PARAMS}`,
  },
];

async function seedHomeTestimonialEntries(client: PoolClient): Promise<number> {
  // Seeded only into an empty table, for the same reason as the hero slides:
  // there is no natural key to upsert on, so a re-run would either duplicate
  // the set or clobber copy an administrator has since edited.
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM home_testimonial_entries',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO home_testimonial_entries
      (poster_url, quote, client_name, client_position, display_order, status)
    SELECT u.poster_url, u.quote, u.client_name, u.client_position,
           u.position, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
        AS u(poster_url, quote, client_name, client_position, position)
    `,
    [
      TESTIMONIALS.map((t) => t.posterUrl),
      TESTIMONIALS.map((t) => t.quote),
      TESTIMONIALS.map((t) => t.clientName),
      TESTIMONIALS.map((t) => t.clientPosition),
      TESTIMONIALS.map((_t, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

/**
 * Frequently asked questions - the six the home page currently renders.
 *
 * FaqSection.jsx declares thirteen, but seven are commented out and so never
 * reach the page. Only the live six are seeded; the commented ones are drafts
 * the CMS is now the place for, and importing them would silently triple the
 * accordion.
 *
 * The subtext is IndustryFaq's own default rather than anything the home page
 * passes - the page supplies an eyebrow and a title but no description, so the
 * component's fallback is what visitors actually read today.
 *
 * The `category` each entry carries in the component is not seeded: the home
 * page renders through IndustryFaq, which never displays it. Only the unused
 * FaqSection default export does, and nothing renders that.
 */
const FAQ_COPY = {
  eyebrow: 'UpWon · Questions Before You Commit',
  heading: 'The questions buyers ask us about this **platform.**',
  subtext: 'Verbatim from real conversations with operators in this vertical.',
};

const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: 'What exactly is UpWon and which businesses is it built for?',
    answer:
      'UpWon is an integrated enterprise suite — ERP + DMS + POS + WMS + SFA + HR + FMS — built specifically for Indian food manufacturers, FMCG distributors and franchise networks. Typical customers do ₹2 Cr to ₹500 Cr in revenue: bakeries, dairies, sweets and namkeen, spices, beverages, QSR/franchise chains. It is not a generic ERP with a "food module" — every workflow is shaped around how Indian Food/FMCG operations actually run.',
  },
  {
    question: 'How much does UpWon cost?',
    answer:
      'Pricing is segmented by business size — Starter (₹2-25 Cr revenue), Growth (₹25-200 Cr) and Enterprise (₹200 Cr+). Each tier has a published starting price and a custom component based on plants / outlets / modules. We send a fixed-price proposal within 24 business hours of your first call — no drawn-out sales cycle to find out the number.',
  },
  {
    question: 'Do you handle data migration from our current system?',
    answer:
      'Yes — Tally, Marg, Busy, Excel, custom-built systems, and SAP migrations are all standard. We map your existing data model, clean it, migrate masters first, then transactions, then run parallel validation for a week before cutover. You sign off only when reconciliation hits 100%.',
  },
  {
    question: 'Is UpWon FSSAI, GST and e-invoicing compliant?',
    answer:
      'Yes — natively, not bolt-on. FSSAI license tracker with renewal alerts, GST e-invoicing via the IRP, e-way bill auto-generation, statutory return calendar, Form 16 / 24Q automation. Compliance is built into the data model, so audit-ready documents are one click away — not one week of paper-chase.',
  },
  {
    question: 'What kind of support do you get after go-live?',
    answer:
      '90-day hyper-care included by default — a dedicated SPOC on call, daily check-ins, P1 SLA of 1 hour, P2 SLA of 4 hours. Beyond that, every customer gets a named Customer Success Manager, ticketed support with priority SLAs, and 24x7 emergency support for plant-floor and outlet-billing issues. We do not disappear after launch.',
  },
  {
    question: 'Can UpWon be customized to our specific workflows?',
    answer:
      'Out-of-box UpWon covers 80%+ of typical food/FMCG workflows. The remaining 20% is handled through configuration — toggles, forms, rules, dashboards — not custom code. This is deliberate: configuration upgrades cleanly when we ship new versions, where custom code breaks. For genuinely novel workflows we build extensions on a documented API. The platform stays maintainable as you scale.',
  },
];

async function seedHomeFaqEntries(client: PoolClient): Promise<number> {
  // Seeded only into an empty table, for the same reason as the hero slides:
  // there is no natural key to upsert on, so a re-run would either duplicate
  // the set or clobber copy an administrator has since edited.
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM home_faq_entries',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO home_faq_entries
      (question, answer, display_order, status)
    SELECT u.question, u.answer, u.position, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::int[])
        AS u(question, answer, position)
    `,
    [
      FAQS.map((faq) => faq.question),
      FAQS.map((faq) => faq.answer),
      FAQS.map((_faq, index) => index),
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

async function seedClientsHeroSlides(client: PoolClient): Promise<number> {
  // Only into an empty table, like the Insider hero: re-running the seed must
  // never duplicate slides or revert an admin's edits.
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM clients_hero_slides',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO clients_hero_slides
      (heading, subtext, image_url, display_order, status)
    SELECT unnested.heading, unnested.subtext, unnested.image_url,
           unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
        AS unnested(heading, subtext, image_url, display_order)
    `,
    [
      CLIENTS_HERO_SLIDES.map((slide) => slide.heading),
      CLIENTS_HERO_SLIDES.map((slide) => slide.subtext),
      CLIENTS_HERO_SLIDES.map((slide) => slide.imageUrl),
      CLIENTS_HERO_SLIDES.map((_slide, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

/** Upserted only if absent, like every other page's section copy. */
async function seedClientsSectionCopy(client: PoolClient): Promise<number> {
  const sections = [
    { key: 'outcomes', ...CLIENTS_CASES_SECTION_COPY },
    { key: 'trust', ...CLIENTS_ROSTER_SECTION_COPY },
    { key: 'network', ...CLIENTS_NETWORK_SECTION_COPY },
    { key: 'testimonials', ...CLIENTS_TESTIMONIALS_SECTION_COPY },
  ];
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'clients', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      sections.map((s) => s.key),
      sections.map((s) => s.eyebrow),
      sections.map((s) => s.heading),
      sections.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

/**
 * Fills the story of each seeded card, matched by brand: the text fields on the
 * card, and the four list sections as rows. Only a card with no story yet
 * (slug IS NULL) is touched, so re-running the seed never overwrites a story an
 * admin has written or edited.
 */
async function seedClientsCaseStories(client: PoolClient): Promise<number> {
  let filled = 0;
  for (const story of CLIENTS_CASE_STORIES) {
    const card = await client.query<{ id: string }>(
      `
      UPDATE clients_case_cards
         SET slug = $2, duration = $3, challenge_one_line = $4, challenge_summary = $5,
             why_upwon = $6, testimonial_quote = $7, testimonial_author = $8,
             testimonial_role = $9
       WHERE brand = $1
         AND slug IS NULL
         AND NOT EXISTS (SELECT 1 FROM clients_case_cards taken WHERE taken.slug = $2)
      RETURNING id
      `,
      [
        story.brand,
        story.slug,
        story.duration,
        story.challengeOneLine,
        story.challengeSummary,
        story.whyUpwon,
        story.testimonialQuote,
        story.testimonialAuthor,
        story.testimonialRole,
      ],
    );
    const caseId = card.rows[0]?.id;
    if (!caseId) continue;

    // Each list only into an empty section, for the same reason as above.
    const fill = async (table: string, columns: string[], rows: string[][]) => {
      const existing = await client.query<{ count: number }>(
        `SELECT COUNT(*) AS count FROM ${table} WHERE case_id = $1`,
        [caseId],
      );
      if (Number(existing.rows[0].count) > 0 || rows.length === 0) return;
      const arrays = columns.map((_c, i) => rows.map((row) => row[i]));
      const casts = columns.map((_c, i) => `$${i + 2}::text[]`).join(', ');
      await client.query(
        `
        INSERT INTO ${table} (case_id, ${columns.join(', ')}, display_order)
        SELECT $1, ${columns.map((c) => `u.${c}`).join(', ')}, (u.ord - 1)::int
          FROM unnest(${casts}) WITH ORDINALITY AS u(${columns.join(', ')}, ord)
        `,
        [caseId, ...arrays],
      );
    };

    await fill(
      'clients_case_outcomes',
      ['value', 'label'],
      story.outcomes.map((o) => [o.value, o.label]),
    );
    await fill(
      'clients_case_challenges',
      ['title', 'description'],
      story.challenges.map((c) => [c.title, c.desc]),
    );
    await fill(
      'clients_case_timeline_steps',
      ['week', 'title', 'detail'],
      story.timeline.map((t) => [t.week, t.title, t.detail]),
    );
    await fill(
      'clients_case_deliverables',
      ['text'],
      story.deliverables.map((d) => [d]),
    );

    filled += 1;
  }
  return filled;
}

/** Only into an empty table, so re-running never reverts an admin's edits. */
async function seedClientsTestimonials(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM clients_testimonials',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO clients_testimonials
      (quote, author, company, rating, avatar_url, fallback_color, display_order, status)
    SELECT u.quote, u.author, u.company, 5, u.avatar_url, u.fallback_color,
           u.display_order, u.status
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                  $6::int[], $7::text[])
        AS u(quote, author, company, avatar_url, fallback_color, display_order, status)
    `,
    [
      CLIENTS_TESTIMONIALS.map((t) => t.quote),
      CLIENTS_TESTIMONIALS.map((t) => t.author),
      CLIENTS_TESTIMONIALS.map((t) => t.company),
      CLIENTS_TESTIMONIALS.map((t) => t.avatarUrl),
      CLIENTS_TESTIMONIALS.map((t) => t.fallbackColor),
      CLIENTS_TESTIMONIALS.map((_t, index) => index),
      CLIENTS_TESTIMONIALS.map((t) => t.status),
    ],
  );
  return result.rowCount ?? 0;
}

/** Only into an empty table, so re-running never reverts an admin's edits. */
async function seedClientsNetworkStates(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM clients_network_states',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO clients_network_states (state, zone, cities, display_order, status)
    SELECT u.state, u.zone, u.cities::jsonb, u.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
        AS u(state, zone, cities, display_order)
    `,
    [
      CLIENTS_NETWORK_STATES.map((row) => row.state),
      CLIENTS_NETWORK_STATES.map((row) => row.zone),
      CLIENTS_NETWORK_STATES.map((row) => JSON.stringify(row.cities)),
      CLIENTS_NETWORK_STATES.map((_row, index) => index),
    ],
  );
  return result.rowCount ?? 0;
}

/** Only into an empty table, so re-running never reverts an admin's edits. */
async function seedClientsRosterLogos(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM clients_roster_logos',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO clients_roster_logos (name, image_url, display_order, status)
    SELECT u.name, u.image_url, u.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::int[]) AS u(name, image_url, display_order)
    `,
    [
      CLIENTS_ROSTER_LOGOS.map((logo) => logo.name),
      CLIENTS_ROSTER_LOGOS.map((logo) => logo.imageUrl),
      CLIENTS_ROSTER_LOGOS.map((_logo, index) => index),
    ],
  );
  return result.rowCount ?? 0;
}

/** Only into an empty table, so re-running never reverts an admin's edits. */
async function seedClientsCaseCards(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM clients_case_cards',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO clients_case_cards
      (category, brand, location, scale, headline, story_url, display_order, status)
    SELECT u.category, u.brand, u.location, u.scale, u.headline,
           u.story_url, u.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                  $6::text[], $7::int[])
        AS u(category, brand, location, scale, headline, story_url, display_order)
    `,
    [
      CLIENTS_CASE_CARDS.map((card) => card.category),
      CLIENTS_CASE_CARDS.map((card) => card.brand),
      CLIENTS_CASE_CARDS.map((card) => card.location),
      CLIENTS_CASE_CARDS.map((card) => card.scale),
      CLIENTS_CASE_CARDS.map((card) => card.headline),
      CLIENTS_CASE_CARDS.map((card) => card.storyUrl),
      CLIENTS_CASE_CARDS.map((_card, index) => index),
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

// ── social media links (the site footer) ──────────────────────────────────
/**
 * The footer's four contact lines, only while the table is empty - so a re-run
 * never re-adds a line an administrator has since deleted or reordered.
 */
async function seedSocialContactLines(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM social_contact_lines',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO social_contact_lines (kind, icon, value, display_order, status)
    SELECT unnested.kind, unnested.icon, unnested.value,
           unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
        AS unnested(kind, icon, value, display_order)
    `,
    [
      SOCIAL_CONTACT_LINES.map((line) => line.kind),
      SOCIAL_CONTACT_LINES.map((line) => line.icon),
      SOCIAL_CONTACT_LINES.map((line) => line.value),
      // The order the footer prints them in today.
      SOCIAL_CONTACT_LINES.map((_line, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

/**
 * The footer's LinkedIn and Twitter buttons, only while the table is empty -
 * for the same reason as the contact lines above: a re-run must never bring
 * back a link an administrator deleted. Their addresses are to be confirmed in
 * the panel; see social-media-links.data.ts.
 */
async function seedSocialLinks(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM social_links',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO social_links (label, icon, url, display_order, status)
    SELECT unnested.label, unnested.icon, unnested.url,
           unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
        AS unnested(label, icon, url, display_order)
    `,
    [
      // The label is the icon's platform name, exactly as the admin API writes it.
      SOCIAL_LINKS.map((link) => socialLinkLabel(link.icon)),
      SOCIAL_LINKS.map((link) => link.icon),
      SOCIAL_LINKS.map((link) => link.url),
      // The order the footer draws them in today.
      SOCIAL_LINKS.map((_link, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

// ── blog (Resource Page > Blog) ───────────────────────────────────────────
/*
 * The /blog page's content the website previously held as static data - see
 * blog.data.ts for where each part came from. The topics intro is a singleton
 * pinned to id = 1, so DO NOTHING is exactly "only when empty"; the hero
 * slides, the categories and the posts are each seeded only into an empty
 * table, so a re-run never re-adds a slide, a category or a post an
 * administrator has since deleted, and never reverts an edit.
 */

async function seedBlogHeroSlides(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM blog_hero_slides',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO blog_hero_slides
      (eyebrow, heading, subtext, image_url, display_order, status)
    SELECT unnested.eyebrow, unnested.heading, unnested.subtext,
           unnested.image_url, unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
        AS unnested(eyebrow, heading, subtext, image_url, display_order)
    `,
    [
      BLOG_HERO_SLIDES.map((slide) => slide.eyebrow),
      BLOG_HERO_SLIDES.map((slide) => slide.heading),
      BLOG_HERO_SLIDES.map((slide) => slide.subtext),
      BLOG_HERO_SLIDES.map((slide) => slide.imageUrl),
      BLOG_HERO_SLIDES.map((_slide, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

async function seedBlogTopicsSection(client: PoolClient): Promise<number> {
  const topics = BLOG_TOPICS_SECTION;
  const result = await client.query(
    `
    INSERT INTO blog_topics_section (id, eyebrow, heading, subtext)
    VALUES (1, $1, $2, $3)
    ON CONFLICT (id) DO NOTHING
    `,
    [topics.eyebrow, topics.heading, topics.subtext],
  );

  return result.rowCount ?? 0;
}

async function seedBlogCategories(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM blog_categories',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO blog_categories (slug, label, icon, display_order, status)
    SELECT unnested.slug, unnested.label, unnested.icon,
           unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
        AS unnested(slug, label, icon, display_order)
    `,
    [
      BLOG_CATEGORIES.map((category) => category.slug),
      BLOG_CATEGORIES.map((category) => category.label),
      BLOG_CATEGORIES.map((category) => category.icon),
      // The order the page draws the chips in today.
      BLOG_CATEGORIES.map((_category, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

/**
 * Every post, filed under its category by slug. Runs after seedBlogCategories
 * in the same transaction, so on a first run every slug resolves; a post whose
 * category an administrator has since deleted is simply not re-created.
 *
 * This is the only writer of blog_posts.image_url: each seeded post's picture
 * is the Unsplash URL data/blog.js has always used, and no uploaded file exists
 * for it. The column is legacy / seed-only - the admin API never writes it,
 * and a post's first upload (or removing its picture) clears it.
 */
async function seedBlogPosts(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM blog_posts',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  // Bodies travel as JSON text and are cast per row: pg would encode a JS
  // array of objects as a Postgres array literal, which is not jsonb. Dates
  // travel as their YYYY-MM-DD text for the same reason in the other direction.
  const result = await client.query(
    `
    INSERT INTO blog_posts
      (slug, category_id, title, excerpt, image_url, read_time, published_on,
       author, lead, body, status)
    SELECT unnested.slug, c.id, unnested.title, unnested.excerpt, unnested.image_url,
           unnested.read_time, unnested.published_on::date,
           unnested.author, unnested.lead, unnested.body::jsonb, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
                  $7::text[], $8::text[], $9::text[], $10::text[])
        AS unnested(slug, category_slug, title, excerpt, image_url, read_time,
                    published_on, author, lead, body)
      JOIN blog_categories c ON c.slug = unnested.category_slug
    `,
    [
      BLOG_POSTS.map((post) => post.slug),
      BLOG_POSTS.map((post) => post.categorySlug),
      BLOG_POSTS.map((post) => post.title),
      BLOG_POSTS.map((post) => post.excerpt),
      BLOG_POSTS.map((post) => post.imageUrl),
      BLOG_POSTS.map((post) => post.readTime),
      BLOG_POSTS.map((post) => post.publishedOn),
      BLOG_POSTS.map((post) => post.author),
      BLOG_POSTS.map((post) => post.lead),
      BLOG_POSTS.map((post) => JSON.stringify(post.body)),
    ],
  );

  return result.rowCount ?? 0;
}

// ── free operational audit (Resource Page > Free Operational Audit) ───────
/*
 * The /free-audit hero the website previously held as static data - see
 * free-audit.data.ts. Seeded only into an empty table, like the Blog hero, so a
 * re-run never re-adds a slide an administrator has since deleted and never
 * reverts an edit. The audit request inbox is never seeded.
 */

async function seedFreeAuditHeroSlides(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM free_audit_hero_slides',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO free_audit_hero_slides
      (eyebrow, heading, subtext, image_url, display_order, status)
    SELECT unnested.eyebrow, unnested.heading, unnested.subtext,
           unnested.image_url, unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
        AS unnested(eyebrow, heading, subtext, image_url, display_order)
    `,
    [
      FREE_AUDIT_HERO_SLIDES.map((slide) => slide.eyebrow),
      FREE_AUDIT_HERO_SLIDES.map((slide) => slide.heading),
      FREE_AUDIT_HERO_SLIDES.map((slide) => slide.subtext),
      FREE_AUDIT_HERO_SLIDES.map((slide) => slide.imageUrl),
      FREE_AUDIT_HERO_SLIDES.map((_slide, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

// ── knowledgebase (Resource Page > Knowledgebase) ─────────────────────────
/*
 * The /knowledgebase content the website previously held as static data - see
 * knowledgebase.data.ts for where each part came from. The hero slides, the
 * categories and the articles are each seeded only into an empty table, like
 * the Blog's, so a re-run never re-adds a slide, a category or an article an
 * administrator has since deleted, and never reverts an edit.
 */

async function seedKbHeroSlides(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM kb_hero_slides',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO kb_hero_slides
      (eyebrow, heading, subtext, image_url, display_order, status)
    SELECT unnested.eyebrow, unnested.heading, unnested.subtext,
           unnested.image_url, unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
        AS unnested(eyebrow, heading, subtext, image_url, display_order)
    `,
    [
      KB_HERO_SLIDES.map((slide) => slide.eyebrow),
      KB_HERO_SLIDES.map((slide) => slide.heading),
      KB_HERO_SLIDES.map((slide) => slide.subtext),
      KB_HERO_SLIDES.map((slide) => slide.imageUrl),
      KB_HERO_SLIDES.map((_slide, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

async function seedKbCategories(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM kb_categories',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO kb_categories (slug, name, description, icon, display_order, status)
    SELECT unnested.slug, unnested.name, unnested.description, unnested.icon,
           unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
        AS unnested(slug, name, description, icon, display_order)
    `,
    [
      KB_CATEGORIES.map((category) => category.slug),
      KB_CATEGORIES.map((category) => category.name),
      KB_CATEGORIES.map((category) => category.description),
      KB_CATEGORIES.map((category) => category.icon),
      // The order the hub draws the cards in today.
      KB_CATEGORIES.map((_category, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

/**
 * Every article, filed under its category by slug. Runs after seedKbCategories
 * in the same transaction, so on a first run every slug resolves; an article
 * whose category an administrator has since deleted is simply not re-created.
 */
async function seedKbArticles(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM kb_articles',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  // Bodies and FAQs travel as JSON text and are cast per row: pg would encode
  // a JS array of objects as a Postgres array literal, which is not jsonb.
  // Dates travel as their YYYY-MM-DD text for the same reason in the other
  // direction.
  const result = await client.query(
    `
    INSERT INTO kb_articles
      (slug, category_id, title, excerpt, read_time, updated_on, body, faqs, status)
    SELECT unnested.slug, c.id, unnested.title, unnested.excerpt, unnested.read_time,
           unnested.updated_on::date, unnested.body::jsonb, unnested.faqs::jsonb, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
                  $7::text[], $8::text[])
        AS unnested(slug, category_slug, title, excerpt, read_time, updated_on, body, faqs)
      JOIN kb_categories c ON c.slug = unnested.category_slug
    `,
    [
      KB_ARTICLES.map((article) => article.slug),
      KB_ARTICLES.map((article) => article.categorySlug),
      KB_ARTICLES.map((article) => article.title),
      KB_ARTICLES.map((article) => article.excerpt),
      KB_ARTICLES.map((article) => article.readTime),
      KB_ARTICLES.map((article) => article.updatedOn),
      KB_ARTICLES.map((article) => JSON.stringify(article.body)),
      KB_ARTICLES.map((article) => JSON.stringify(article.faqs)),
    ],
  );

  return result.rowCount ?? 0;
}

// ── upwon vs sap (Resource Page > UpWon vs SAP) ───────────────────────────
/*
 * The /compare/upwon-vs-sap content the website previously held as static data
 * - see vs-sap-page.data.ts for where each part came from. The straight answer
 * and the comparison table's copy are singletons pinned to id = 1, so DO
 * NOTHING is exactly "only when empty"; the hero slides and the capability rows
 * are each seeded only into an empty table, like the Free Audit hero, so a
 * re-run never re-adds a slide or a row an administrator has since deleted, and
 * never reverts an edit.
 */

async function seedVsSapHeroSlides(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM vs_sap_hero_slides',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO vs_sap_hero_slides
      (eyebrow, heading, subtext, image_url, display_order, status)
    SELECT unnested.eyebrow, unnested.heading, unnested.subtext,
           unnested.image_url, unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
        AS unnested(eyebrow, heading, subtext, image_url, display_order)
    `,
    [
      VS_SAP_HERO_SLIDES.map((slide) => slide.eyebrow),
      VS_SAP_HERO_SLIDES.map((slide) => slide.heading),
      VS_SAP_HERO_SLIDES.map((slide) => slide.subtext),
      VS_SAP_HERO_SLIDES.map((slide) => slide.imageUrl),
      VS_SAP_HERO_SLIDES.map((_slide, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

async function seedVsSapAnswerSection(client: PoolClient): Promise<number> {
  const section = VS_SAP_ANSWER_SECTION;
  // The two lists are serialised explicitly: handed a JS array, pg would
  // encode it as a Postgres array literal, which is not valid jsonb.
  const result = await client.query(
    `
    INSERT INTO vs_sap_answer_section
      (id, eyebrow, heading, upwon_title, upwon_points, sap_title, sap_points,
       closing_line)
    VALUES (1, $1, $2, $3, $4::jsonb, $5, $6::jsonb, $7)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      section.eyebrow,
      section.heading,
      section.upwonTitle,
      JSON.stringify(section.upwonPoints),
      section.sapTitle,
      JSON.stringify(section.sapPoints),
      section.closingLine,
    ],
  );

  return result.rowCount ?? 0;
}

async function seedVsSapComparisonSection(client: PoolClient): Promise<number> {
  const section = VS_SAP_COMPARISON_SECTION;
  const result = await client.query(
    `
    INSERT INTO vs_sap_comparison_section
      (id, eyebrow, heading, subtext, tco_upwon, tco_sap, tco_netsuite)
    VALUES (1, $1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      section.eyebrow,
      section.heading,
      section.subtext,
      section.tcoUpwon,
      section.tcoSap,
      section.tcoNetsuite,
    ],
  );

  return result.rowCount ?? 0;
}

async function seedVsSapCapabilities(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM vs_sap_capabilities',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO vs_sap_capabilities
      (capability, upwon, sap, netsuite, display_order, status)
    SELECT unnested.capability, unnested.upwon, unnested.sap, unnested.netsuite,
           unnested.display_order, 'ACTIVE'
      FROM unnest($1::text[], $2::int[], $3::int[], $4::int[], $5::int[])
        AS unnested(capability, upwon, sap, netsuite, display_order)
    `,
    [
      VS_SAP_CAPABILITIES.map((row) => row.capability),
      VS_SAP_CAPABILITIES.map((row) => row.upwon),
      VS_SAP_CAPABILITIES.map((row) => row.sap),
      VS_SAP_CAPABILITIES.map((row) => row.netsuite),
      // The order the table draws the rows in today.
      VS_SAP_CAPABILITIES.map((_row, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}

// ── runner ────────────────────────────────────────────────────────────────
/**
 * The copy that heads each list section - one row per section rather than a
 * copy on every entry. See 021_home_section_copy.sql, and 023 for the move
 * to a key of (page, section).
 *
 * Each block is the copy that section already renders, so a fresh database
 * comes up matching the live site. Written only where a section has none yet,
 * so a re-run never clobbers copy an administrator has since edited.
 *
 * The hero is absent on purpose: its slides each carry their own copy.
 */
const SECTION_COPY: Array<{
  key: string;
  eyebrow: string;
  heading: string;
  subtext: string;
}> = [
  { key: 'trust', ...TRUST_COPY },
  {
    key: 'industries',
    eyebrow: 'Industries We Serve',
    heading: 'Built for Food. Proven for FMCG. **Ready for everything that follows.**',
    subtext:
      'Every industry we serve, from food manufacturing to everyday FMCG - organised by depth.',
  },
  { key: 'values', ...VALUES_COPY },
  {
    key: 'integrations',
    eyebrow: INTEGRATIONS_COPY.eyebrow,
    heading: INTEGRATIONS_COPY.heading,
    subtext: INTEGRATIONS_COPY.subtext,
  },
  { key: 'testimonials', ...TESTIMONIALS_COPY },
  { key: 'faq', ...FAQ_COPY },
  {
    key: 'cta',
    eyebrow: 'Free Report',
    heading: 'Benchmark your operations. **Free report.**',
    subtext:
      'See how 50+ food and FMCG businesses cut wastage, sped up billing, and scaled — with benchmarks you can measure your own operation against.',
  },
];

async function seedHomeSectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'home', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      SECTION_COPY.map((s) => s.key),
      SECTION_COPY.map((s) => s.eyebrow),
      SECTION_COPY.map((s) => s.heading),
      SECTION_COPY.map((s) => s.subtext),
    ],
  );

  return result.rowCount ?? 0;
}

/**
 * The report-download band - the artwork and button the site ships.
 *
 * Images are seeded as the site-relative paths the component already uses, so
 * the live band renders identically. No report PDF: the button links at the
 * resources page today and there is no file to point it at, so it is left
 * unset and the site keeps that link until one is uploaded through the panel.
 *
 * Written only into an empty table, for the same reason as the other seeds.
 */
async function seedHomeCtaSection(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM home_cta_section',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO home_cta_section
      (desktop_image_url, mobile_image_url, button_label)
    VALUES ($1, $2, $3)
    `,
    ['/images/home_cta.webp', '/images/home_cta_mb.webp', 'Download the report'],
  );

  return result.rowCount ?? 0;
}

// ── ERP product page ──────────────────────────────────────────────────────

/**
 * The copy that heads each ERP section, lifted from the page as it renders.
 *
 * 'cta' has no eyebrow: the closing band opens straight on its heading, which
 * is why page_section_copy allows that column to be null.
 */
const ERP_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  /** Null where a section carries no explanatory line, as the outcomes carousel does. */
  subtext: string | null;
}> = [
  {
    key: 'trust',
    eyebrow: 'Numbers from businesses running UPWON today',
    heading: 'Numbers From Businesses **Running UPWON Today.**',
    subtext:
      "50+ of India's food and FMCG businesses run their daily operations on UPWON.",
  },
  {
    key: 'recognition',
    eyebrow: 'Industry Recognition',
    heading: 'Why Use Generic ERPs when **Specialized System** is Available?',
    subtext:
      'Explore the domain-specialized ERP versions — not retrofitted for them.',
  },
  {
    key: 'benefits',
    eyebrow: 'From Plant Floor to Boardroom',
    heading: 'UPWON ERP — Benefits for **Everyone**',
    subtext:
      'Tangible and intangible outcomes from the core UPWON ERP — from the plant floor to the boardroom.',
  },
  {
    key: 'alternatives',
    eyebrow: 'UPWON vs the Alternatives',
    heading: 'Enterprise-Grade Depth. **Without the Enterprise Price or Timeline.**',
    subtext:
      'No formal feature bake-off required — just a plain-language look at how UPWON compares with global ERPs and generic platforms on the things food and FMCG operators actually care about.',
  },
  {
    key: 'outcomes',
    eyebrow: 'Customer Outcomes',
    heading: 'What Changed After UPWON — **In Their Own Words.**',
    subtext: null,
  },
  {
    key: 'establishers',
    eyebrow: 'Trust Establishers',
    heading: 'Compliant by Design. **Connected to What You Already Use.**',
    subtext:
      'FSSAI and GST/e-invoice compliance are built into the system, not bolted on — and UPWON already connects to the tools your business runs on today, so switching never means starting from zero.',
  },
  {
    key: 'faq',
    eyebrow: 'FAQ',
    heading: 'Questions Buyers Ask **Before They Commit.**',
    subtext:
      'Straight answers to the cost, migration, compliance, customisation and support questions — before you commit.',
  },
  {
    key: 'cta',
    eyebrow: null,
    heading: 'See UPWON on Your Business — **Live, in 30 Minutes.**',
    subtext:
      'This isn’t a pitch. It’s a 30-minute conversation about your operations — with someone who knows your industry, mapped to what you actually run.',
  },
];

async function seedErpSectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'erp', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      ERP_SECTION_COPY.map((s) => s.key),
      ERP_SECTION_COPY.map((s) => s.eyebrow),
      ERP_SECTION_COPY.map((s) => s.heading),
      ERP_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

/**
 * The five slider slides, from product.heroSlides in data/modules.js.
 *
 * Every slide shares the same two buttons and the same reassurance line in the
 * source, but they are stored per slide because the schema keeps them there -
 * which is also what lets one of them differ later.
 */
const ERP_HERO_SLIDES: Array<{
  eyebrow: string;
  headline: string;
  subhead: string;
  imageUrl: string;
}> = [
  {
    eyebrow: 'Business Transformation',
    headline:
      "UPWON ERP Isn't Just Another IT Product — It's a Business Transformation Tool.",
    subhead: 'To scale your business, use a proven scaling engine.',
    imageUrl: '/images/erp_hero1.webp',
  },
  {
    eyebrow: 'Built for Food',
    headline: 'The Only ERP — That Thinks Like a Food Manufacturer.',
    subhead: 'Recipe, batch, FEFO and FSSAI — built in, not bolted on.',
    imageUrl: '/images/erp_hero2.webp',
  },
  {
    eyebrow: 'Stop the Leakage',
    headline:
      "Fixing Business Leakages Doesn't Just Grow the Bottom Line — It Opens Business Scaling Opportunities.",
    subhead:
      'Business scaling is only possible when operational complexities are taken care of.',
    imageUrl: '/images/erp_hero3.webp',
  },
  {
    eyebrow: 'Cost Intelligence',
    headline: 'Know Your True Cost — Per Batch, Per SKU, Per Plant.',
    subhead: 'Costing that reflects what actually happened on the floor.',
    imageUrl: '/images/erp_hero4.webp',
  },
  {
    eyebrow: 'One Connected Operation',
    headline: 'One Connected Operation — From Procurement to Dispatch.',
    subhead: 'Every function on one data model, with no reconciliation between them.',
    imageUrl: '/images/erp_hero5.webp',
  },
];

const ERP_HERO_CTA = { label: 'Talk to an Industry Specialist', href: '/demo' };
const ERP_HERO_SECONDARY = { label: 'Watch 2-Min Product Tour', href: '/resources' };
const ERP_HERO_MICRO_TRUST = 'Integrated ERP managing 50+ food & FMCG brands.';

/**
 * The copy that heads the SFA-DMS page's FAQ and closing band.
 *
 * The band's eyebrow is "Ready when you are" - unlike the ERP band, which opens
 * straight on its heading, this one has a pill above it.
 */
const SFA_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: 'proof',
    eyebrow: 'Proof, not promises',
    heading: "Not a Pitch. **Just What's Already Running.**",
    /*
     * No subtext: this section goes straight from the heading to the two
     * panels, which is why the column is nullable.
     */
    subtext: null,
  },
  {
    key: 'packages',
    eyebrow: 'Grows With You',
    heading:
      "Start With Your Field Team. **Add Distributor Control When You're Ready.**",
    subtext:
      'SFA and DMS can be adopted in sequence, region by region or beat by beat — not a forced simultaneous rollout across every distributor on day one.',
  },
  {
    key: 'outcomes',
    eyebrow: 'Customer Outcomes',
    heading: 'Real Outcomes for Every **Distribution Team.**',
    /*
     * No subtext: the carousel goes straight from the heading to the cards,
     * which is why the column is nullable.
     */
    subtext: null,
  },
  {
    key: 'alternatives',
    eyebrow: 'UpWon vs the Alternatives',
    heading:
      'A Smarter App for Your Field Team Is Not the Same as **One Connected System.**',
    subtext:
      'Out-of-the-box capability, rated capability by capability — UpWon against the standalone SFA / DMS point solutions field teams usually stitch together.',
  },
  {
    key: 'establishers',
    eyebrow: 'Trust Establishers',
    heading:
      'Compliant by Design.\n**Connected** to What You **Already Use.**',
    subtext:
      'FSSAI and GST e-invoice compliance are built into the system, not bolted on — and UPWON already connects to the tools your business runs on today, so switching never means starting from zero.',
  },
  {
    key: 'video',
    eyebrow: 'Every route to market',
    heading: 'Built for Distribution — **Food, FMCG, FMEG and Beyond**',
    subtext:
      'One platform for every route to market — from food and FMCG to FMEG distribution, across every channel and every pincode in India.',
  },
  {
    key: 'faq',
    eyebrow: 'FAQ',
    heading: 'Questions Distribution Heads Ask **Before They Commit.**',
    subtext:
      'Kept to how a Sales or Distribution Head actually asks it — not how a sales deck phrases it.',
  },
  {
    key: 'cta',
    eyebrow: 'Ready when you are',
    heading: 'See Your Distribution Network on UpWon — **Live, in 30 Minutes.**',
    subtext:
      'An invitation to a conversation about your own field team and distributor network — not a demo request form.',
  },
];

/**
 * The FMS page's section copy.
 *
 * The hero is absent on purpose, as on the other pages: its slides each carry
 * their own eyebrow, headline and subhead.
 */
const FMS_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: 'proof',
    eyebrow: 'Proof Strip',
    heading: "Not a Pitch. **Just What's Already Running.**",
    subtext:
      'Franchise-network-specific proof, shown honestly — not inflated to compete on headline-grabbing restaurant counts.',
  },
  {
    key: 'faq',
    eyebrow: 'FAQ',
    heading: 'Questions Franchisors **Ask Before They Commit.**',
    subtext:
      'Pulled straight from the objections franchisors raise — price-as-add-on, rollout disruption, franchisee resistance — not generic FAQ boilerplate.',
  },
  {
    key: 'outcomes',
    eyebrow: 'Customer Outcomes',
    heading:
      "35 Outlets Became 200. **The Back-Office Team Didn't Grow at All.**",
    subtext:
      'Named proof from the networks running on UpWon \u2014 the challenge, what changed, and the numbers.',
  },
  {
    key: 'alternatives',
    eyebrow: 'UpWon vs the Alternatives',
    heading:
      'A POS With a Royalty Feature Is\n**Not the Same as a Franchise Operating System.**',
    subtext:
      'No star ratings. The rows below match what franchisors rank highest — domain expertise and native ERP / central-kitchen integration, not feature count or AI depth.',
  },
  {
    key: 'packages',
    eyebrow: 'Module Versions & Growth Path',
    heading:
      'Start With Your Counter. **Grow Into Full Franchise Control.**',
    subtext:
      'A three-tier structure built from our FMS & POS sub-systems \u2014 start with outlet billing and expand into royalty and compliance as the network grows.',
  },
  {
    key: 'integrations',
    eyebrow: 'Platform Integrations',
    heading:
      'One System \u2014 **with Pre-Built Integrations.**',
    subtext:
      'UpWon FMS connects out of the box to the payments, delivery, accounting and enterprise systems your network already runs on \u2014 so franchise operations, royalty and reporting all draw from one connected source of truth.',
  },
  {
    key: 'video',
    eyebrow: 'See It in Action',
    heading:
      "It's Not Just Software \u2014 **It's Your Franchise Operating System.**",
    subtext:
      'See how one system runs ordering, royalty, replenishment and brand standards across every outlet \u2014 with head office in full control.',
  },
  {
    key: 'recognition',
    eyebrow: 'Recognition',
    heading:
      'Special Extensions for **Bakery, Sweets, Ice Cream and QSR Franchises…**',
    subtext:
      'Domain-specific models built for how your franchise really works. Choose a category to see how UpWon adapts to your operations.',
  },
  {
    key: 'cta',
    eyebrow: 'Ready when you are',
    heading: 'See Your Franchise Network on UpWon — **Live, in 30 Minutes.**',
    subtext:
      'An invitation to a conversation about your own franchise network — not a demo request form.',
  },
];

/**
 * The POS page's section copy: the FAQ and the closing band.
 *
 * The hero is absent on purpose, as on every other page - its five slides each
 * carry their own eyebrow, headline and subhead.
 */
const POS_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: 'proof',
    eyebrow: 'Proof Strip',
    heading: "Not a Pitch. **Just What's Already Running.**",
    subtext:
      'Real transaction-level proof from live counters — not an inflated outlet count to win a headline war.',
  },
  {
    key: 'recognition',
    eyebrow: 'Recognition',
    heading:
      'Built for Bakery Counters, Sweets Shops, Dine-In, QSR and **Every Food Retail Business in Between.**',
    subtext:
      'A quick category map so a range of counter-level buyers — not just franchisors — see themselves immediately.',
  },
  {
    key: 'video',
    eyebrow: 'See It in Action',
    heading: "It's Not Just a POS — **It's a Retail Sales Growth Engine.**",
    subtext:
      'See how one screen runs your counter, your kitchen and your stock — and turns every sale into growth.',
  },
  {
    key: 'packages',
    eyebrow: 'Module Versions & Growth Path',
    heading: 'Start With Billing. **Grow Into Your Full Kitchen and Stock.**',
    subtext:
      'POS that fits a single counter or a 1,000-outlet chain \u2014 same UI, same reliability. Start small and switch modules on as you grow.',
  },
  {
    key: 'establishers',
    eyebrow: 'Secure, Compliant, Accountable',
    heading: 'GST-Compliant by Default. **Your Sales Data Stays Yours.**',
    subtext:
      'UpWon POS is built with industry-leading compliance and connects effortlessly with the tools you already use.',
  },
  {
    key: 'alternatives',
    eyebrow: 'UpWon vs the Alternatives',
    heading: "A Faster Till Is Not the Same as a **System You Won't Outgrow.**",
    subtext:
      'Star ratings reflect out-of-the-box capability, not what can be built with custom development.',
  },
  {
    key: 'outcomes',
    eyebrow: 'Customer Outcomes',
    heading: 'Software replaced. **Results delivered.**',
    subtext: 'The receipts from real F&B brands running their counter on UpWon POS.',
  },
  {
    key: 'faq',
    eyebrow: 'FAQ',
    heading: 'Questions Retail & F&B Owners **Ask Before They Commit.**',
    subtext:
      'Concrete, operational answers \u2014 hardware, offline billing, aggregator orders, GST and go-live time \u2014 not enterprise-style due diligence.',
  },
  {
    key: 'cta',
    eyebrow: 'Real Counters. Real Businesses. Real Growth.',
    heading: 'See UpWon POS at Your Counter \u2014 **Live, in 30 Minutes.**',
    subtext:
      'A quick, focused conversation about your business, your counter, and how UpWon can help you grow.',
  },
];

const HREASY_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: 'proof',
    eyebrow: 'Proof Strip',
    heading: "UpWon HRMS \u2014 **Just What's Already Running.**",
    subtext:
      'Real, named-client proof from live deployments \u2014 not an inflated aggregate user count to win a headline war.',
  },
  {
    key: 'capabilities',
    eyebrow: 'Every HR Need',
    heading:
      'Advanced Platform for Every HR Need — **From Recruitment to Retirement.**',
    subtext:
      'One platform that understands a mixed workforce — office, plant and field — across the full employee lifecycle.',
  },
  {
    key: 'lifecycle',
    eyebrow: 'Core Capabilities',
    heading: 'Everything From Hiring to Exit — **For Every Kind of Employee You Have.**',
    subtext:
      'Every stage of the employee lifecycle — recruit to retire — built for office, plant, field and contract staff alike, not a dry feature list.',
  },
  {
    key: 'packages',
    eyebrow: 'Module Versions & Growth Path',
    heading: 'Start With Core HR. **Grow Into Full Performance Management.**',
    subtext:
      "HREasy's Core, Pro and Plus packages — start where you are today and add depth as you scale, on the same platform.",
  },
  {
    key: 'alternatives',
    eyebrow: 'UpWon vs the Alternatives',
    heading:
      "A Great HR App for Your Office Isn't the Same as **an HR System for Your Whole Business.**",
    subtext:
      'No star ratings — just the rows that actually differ: the shape of your workforce, and whether your HR connects to a manufacturing core.',
  },
  {
    key: 'outcomes',
    eyebrow: 'Customer Outcomes',
    heading:
      '95% Fewer HR Errors. 40% Less Admin Time. **One System, Three Business Verticals.**',
    subtext:
      'Named, published results from manufacturers running their whole workforce on HREasy — office, plant and field, on one platform.',
  },
  {
    key: 'faq',
    eyebrow: 'FAQ',
    heading: 'Questions HR Leaders **Ask Before They Commit.**',
    subtext:
      'Practical, migration- and compliance-focused answers \u2014 the questions HR and payroll leaders actually ask before switching systems.',
  },
  {
    key: 'cta',
    eyebrow: "Let's Talk About Your Workforce",
    heading: 'See Your Whole Workforce on One System \u2014 **Live, in 30 Minutes.**',
    subtext:
      "A conversation about your people, your process and your goals. We'll show you what's possible \u2014 for your actual workforce.",
  },
];

async function seedHreasySectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'hreasy', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      HREASY_SECTION_COPY.map((s) => s.key),
      HREASY_SECTION_COPY.map((s) => s.eyebrow),
      HREASY_SECTION_COPY.map((s) => s.heading),
      HREASY_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

const WMS_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: 'proof',
    eyebrow: 'Proof Strip',
    heading: "Not a Pitch. **Just What's Already Running.**",
    subtext:
      'Real, sourced operational numbers from live UpWon deployments — shown honestly, not inflated to win a headline war.',
  },
  {
    key: 'recognition',
    eyebrow: 'Recognition',
    heading: 'Built for All Types **of Warehouses**',
    subtext:
      'From cold-storage managers to multi-plant FG warehouse heads and raw-material stores managers — our platform is built to help you see yourself in every workflow.',
  },
  {
    key: 'capabilities',
    eyebrow: 'Core Capabilities',
    heading: 'Everything From the Receiving Dock to the **Dispatch Bay — In One Flow.**',
    subtext:
      'Seven connected capabilities that bring visibility, speed and control to every movement inside your warehouse.',
  },
  {
    key: 'outcomes',
    eyebrow: 'Customer Outcomes',
    /*
     * Both figures are accented, on two lines. The site's own markup breaks
     * the line after "Wastage." with a <br>, which the accent markers cannot
     * express - so the heading is stored as two lines and the parser gives
     * the component the same two back.
     */
    heading: '**15–20%** Less Wastage.\n**20–35%** Better Fulfilment Accuracy.',
    subtext:
      'Real operational impact across manufacturing and distribution — from better inventory precision and reduced wastage to faster, more accurate order fulfilment.',
  },
  {
    key: 'faq',
    eyebrow: 'FAQ',
    heading: 'Questions Warehouse & Plant Heads **Ask Before They Commit.**',
    subtext:
      'Practical answers to the rollout, integration and operational questions warehouse leaders ask before choosing a WMS.',
  },
  {
    key: 'cta',
    eyebrow: "Let's Talk About Your Warehouse",
    heading: 'See Your Warehouse on UpWon — **Live, in 30 Minutes.**',
    subtext:
      "Let's understand your warehouse, your challenges and your goals. We'll show you the impact UpWon WMS can deliver for your actual operations.",
  },
];

async function seedWmsSectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'wms', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      WMS_SECTION_COPY.map((s) => s.key),
      WMS_SECTION_COPY.map((s) => s.eyebrow),
      WMS_SECTION_COPY.map((s) => s.heading),
      WMS_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

const VMS_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: 'proof',
    eyebrow: 'Proof Strip',
    heading: "Not a Pitch. **Just What's Already Under Control.**",
    subtext:
      'Best-available operational proof from live UpWon deployments — presented honestly, without inflating results or implying unsupported VMS-specific outcomes.',
  },
  {
    key: 'capabilities',
    eyebrow: 'Core Capabilities',
    /*
     * The accent span is drawn `block` on the site, so it sits on its own
     * line - which is a newline here, not a space.
     */
    heading: 'From First Quote to Final Payment-\n**In One System.**',
    /*
     * Three separate lines on the page rather than one paragraph. Stored with
     * the newlines intact; the site splits on them.
     */
    subtext:
      'Every stage connected.\nEvery vendor interaction visible.\nEvery decision backed by data.',
  },
  {
    key: 'outcomes',
    eyebrow: 'Customer Outcomes',
    heading: 'The Proof Point This **Page Still Needs.**',
    subtext:
      'See how UpWon helps businesses bring vendors into one connected workflow — with self-service, streamlined procurement, and better visibility across the vendor base.',
  },
  {
    key: 'faq',
    eyebrow: 'FAQ',
    heading: 'Questions Procurement Leads **Ask Before They Commit.**',
    subtext:
      'Practical, adoption-focused answers to the questions procurement teams ask before bringing vendors onto a new management platform.',
  },
  {
    key: 'cta',
    eyebrow: null,
    heading: 'See Your Vendor Base\non UpWon — **Live, in 30 Minutes.**',
    subtext:
      "An invitation to a conversation about your business's own vendor relationships — not a demo request form.",
  },
];

async function seedVmsSectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'vms', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      VMS_SECTION_COPY.map((s) => s.key),
      VMS_SECTION_COPY.map((s) => s.eyebrow),
      VMS_SECTION_COPY.map((s) => s.heading),
      VMS_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

async function seedPosSectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'pos', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      POS_SECTION_COPY.map((s) => s.key),
      POS_SECTION_COPY.map((s) => s.eyebrow),
      POS_SECTION_COPY.map((s) => s.heading),
      POS_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

async function seedFmsSectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'fms', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      FMS_SECTION_COPY.map((s) => s.key),
      FMS_SECTION_COPY.map((s) => s.eyebrow),
      FMS_SECTION_COPY.map((s) => s.heading),
      FMS_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

/**
 * The Bakery & Confectionery industry page's section copy, exactly as the page
 * ships it today. The hero is absent - each slide carries its own copy.
 *
 * The CTA opens straight on its heading, so its eyebrow is null. Its heading
 * keeps the page's three-line break: a newline is a line break, and each
 * accented line is wrapped on its own because an accent never spans one.
 */
const BAKERY_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: 'trust',
    eyebrow: 'TRUSTED BY BAKERS ACROSS INDIA',
    heading: 'Powering Growth for **Bakery & Confectionery Businesses**',
    subtext:
      'From artisan bakeries to large multi-location brands, thousands trust UpWon to run their operations every day.',
  },
  {
    key: 'platform',
    eyebrow: 'Connected Technology for Bakery & Confectionery Businesses',
    heading: 'One Connected Platform for **Every Bakery & Confectionery Operation**',
    subtext:
      'From sourcing ingredients and managing production to controlling inventory, outlets, sales, and distribution—keep every part of your business working together.',
  },
  {
    key: 'helps',
    eyebrow: 'HOW UPWON HELPS',
    heading: 'One Connected **Platform** for Your Bakery Operations',
    subtext:
      'UpWon connects the key workflows behind your bakery and confectionery business—so teams can move from reactive operations to better planned, data-driven decisions.',
  },
  {
    key: 'faq',
    eyebrow: 'FAQ',
    heading: 'Questions Bakery Owners **Ask Before They Switch.**',
    subtext:
      'Practical answers to what bakery and confectionery teams want to know before moving production, inventory and outlet operations onto one platform.',
  },
  {
    key: 'cta',
    eyebrow: null,
    heading: 'Ready to Bring More\n**Control to Your**\n**Bakery Operations?**',
    subtext:
      'Connect procurement, inventory, production, and business operations with a system designed to support growing bakery and confectionery businesses.',
  },
];

async function seedBakerySectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'bakery', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      BAKERY_SECTION_COPY.map((s) => s.key),
      BAKERY_SECTION_COPY.map((s) => s.eyebrow),
      BAKERY_SECTION_COPY.map((s) => s.heading),
      BAKERY_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

/**
 * The FMCG Distribution industry page's section copy, exactly as the page ships
 * it today. The hero is absent - each slide carries its own copy - and the CTA
 * opens straight on its heading, so its eyebrow is null.
 */
const FMCG_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: 'trust',
    eyebrow: 'TRUSTED ACROSS FMCG DISTRIBUTION',
    heading: 'Powering Growth for **FMCG Distribution Businesses**',
    subtext:
      'From regional distributors to multi-location FMCG brands, teams use UpWon to keep inventory, orders, and channel operations moving every day.',
  },
  {
    key: 'platform',
    eyebrow: 'Connected Technology for FMCG Distribution Businesses',
    heading: 'Five Connected Solutions. **One Smarter Distribution Operation.**',
    subtext:
      'From procurement and inventory to warehouses, distributors, sales teams, and deliveries—keep every part of your FMCG distribution operation connected through one integrated ecosystem.',
  },
  {
    key: 'faq',
    eyebrow: 'FAQ',
    heading: 'Questions Distribution Teams **Ask Before They Switch.**',
    subtext:
      'Practical answers to what FMCG distribution teams want to know before moving inventory, orders and channel operations onto one platform.',
  },
  {
    key: 'cta',
    eyebrow: null,
    heading: 'Ready to Bring More Control to Your **FMCG Distribution Operations?**',
    subtext:
      'Connect inventory, warehouses, orders, distributors, and business operations through one platform designed to support the speed and complexity of FMCG distribution.',
  },
];

async function seedFmcgIndustrySectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'fmcg', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      FMCG_SECTION_COPY.map((s) => s.key),
      FMCG_SECTION_COPY.map((s) => s.eyebrow),
      FMCG_SECTION_COPY.map((s) => s.heading),
      FMCG_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

/**
 * The Sweets & Namkeen industry page's section copy, exactly as the page ships
 * it today. The hero is absent - each slide carries its own copy. Unlike the
 * other industry pages, this closing band opens on an eyebrow line.
 */
const SWEETS_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: 'trust',
    eyebrow: 'TRUSTED BY SWEET & NAMKEEN BUSINESSES ACROSS INDIA',
    heading: 'Powering Growth for **Sweet & Namkeen Businesses**',
    subtext:
      'From traditional sweet shops to leading snack brands and multi-outlet chains, UpWon helps you run every operation, every day.',
  },
  {
    key: 'platform',
    eyebrow: 'Connected Technology for Sweets & Namkeen Businesses',
    heading: 'One Connected Platform for **Every Sweets & Namkeen Operation**',
    subtext:
      'Keep ingredients, batches, inventory, production, outlets, distributors, and sales connected through one integrated platform designed to support growing operations.',
  },
  {
    key: 'faq',
    eyebrow: 'FAQ',
    heading: 'Questions Sweets & Namkeen Owners **Ask Before They Switch.**',
    subtext:
      'Practical answers to what sweets and namkeen teams want to know before moving production, inventory and outlet operations onto one platform.',
  },
  {
    key: 'cta',
    eyebrow: 'Real Kitchens. Real Counters. Real Growth.',
    heading: 'Ready to Bring Your **Sweets & Namkeen Operations Together?**',
    subtext:
      'Connect ingredients, production, inventory, warehouses, outlets, distributors, sales, and business operations through one platform designed to support the complexity of growing sweets and namkeen businesses.',
  },
];

async function seedSweetsSectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'sweets', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      SWEETS_SECTION_COPY.map((s) => s.key),
      SWEETS_SECTION_COPY.map((s) => s.eyebrow),
      SWEETS_SECTION_COPY.map((s) => s.heading),
      SWEETS_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

/** The Food Processing industry page's section copy, exactly as the page ships it. */
const FOOD_PROCESSING_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: "trust",
    eyebrow: "TRUSTED BY FOOD PROCESSING BUSINESSES ACROSS INDIA",
    heading: "Better Control Across **Every Stage of Food Production.**",
    subtext:
      "From incoming raw materials and production workflows to quality, inventory, warehousing, and distribution—keep every critical movement connected through one operational platform.",
  },
  {
    key: "platform",
    eyebrow: "5 Connected Solutions for Food Processing",
    heading: "Five Connected Solutions. **One Smarter Food Processing Operation.**",
    subtext:
      "From raw materials and production to warehouses, people, sales, distribution, and finished-product movement—keep every part of your food processing operation connected through one integrated ecosystem.",
  },
  {
    key: "coverage",
    eyebrow: "INDUSTRY COVERAGE",
    heading: "Built for a Wide Range of **Food Processing Businesses.**",
    subtext:
      "Every sub-sector has its own production workflows, quality requirements, and shelf-life realities. UpWon is built to support them across the categories food processing businesses actually operate in.",
  },
  {
    key: "faq",
    eyebrow: "FAQ",
    heading: "Questions Food Processing Teams **Ask Before They Switch.**",
    subtext:
      "Practical answers to what food processing teams want to know before moving production, quality and inventory operations onto one platform.",
  },
  {
    key: "cta",
    eyebrow: null,
    heading: "Ready to Bring Your **Food Processing Operations Together?**",
    subtext:
      "Connect raw materials, recipes, production, quality, inventory, warehouses, sales, distribution, and business operations through one platform designed to support the complexity of growing food processing businesses.",
  },
];

async function seedFoodProcessingSectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'food-processing', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      FOOD_PROCESSING_SECTION_COPY.map((s) => s.key),
      FOOD_PROCESSING_SECTION_COPY.map((s) => s.eyebrow),
      FOOD_PROCESSING_SECTION_COPY.map((s) => s.heading),
      FOOD_PROCESSING_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

/** The Non-Food FMCG industry page's section copy, exactly as the page ships it. */
const NON_FOOD_FMCG_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: "trust",
    eyebrow: "TRUSTED BY NON-FOOD FMCG BRANDS",
    heading: "Better Visibility Across **Products, Channels, and Operations.**",
    subtext:
      "From what you make to where it sells, every part of the operation works from the same connected information.",
  },
  {
    key: "capabilities",
    eyebrow: "CORE CAPABILITIES",
    heading: "Everything You Need. **One Connected Platform.**",
    subtext:
      "UpWon brings all key operations of your non-food FMCG business together in one connected platform.",
  },
  {
    key: "platform",
    eyebrow: "5 Connected Solutions for Non-Food FMCG",
    heading: "Five Connected Solutions. **One Smarter Non-Food FMCG Operation.**",
    subtext:
      "From products and inventory to warehouses, people, sales, distribution, and market execution—keep every part of your non-food FMCG business connected through one integrated ecosystem.",
  },
  {
    key: "benefits",
    eyebrow: "BENEFITS",
    heading: "Greater Control Over Every Channel. **Better Visibility Across Every Product Movement.**",
    subtext:
      "With UpWon, non-food FMCG businesses can connect their core operations and reduce the complexity of managing products, inventory, warehouses, sales, distributors, field teams, and distribution across multiple teams and locations.",
  },
  {
    key: "coverage",
    eyebrow: "INDUSTRY COVERAGE",
    heading: "Built for a Wide Range of **Non-Food FMCG Businesses.**",
    subtext:
      "UpWon can support connected workflows across a wide range of fast-moving consumer product categories, including:",
  },
  {
    key: "faq",
    eyebrow: "FAQ",
    heading: "Questions FMCG Brand Teams **Ask Before They Switch.**",
    subtext:
      "Practical answers to what non-food FMCG teams want to know before moving products, channels and field operations onto one platform.",
  },
  {
    key: "cta",
    eyebrow: null,
    heading: "Ready to Bring Your **Non-Food FMCG Operations Together?**",
    subtext:
      "Connect products, inventory, warehouses, sales, distributors, field teams, distribution, and business operations through one platform designed to support the complexity of growing non-food FMCG businesses.",
  },
];

async function seedNonFoodFmcgSectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'non-food-fmcg', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      NON_FOOD_FMCG_SECTION_COPY.map((s) => s.key),
      NON_FOOD_FMCG_SECTION_COPY.map((s) => s.eyebrow),
      NON_FOOD_FMCG_SECTION_COPY.map((s) => s.heading),
      NON_FOOD_FMCG_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

/** The Dairy & Ice Cream industry page's section copy, exactly as the page ships it. */
const DAIRY_SECTION_COPY: Array<{
  key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
}> = [
  {
    key: "trust",
    eyebrow: "TRUSTED BY GROWING BRANDS",
    heading: "Join the food, dairy and FMCG brands\n**running their operations on UpWon.**",
    subtext:
      "Teams across bakery, sweets, dairy, and FMCG use UpWon to keep production, inventory, warehouses, sales, and distribution connected across their locations.",
  },
  {
    key: "capabilities",
    eyebrow: "CORE CAPABILITIES",
    heading: "Built to Simplify. Connected to Scale. **Designed for Dairy & Ice Cream Operations.**",
    subtext:
      "From raw materials to final delivery, UpWon brings all the moving parts of your operations together—so you can work smarter, move faster, and grow with confidence.",
  },
  {
    key: "platform",
    eyebrow: "5 Connected Solutions for Dairy & Ice Cream",
    heading: "Five Connected Solutions. **One Smarter Dairy & Ice Cream Operation.**",
    subtext:
      "From raw materials and production to cold storage, warehouses, people, sales, distribution, and finished-product movement—keep every part of your dairy and ice cream operation connected through one integrated ecosystem.",
  },
  {
    key: "benefits",
    eyebrow: "THE BENEFITS",
    heading: "Greater Control Over Every Batch. **Better Visibility Across Every Product Movement.**",
    subtext:
      "With UpWon, dairy and ice cream businesses can connect their core operations and reduce the complexity of managing raw materials, production, quality, inventory, cold storage, warehouses, sales, and distribution across multiple teams and locations.",
  },
  {
    key: "coverage",
    eyebrow: "INDUSTRY COVERAGE",
    heading: "Built for a Wide Range of\n**Dairy & Ice Cream Businesses.**",
    subtext:
      "UpWon can support connected workflows across dairy and frozen product categories, including:",
  },
  {
    key: "faq",
    eyebrow: "FAQ",
    heading: "Questions Dairy Teams **Ask Before They Switch.**",
    subtext:
      "Practical answers to what dairy and ice cream teams want to know before moving production, quality and distribution onto one platform.",
  },
  {
    key: "cta",
    eyebrow: null,
    heading: "Ready to Bring Your **Dairy & Ice Cream Operations Together?**",
    subtext:
      "Connect raw materials, production, quality, inventory, cold storage, warehouses, sales, distribution, and business operations through one platform designed to support growing dairy and ice cream businesses.",
  },
];

async function seedDairySectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'dairy', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      DAIRY_SECTION_COPY.map((s) => s.key),
      DAIRY_SECTION_COPY.map((s) => s.eyebrow),
      DAIRY_SECTION_COPY.map((s) => s.heading),
      DAIRY_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

async function seedSfaSectionCopy(client: PoolClient): Promise<number> {
  const result = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    SELECT 'sfa-dms', u.key, u.eyebrow, u.heading, u.subtext
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS u(key, eyebrow, heading, subtext)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [
      SFA_SECTION_COPY.map((s) => s.key),
      SFA_SECTION_COPY.map((s) => s.eyebrow),
      SFA_SECTION_COPY.map((s) => s.heading),
      SFA_SECTION_COPY.map((s) => s.subtext),
    ],
  );
  return result.rowCount ?? 0;
}

async function seedErpHeroSlides(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM erp_hero_slides',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO erp_hero_slides
      (eyebrow, headline, subhead, micro_trust,
       cta_label, cta_href, secondary_label, secondary_href,
       image_url, display_order, status)
    SELECT u.eyebrow, u.headline, u.subhead, $1, $2, $3, $4, $5,
           u.image_url, u.position, 'ACTIVE'
      FROM unnest($6::text[], $7::text[], $8::text[], $9::text[], $10::int[])
        AS u(eyebrow, headline, subhead, image_url, position)
    `,
    [
      ERP_HERO_MICRO_TRUST,
      ERP_HERO_CTA.label,
      ERP_HERO_CTA.href,
      ERP_HERO_SECONDARY.label,
      ERP_HERO_SECONDARY.href,
      ERP_HERO_SLIDES.map((s) => s.eyebrow),
      ERP_HERO_SLIDES.map((s) => s.headline),
      ERP_HERO_SLIDES.map((s) => s.subhead),
      ERP_HERO_SLIDES.map((s) => s.imageUrl),
      ERP_HERO_SLIDES.map((_s, i) => i),
    ],
  );
  return result.rowCount ?? 0;
}

/** The six due-diligence questions the page asks before its closing CTA. */
const ERP_FAQS: Array<{ question: string; answer: string }> = [
  {
    question: 'What exactly is UPWON ERP, and which businesses is it built for?',
    answer:
      'UPWON ERP is the operational backbone for food and FMCG manufacturers — production, quality, inventory & stores, procurement, plant-side sales & billing, finance and compliance on one data model. It is built specifically for bakery & confectionery, dairy, sweets & namkeen, snacks, beverages and spices — not a generic ERP retrofitted for food.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'It lands at a fraction of the 3-year total cost of ownership of SAP Business One or Oracle NetSuite at comparable ERP depth — with no long, expensive implementation bill. Exact pricing depends on plants, users and modules, so we scope a firm number against your operation on a short call.',
  },
  {
    question: 'Do you handle data migration from our current system?',
    answer:
      'Yes. Moving, cleaning and validating your existing data — item masters, opening stock, ledgers — is a defined stage of the rollout (roughly Day 16—25), with validation checkpoints before go-live. You are never handed a blank system to fill in yourself.',
  },
  {
    question: 'Is it FSSAI, GST and e-invoicing compliant?',
    answer:
      'Compliance is native, not a bolt-on. FSSAI dossiers are auto-generated per batch, and GST and e-invoicing are built into the core data model — so audits become a one-click export rather than a month-end scramble.',
  },
  {
    question: 'What support do we get after go-live?',
    answer:
      'You stay connected to the team that actually builds the product — direct implementation and support access, not layers of SI partners and tickets. Support continues as an ongoing partnership after launch, not a hand-off.',
  },
  {
    question: 'Can it be customised to our specific workflow?',
    answer:
      'UPWON is configured around your existing processes during rollout (roughly Day 6—15) using business-specific workflows — so it fits how your plant already runs, without an open-ended, costly custom-build project.',
  },
];

async function seedErpFaqEntries(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM erp_faq_entries',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO erp_faq_entries (question, answer, display_order, status)
    SELECT u.question, u.answer, u.position, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::int[])
        AS u(question, answer, position)
    `,
    [
      ERP_FAQS.map((f) => f.question),
      ERP_FAQS.map((f) => f.answer),
      ERP_FAQS.map((_f, i) => i),
    ],
  );
  return result.rowCount ?? 0;
}

/** The closing band: its two backgrounds and its single button. */
async function seedErpCtaSection(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM erp_cta_section',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO erp_cta_section
      (desktop_image_url, mobile_image_url, button_label, button_href)
    VALUES ($1, $2, $3, $4)
    `,
    ['/images/erp_cta.webp', '/images/erp_cta_mobile.webp', 'Talk to an Industry Specialist', '/demo'],
  );
  return result.rowCount ?? 0;
}

/**
 * The ERP proof strip - the same six brand logos and four scale counters the
 * shared TrustSection ships, which is what the page renders today.
 *
 * Zipped into rows the way the home page's strip is: entry N carries logo N
 * and counter N, and the run continues to the longer of the two, so the last
 * two entries are logo-only.
 */
async function seedErpTrustEntries(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM erp_trust_entries',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const rows = Math.max(TRUST_LOGOS.length, TRUST_STATS.length);
  const result = await client.query(
    `
    INSERT INTO erp_trust_entries
      (image_url, image_alt, stat_value, stat_label, display_order, status)
    SELECT u.image_url, u.image_alt, u.stat_value, u.stat_label, u.position, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
        AS u(image_url, image_alt, stat_value, stat_label, position)
    `,
    [
      Array.from({ length: rows }, (_, i) => TRUST_LOGOS[i]?.imageUrl ?? null),
      Array.from({ length: rows }, (_, i) => TRUST_LOGOS[i]?.alt ?? null),
      Array.from({ length: rows }, (_, i) => TRUST_STATS[i]?.value ?? null),
      Array.from({ length: rows }, (_, i) => TRUST_STATS[i]?.label ?? null),
      Array.from({ length: rows }, (_, i) => i),
    ],
  );

  return result.rowCount ?? 0;
}

async function main(): Promise<void> {
  try {
    const summary = await withTransaction(async (client) => {
      const permissionCount = await seedPermissions(client);
      await seedRoles(client);
      await seedSettings(client);
      const heroSlideCount = await seedHomeHeroSlides(client);
      const trustEntryCount = await seedHomeTrustEntries(client);
      const industriesEntryCount = await seedHomeIndustriesEntries(client);
      const valuesEntryCount = await seedHomeValuesEntries(client);
      const integrationsEntryCount = await seedHomeIntegrationsEntries(client);
      const testimonialEntryCount = await seedHomeTestimonialEntries(client);
      const faqEntryCount = await seedHomeFaqEntries(client);
      const sectionCopyCount = await seedHomeSectionCopy(client);
      const ctaSectionCount = await seedHomeCtaSection(client);
      const erpSectionCopyCount = await seedErpSectionCopy(client);
      const erpHeroSlideCount = await seedErpHeroSlides(client);
      const erpTrustEntryCount = await seedErpTrustEntries(client);
      const erpFaqEntryCount = await seedErpFaqEntries(client);
      const erpCtaSectionCount = await seedErpCtaSection(client);
      const erpRecognition = await seedErpIndustries(client);
      const erpJourney = await seedErpJourney(client);
      const erpComparison = await seedErpComparison(client);
      const erpOutcomeCards = await seedErpOutcomes(client);
      const erpEstablisherBadges = await seedErpEstablishers(client);
      const sfaSectionCopyCount = await seedSfaSectionCopy(client);
      const sfaDmsPage = await seedSfaDmsPage(client);
      const fmsSectionCopyCount = await seedFmsSectionCopy(client);
      const fmsPage = await seedFmsPage(client);
      const posSectionCopyCount = await seedPosSectionCopy(client);
      const posPage = await seedPosPage(client);
      const hreasySectionCopyCount = await seedHreasySectionCopy(client);
      const hreasyPage = await seedHreasyPage(client);
      const wmsSectionCopyCount = await seedWmsSectionCopy(client);
      const wmsPage = await seedWmsPage(client);
      const vmsSectionCopyCount = await seedVmsSectionCopy(client);
      const vendorPortalPage = await seedVendorPortalPage(client);
      const engineeringManufacturingPage = await seedEngineeringManufacturingPage(client);
      const beveragePage = await seedBeveragePage(client);
      const spicesAgroPage = await seedSpicesAgroPage(client);
      const qsrFranchisePage = await seedQsrFranchisePage(client);
      const whyUpwonPage = await seedWhyUpwonPage(client);
      const insiderHeroSlideCount = await seedInsiderHeroSlides(client);
      const insiderIssueCounts = await seedInsiderIssues(client);
      const insiderFeatureCount = await seedInsiderFeatureSection(client);
      const clientsHeroSlideCount = await seedClientsHeroSlides(client);
      const clientsSectionCopyCount = await seedClientsSectionCopy(client);
      const clientsCaseCardCount = await seedClientsCaseCards(client);
      const clientsCaseStoryCount = await seedClientsCaseStories(client);
      const clientsRosterLogoCount = await seedClientsRosterLogos(client);
      const clientsNetworkStateCount = await seedClientsNetworkStates(client);
      const clientsTestimonialCount = await seedClientsTestimonials(client);
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
      const socialContactLineCount = await seedSocialContactLines(client);
      const socialLinkCount = await seedSocialLinks(client);
      const blogHeroSlideCount = await seedBlogHeroSlides(client);
      const blogTopicsCount = await seedBlogTopicsSection(client);
      // Categories first: the posts are filed under them by slug.
      const blogCategoryCount = await seedBlogCategories(client);
      const blogPostCount = await seedBlogPosts(client);
      const bakerySectionCopyCount = await seedBakerySectionCopy(client);
      const bakeryPage = await seedBakeryPage(client);
      const fmcgSectionCopyCount = await seedFmcgIndustrySectionCopy(client);
      const fmcgPage = await seedFmcgPage(client);
      const sweetsSectionCopyCount = await seedSweetsSectionCopy(client);
      const sweetsPage = await seedSweetsPage(client);
      const foodProcessingSectionCopyCount = await seedFoodProcessingSectionCopy(client);
      const foodProcessingPage = await seedFoodProcessingPage(client);
      const nonFoodFmcgSectionCopyCount = await seedNonFoodFmcgSectionCopy(client);
      const nonFoodFmcgPage = await seedNonFoodFmcgPage(client);
      const dairySectionCopyCount = await seedDairySectionCopy(client);
      const dairyPage = await seedDairyPage(client);
      const freeAuditHeroSlideCount = await seedFreeAuditHeroSlides(client);
      const kbHeroSlideCount = await seedKbHeroSlides(client);
      // Categories first: the articles are filed under them by slug.
      const kbCategoryCount = await seedKbCategories(client);
      const kbArticleCount = await seedKbArticles(client);
      const vsSapHeroSlideCount = await seedVsSapHeroSlides(client);
      const vsSapAnswerSectionCount = await seedVsSapAnswerSection(client);
      const vsSapComparisonSectionCount = await seedVsSapComparisonSection(client);
      const vsSapCapabilityCount = await seedVsSapCapabilities(client);
      const rootAdmin = await seedRootAdmin(client);
      return {
        permissionCount,
        heroSlideCount,
        trustEntryCount,
        industriesEntryCount,
        valuesEntryCount,
        integrationsEntryCount,
        testimonialEntryCount,
        faqEntryCount,
        sectionCopyCount,
        ctaSectionCount,
        erpSectionCopyCount,
        erpHeroSlideCount,
        erpTrustEntryCount,
        erpFaqEntryCount,
        erpCtaSectionCount,
        erpRecognition,
        erpJourney,
        erpComparison,
        erpOutcomeCards,
        erpEstablisherBadges,
        sfaSectionCopyCount,
        sfaDmsPage,
        fmsSectionCopyCount,
        fmsPage,
        posSectionCopyCount,
        posPage,
        hreasySectionCopyCount,
        wmsSectionCopyCount,
        wmsPage,
        vmsSectionCopyCount,
        vendorPortalPage,
        hreasyPage,
        engineeringManufacturingPage,
        beveragePage,
        spicesAgroPage,
        qsrFranchisePage,
        whyUpwonPage,
        insiderHeroSlideCount,
        insiderIssueCounts,
        insiderFeatureCount,
        clientsHeroSlideCount,
        clientsSectionCopyCount,
        clientsCaseCardCount,
        clientsCaseStoryCount,
        clientsRosterLogoCount,
        clientsNetworkStateCount,
        clientsTestimonialCount,
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
        socialContactLineCount,
        socialLinkCount,
        blogHeroSlideCount,
        blogTopicsCount,
        blogCategoryCount,
        blogPostCount,
        bakerySectionCopyCount,
        bakeryPage,
        fmcgSectionCopyCount,
        fmcgPage,
        sweetsSectionCopyCount,
        sweetsPage,
        foodProcessingSectionCopyCount,
        foodProcessingPage,
        nonFoodFmcgSectionCopyCount,
        nonFoodFmcgPage,
        dairySectionCopyCount,
        dairyPage,
        freeAuditHeroSlideCount,
        kbHeroSlideCount,
        kbCategoryCount,
        kbArticleCount,
        vsSapHeroSlideCount,
        vsSapAnswerSectionCount,
        vsSapComparisonSectionCount,
        vsSapCapabilityCount,
        rootAdmin,
      };
    });

    logger.info('Seed complete', {
      permissions: summary.permissionCount,
      roles: Object.keys(SYSTEM_ROLES).length,
      homeHeroSlides: summary.heroSlideCount,
      homeTrustEntries: summary.trustEntryCount,
      homeIndustriesEntries: summary.industriesEntryCount,
      homeValuesEntries: summary.valuesEntryCount,
      homeIntegrationsEntries: summary.integrationsEntryCount,
      homeTestimonialEntries: summary.testimonialEntryCount,
      homeFaqEntries: summary.faqEntryCount,
      homeSectionCopy: summary.sectionCopyCount,
      homeCtaSection: summary.ctaSectionCount,
      erpSectionCopy: summary.erpSectionCopyCount,
      erpHeroSlides: summary.erpHeroSlideCount,
      erpTrustEntries: summary.erpTrustEntryCount,
      erpFaqEntries: summary.erpFaqEntryCount,
      erpCtaSection: summary.erpCtaSectionCount,
      erpIndustries: summary.erpRecognition.industries,
      erpIndustryFeatures: summary.erpRecognition.features,
      erpIndustryBenefits: summary.erpRecognition.benefits,
      erpJourneyPersonas: summary.erpJourney.personas,
      erpJourneyOutcomes: summary.erpJourney.outcomes,
      erpJourneyPoints: summary.erpJourney.points,
      erpJourneyStats: summary.erpJourney.stats,
      comparisonColumns: summary.erpComparison.columns,
      comparisonCategories: summary.erpComparison.categories,
      comparisonRows: summary.erpComparison.rows,
      comparisonValues: summary.erpComparison.values,
      erpOutcomeCards: summary.erpOutcomeCards,
      erpEstablisherBadges: summary.erpEstablisherBadges,
      sfaSectionCopy: summary.sfaSectionCopyCount,
      sfaHeroSlides: summary.sfaDmsPage.heroSlides,
      sfaFaqEntries: summary.sfaDmsPage.faqEntries,
      sfaCtaSection: summary.sfaDmsPage.ctaSection,
      sfaProofPanel: summary.sfaDmsPage.proofPanel,
      sfaProofLogos: summary.sfaDmsPage.proofLogos,
      sfaProofStats: summary.sfaDmsPage.proofStats,
      sfaVideoEntries: summary.sfaDmsPage.videoEntries,
      sfaPackageCards: summary.sfaDmsPage.packageCards,
      sfaPackageFeatures: summary.sfaDmsPage.packageFeatures,
      sfaCompliancePanels: summary.sfaDmsPage.compliancePanels,
      sfaComplianceBadges: summary.sfaDmsPage.complianceBadges,
      sfaAlternativesColumns: summary.sfaDmsPage.alternativesColumns,
      sfaAlternativesRows: summary.sfaDmsPage.alternativesRows,
      sfaAlternativesCells: summary.sfaDmsPage.alternativesCells,
      sfaOutcomeButtons: summary.sfaDmsPage.outcomeButtons,
      sfaOutcomeCards: summary.sfaDmsPage.outcomeCards,
      fmsSectionCopy: summary.fmsSectionCopyCount,
      fmsHeroSlides: summary.fmsPage.heroSlides,
      fmsFaqEntries: summary.fmsPage.faqEntries,
      fmsCtaSection: summary.fmsPage.ctaSection,
      fmsProofLogos: summary.fmsPage.proofLogos,
      fmsProofStats: summary.fmsPage.proofStats,
      fmsFranchiseCategories: summary.fmsPage.franchiseCategories,
      fmsFranchiseSteps: summary.fmsPage.franchiseSteps,
      fmsFranchiseBenefits: summary.fmsPage.franchiseBenefits,
      fmsVideoEntries: summary.fmsPage.videoEntries,
      fmsIntegrationLogos: summary.fmsPage.integrationLogos,
      fmsGrowthTiers: summary.fmsPage.growthTiers,
      fmsGrowthFeatures: summary.fmsPage.growthFeatures,
      fmsAlternativesColumns: summary.fmsPage.alternativesColumns,
      fmsAlternativesRows: summary.fmsPage.alternativesRows,
      fmsAlternativesCells: summary.fmsPage.alternativesCells,
      fmsOutcomeStories: summary.fmsPage.outcomeStories,
      fmsOutcomeStats: summary.fmsPage.outcomeStats,
      posSectionCopy: summary.posSectionCopyCount,
      posHeroSlides: summary.posPage.heroSlides,
      posFaqEntries: summary.posPage.faqEntries,
      posCtaSection: summary.posPage.ctaSection,
      posProofLogos: summary.posPage.proofLogos,
      posProofStats: summary.posPage.proofStats,
      posRecognitionCategories: summary.posPage.recognitionCategories,
      posVideoEntries: summary.posPage.videoEntries,
      posGrowthSection: summary.posPage.growthSection,
      posGrowthTiers: summary.posPage.growthTiers,
      posGrowthFeatures: summary.posPage.growthFeatures,
      posSecuritySection: summary.posPage.securitySection,
      posSecurityBadges: summary.posPage.securityBadges,
      posSecurityLogos: summary.posPage.securityLogos,
      posSecurityAssurances: summary.posPage.securityAssurances,
      posAlternativesColumns: summary.posPage.alternativesColumns,
      posAlternativesRows: summary.posPage.alternativesRows,
      posAlternativesCells: summary.posPage.alternativesCells,
      posOutcomeStories: summary.posPage.outcomeStories,
      wmsSectionCopy: summary.wmsSectionCopyCount,
      vmsSectionCopy: summary.vmsSectionCopyCount,
      vmsHeroSlides: summary.vendorPortalPage.heroSlides,
      vmsProofTiles: summary.vendorPortalPage.proofTiles,
      vmsCapabilityCards: summary.vendorPortalPage.capabilityCards,
      vmsOutcomeVideos: summary.vendorPortalPage.outcomeVideos,
      vmsFaqEntries: summary.vendorPortalPage.faqEntries,
      vmsCtaSection: summary.vendorPortalPage.ctaSection,
      wmsHeroSlides: summary.wmsPage.heroSlides,
      wmsProofCards: summary.wmsPage.proofCards,
      wmsProofSlides: summary.wmsPage.proofSlides,
      wmsRecognitionCards: summary.wmsPage.recognitionCards,
      wmsCapabilityModules: summary.wmsPage.capabilityModules,
      wmsOutcomeCards: summary.wmsPage.outcomeCards,
      wmsFaqEntries: summary.wmsPage.faqEntries,
      wmsCtaSection: summary.wmsPage.ctaSection,
      wmsCtaTrustItems: summary.wmsPage.ctaTrustItems,
      hreasySectionCopy: summary.hreasySectionCopyCount,
      hreasyHeroSlides: summary.hreasyPage.heroSlides,
      hreasyCapabilityModules: summary.hreasyPage.capabilityModules,
      hreasyLifecycleCards: summary.hreasyPage.lifecycleCards,
      hreasyPackageTiers: summary.hreasyPage.packageTiers,
      hreasyPackageFeatures: summary.hreasyPage.packageFeatures,
      hreasyAlternativesColumns: summary.hreasyPage.alternativesColumns,
      hreasyAlternativesRows: summary.hreasyPage.alternativesRows,
      hreasyAlternativesCells: summary.hreasyPage.alternativesCells,
      hreasyOutcomeStories: summary.hreasyPage.outcomeStories,
      hreasyOutcomeStats: summary.hreasyPage.outcomeStats,
      hreasyFaqEntries: summary.hreasyPage.faqEntries,
      hreasyCtaSection: summary.hreasyPage.ctaSection,
      hreasyCtaTrustItems: summary.hreasyPage.ctaTrustItems,
      hreasyProofTiles: summary.hreasyPage.proofTiles,
      hreasyProofCells: summary.hreasyPage.proofCells,
      engineeringHeroSlides: summary.engineeringManufacturingPage.heroSlides,
      engineeringTrustCopy: summary.engineeringManufacturingPage.trustCopy,
      engineeringTrustCards: summary.engineeringManufacturingPage.trustCards,
      engineeringTrustLogos: summary.engineeringManufacturingPage.trustLogos,
      engineeringCapabilitiesCopy: summary.engineeringManufacturingPage.capabilitiesCopy,
      engineeringCapabilities: summary.engineeringManufacturingPage.capabilities,
      engineeringPlatformCopy: summary.engineeringManufacturingPage.platformCopy,
      engineeringPlatformPanel: summary.engineeringManufacturingPage.platformPanel,
      engineeringPlatformWorkflows: summary.engineeringManufacturingPage.platformWorkflows,
      engineeringCoverageCopy: summary.engineeringManufacturingPage.coverageCopy,
      engineeringCoveragePanel: summary.engineeringManufacturingPage.coveragePanel,
      engineeringCoverageCategories: summary.engineeringManufacturingPage.coverageCategories,
      engineeringFaqCopy: summary.engineeringManufacturingPage.faqCopy,
      engineeringFaqEntries: summary.engineeringManufacturingPage.faqEntries,
      engineeringCtaCopy: summary.engineeringManufacturingPage.ctaCopy,
      engineeringCtaSection: summary.engineeringManufacturingPage.ctaSection,
      beverageHeroSlides: summary.beveragePage.heroSlides,
      beverageTrustCopy: summary.beveragePage.trustCopy,
      beverageTrustStats: summary.beveragePage.trustStats,
      beverageTrustLogos: summary.beveragePage.trustLogos,
      beverageCapabilitiesCopy: summary.beveragePage.capabilitiesCopy,
      beverageCapabilitiesPanel: summary.beveragePage.capabilitiesPanel,
      beverageCapabilities: summary.beveragePage.capabilities,
      beveragePlatformCopy: summary.beveragePage.platformCopy,
      beveragePlatformPanel: summary.beveragePage.platformPanel,
      beveragePlatformWorkflows: summary.beveragePage.platformWorkflows,
      beverageCoverageCopy: summary.beveragePage.coverageCopy,
      beverageCoverageCategories: summary.beveragePage.coverageCategories,
      beverageFaqCopy: summary.beveragePage.faqCopy,
      beverageFaqEntries: summary.beveragePage.faqEntries,
      beverageCtaCopy: summary.beveragePage.ctaCopy,
      beverageCtaSection: summary.beveragePage.ctaSection,
      spicesAgroHeroSlides: summary.spicesAgroPage.heroSlides,
      spicesAgroTrustCopy: summary.spicesAgroPage.trustCopy,
      spicesAgroTrustLogos: summary.spicesAgroPage.trustLogos,
      spicesAgroTrustPanel: summary.spicesAgroPage.trustPanel,
      spicesAgroCapabilitiesCopy: summary.spicesAgroPage.capabilitiesCopy,
      spicesAgroCapabilitiesPanel: summary.spicesAgroPage.capabilitiesPanel,
      spicesAgroCapabilities: summary.spicesAgroPage.capabilities,
      spicesAgroPlatformCopy: summary.spicesAgroPage.platformCopy,
      spicesAgroPlatformPanel: summary.spicesAgroPage.platformPanel,
      spicesAgroPlatformGroups: summary.spicesAgroPage.platformGroups,
      spicesAgroCoverageCopy: summary.spicesAgroPage.coverageCopy,
      spicesAgroCoverageCategories: summary.spicesAgroPage.coverageCategories,
      spicesAgroFaqCopy: summary.spicesAgroPage.faqCopy,
      spicesAgroFaqEntries: summary.spicesAgroPage.faqEntries,
      spicesAgroCtaCopy: summary.spicesAgroPage.ctaCopy,
      spicesAgroCtaSection: summary.spicesAgroPage.ctaSection,
      qsrFranchiseHeroSlides: summary.qsrFranchisePage.heroSlides,
      qsrFranchiseTrustCopy: summary.qsrFranchisePage.trustCopy,
      qsrFranchiseTrustLogos: summary.qsrFranchisePage.trustLogos,
      qsrFranchiseTrustStats: summary.qsrFranchisePage.trustStats,
      qsrFranchiseTrustPanel: summary.qsrFranchisePage.trustPanel,
      qsrFranchiseCapabilitiesCopy: summary.qsrFranchisePage.capabilitiesCopy,
      qsrFranchiseCapabilitiesPanel: summary.qsrFranchisePage.capabilitiesPanel,
      qsrFranchiseCapabilities: summary.qsrFranchisePage.capabilities,
      qsrFranchisePlatformCopy: summary.qsrFranchisePage.platformCopy,
      qsrFranchisePlatformPanel: summary.qsrFranchisePage.platformPanel,
      qsrFranchisePlatformWorkflows: summary.qsrFranchisePage.platformWorkflows,
      qsrFranchiseCoverageCopy: summary.qsrFranchisePage.coverageCopy,
      qsrFranchiseCoverageCategories: summary.qsrFranchisePage.coverageCategories,
      qsrFranchiseFaqCopy: summary.qsrFranchisePage.faqCopy,
      qsrFranchiseFaqEntries: summary.qsrFranchisePage.faqEntries,
      qsrFranchiseCtaCopy: summary.qsrFranchisePage.ctaCopy,
      qsrFranchiseCtaSection: summary.qsrFranchisePage.ctaSection,
      whyUpwonHeroCopy: summary.whyUpwonPage.heroCopy,
      whyUpwonHeroSection: summary.whyUpwonPage.heroSection,
      whyUpwonIndustriesCopy: summary.whyUpwonPage.industriesCopy,
      whyUpwonIndustries: summary.whyUpwonPage.industries,
      whyUpwonTestimonialsCopy: summary.whyUpwonPage.testimonialsCopy,
      whyUpwonTestimonialsPanel: summary.whyUpwonPage.testimonialsPanel,
      whyUpwonTestimonials: summary.whyUpwonPage.testimonials,
      whyUpwonClientLogos: summary.whyUpwonPage.clientLogos,
      whyUpwonProofCopy: summary.whyUpwonPage.proofCopy,
      whyUpwonProofPanel: summary.whyUpwonPage.proofPanel,
      whyUpwonProofCallouts: summary.whyUpwonPage.proofCallouts,
      whyUpwonResultsCopy: summary.whyUpwonPage.resultsCopy,
      whyUpwonResultsPanel: summary.whyUpwonPage.resultsPanel,
      whyUpwonResults: summary.whyUpwonPage.results,
      whyUpwonCtaCopy: summary.whyUpwonPage.ctaCopy,
      whyUpwonCtaSection: summary.whyUpwonPage.ctaSection,
      insiderHeroSlides: summary.insiderHeroSlideCount,
      insiderIssues: summary.insiderIssueCounts.issues,
      insiderStories: summary.insiderIssueCounts.stories,
      insiderFeatureSection: summary.insiderFeatureCount,
      clientsHeroSlides: summary.clientsHeroSlideCount,
      clientsSectionCopy: summary.clientsSectionCopyCount,
      clientsCaseCards: summary.clientsCaseCardCount,
      clientsCaseStories: summary.clientsCaseStoryCount,
      clientsRosterLogos: summary.clientsRosterLogoCount,
      clientsNetworkStates: summary.clientsNetworkStateCount,
      clientsTestimonials: summary.clientsTestimonialCount,
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
      socialContactLines: summary.socialContactLineCount,
      socialLinks: summary.socialLinkCount,
      blogHeroSlides: summary.blogHeroSlideCount,
      blogTopicsSection: summary.blogTopicsCount,
      blogCategories: summary.blogCategoryCount,
      blogPosts: summary.blogPostCount,
      bakerySectionCopy: summary.bakerySectionCopyCount,
      bakeryHeroSlides: summary.bakeryPage.heroSlides,
      bakeryTrustLogos: summary.bakeryPage.trustLogos,
      bakeryTrustStats: summary.bakeryPage.trustStats,
      bakeryPlatformTiles: summary.bakeryPage.platformTiles,
      bakeryHelpVisuals: summary.bakeryPage.helpVisuals,
      bakeryFaqEntries: summary.bakeryPage.faqEntries,
      bakeryCtaSection: summary.bakeryPage.ctaSection,
      bakeryCtaFeatures: summary.bakeryPage.ctaFeatures,
      fmcgSectionCopy: summary.fmcgSectionCopyCount,
      fmcgHeroSlides: summary.fmcgPage.heroSlides,
      fmcgTrustLogos: summary.fmcgPage.trustLogos,
      fmcgTrustStats: summary.fmcgPage.trustStats,
      fmcgPlatformTiles: summary.fmcgPage.platformTiles,
      fmcgFaqEntries: summary.fmcgPage.faqEntries,
      fmcgCtaSection: summary.fmcgPage.ctaSection,
      sweetsSectionCopy: summary.sweetsSectionCopyCount,
      sweetsHeroSlides: summary.sweetsPage.heroSlides,
      sweetsTrustLogos: summary.sweetsPage.trustLogos,
      sweetsTrustStats: summary.sweetsPage.trustStats,
      sweetsPlatformTiles: summary.sweetsPage.platformTiles,
      sweetsFaqEntries: summary.sweetsPage.faqEntries,
      sweetsCtaSection: summary.sweetsPage.ctaSection,
      foodProcessingSectionCopy: summary.foodProcessingSectionCopyCount,
      foodProcessingHeroSlides: summary.foodProcessingPage.heroSlides,
      foodProcessingTrustLogos: summary.foodProcessingPage.trustLogos,
      foodProcessingTrustStats: summary.foodProcessingPage.trustStats,
      foodProcessingCoverageItems: summary.foodProcessingPage.coverageItems,
      foodProcessingPlatformTiles: summary.foodProcessingPage.platformTiles,
      foodProcessingFaqEntries: summary.foodProcessingPage.faqEntries,
      foodProcessingTrustPanel: summary.foodProcessingPage.trustPanel,
      foodProcessingCtaSection: summary.foodProcessingPage.ctaSection,
      nonFoodFmcgSectionCopy: summary.nonFoodFmcgSectionCopyCount,
      nonFoodFmcgHeroSlides: summary.nonFoodFmcgPage.heroSlides,
      nonFoodFmcgTrustLogos: summary.nonFoodFmcgPage.trustLogos,
      nonFoodFmcgTrustStats: summary.nonFoodFmcgPage.trustStats,
      nonFoodFmcgCapabilityCards: summary.nonFoodFmcgPage.capabilityCards,
      nonFoodFmcgBenefitItems: summary.nonFoodFmcgPage.benefitItems,
      nonFoodFmcgCoverageItems: summary.nonFoodFmcgPage.coverageItems,
      nonFoodFmcgPlatformTiles: summary.nonFoodFmcgPage.platformTiles,
      nonFoodFmcgFaqEntries: summary.nonFoodFmcgPage.faqEntries,
      nonFoodFmcgCoveragePanel: summary.nonFoodFmcgPage.coveragePanel,
      nonFoodFmcgCtaSection: summary.nonFoodFmcgPage.ctaSection,
      dairySectionCopy: summary.dairySectionCopyCount,
      dairyHeroSlides: summary.dairyPage.heroSlides,
      dairyTrustLogos: summary.dairyPage.trustLogos,
      dairyTrustStats: summary.dairyPage.trustStats,
      dairyCapabilityCards: summary.dairyPage.capabilityCards,
      dairyBenefitItems: summary.dairyPage.benefitItems,
      dairyCoverageItems: summary.dairyPage.coverageItems,
      dairyPlatformTiles: summary.dairyPage.platformTiles,
      dairyFaqEntries: summary.dairyPage.faqEntries,
      dairyCapabilitiesPanel: summary.dairyPage.capabilitiesPanel,
      dairyBenefitsPanel: summary.dairyPage.benefitsPanel,
      dairyCtaSection: summary.dairyPage.ctaSection,
      freeAuditHeroSlides: summary.freeAuditHeroSlideCount,
      kbHeroSlides: summary.kbHeroSlideCount,
      kbCategories: summary.kbCategoryCount,
      kbArticles: summary.kbArticleCount,
      vsSapHeroSlides: summary.vsSapHeroSlideCount,
      vsSapAnswerSection: summary.vsSapAnswerSectionCount,
      vsSapComparisonSection: summary.vsSapComparisonSectionCount,
      vsSapCapabilities: summary.vsSapCapabilityCount,
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
