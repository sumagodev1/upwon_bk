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
import { logger } from '../../core/utils/logger';

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
