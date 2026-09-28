// src/database/seeds/sweets.seed.ts

import { PoolClient } from 'pg';

/**
 * The Sweets & Namkeen industry page, exactly as it renders today: the three
 * hero slides, the trust logos and figures, the platform tiles, the six FAQ
 * questions and the closing band.
 *
 * Every list is seeded only when its table is empty, so re-running the seed
 * never duplicates a row and never overwrites what an editor has changed. A
 * table whose rows were all soft-deleted is not empty, so deleted content is
 * never brought back.
 *
 * The copy that heads each section is seeded alongside the other pages' in
 * seed.ts, under ('sweets', <section>).
 */

const EYEBROW = 'SWEETS & NAMKEEN';
const CTA = { label: 'Request a Demo', href: '/demo' };
const SECONDARY = { label: 'Explore UpWon for Sweets & Namkeen', href: '/what-is-upwon' };

const HERO_SLIDES = [
  {
    headline: 'From Raw Ingredients to Every Shelf — Keep Operations Connected.',
    subhead:
      'Bring procurement, production, inventory, warehouse operations, sales, and distribution together so every product moves through your business with greater visibility and control.',
    imageUrl: '/images/sweet_hero_1.webp',
  },
  {
    headline: 'Make More. Move Faster — Manage Everything in One Flow.',
    subhead:
      'Connect every stage of your sweets and namkeen operations—from raw materials and production to stock, outlets, distributors, and sales—through one integrated platform.',
    imageUrl: '/images/sweet_hero_2.webp',
  },
  {
    headline: 'Every Batch, Location, and Sales Channel — One Connected System.',
    subhead:
      'Keep production, inventory, warehouses, outlets, distributors, and business operations working from connected information—so your teams can move faster with better visibility across the business.',
    imageUrl: '/images/sweet_hero_3.webp',
  },
];

/** In the marquee's order, which leads with the two sweets brands. */
const TRUST_LOGOS = [
  { alt: 'Kaka Halwai', imageUrl: '/images/testimonial/kaka%20halwai.webp' },
  { alt: 'Gokul', imageUrl: '/images/testimonial/gokul.webp' },
  { alt: 'Winni', imageUrl: '/images/testimonial/winni.webp' },
  { alt: 'Monginis', imageUrl: '/images/testimonial/mongignis.webp' },
  { alt: 'U2 Cake', imageUrl: '/images/testimonial/u2cake.webp' },
  { alt: 'OFC', imageUrl: '/images/testimonial/ofc.webp' },
];

/** Icon names from SWEETS_ICON_NAMES, the ones the row draws today. */
const TRUST_STATS = [
  { value: '25,000+', label: 'Sweet & Namkeen Businesses', icon: 'Store' },
  { value: '18,000+', label: 'Outlets Managed', icon: 'ShoppingCart' },
  { value: '2.5 Cr+', label: 'Products Tracked Every Day', icon: 'Candy' },
  { value: '650+', label: 'Manufacturing Units', icon: 'Building2' },
  { value: '45+', label: 'Cities Across India', icon: 'Truck' },
  { value: '3 Lakh+', label: 'Users Trust UpWon', icon: 'Users' },
];

const PLATFORM_TILES = [
  { label: 'Cloud ERP', iconUrl: '/images/ERP.webp', href: '/products/erp' },
  { label: 'SFA & DMS', iconUrl: '/images/SFA-DMS.webp', href: '/products/sfa-dms' },
  { label: 'HREasy', iconUrl: '/images/HRMS.webp', href: '/products/hrms' },
  { label: 'WMS', iconUrl: '/images/WMS.webp', href: '/products/wms' },
  { label: 'FMS', iconUrl: '/images/FMS.webp', href: '/products/fms' },
];

const FAQ_ENTRIES = [
  {
    question: 'How does the platform help us plan for festival peaks?',
    answer:
      'Production and procurement planning work from your own sales and inventory history rather than memory, so a Diwali or Eid ramp can be modelled ahead of the season. Peaks will always be demanding, but the aim is to enter them knowing what needs to be produced, packed and stocked at each outlet.',
  },
  {
    question: 'Can we track batches and expiry across perishable sweets?',
    answer:
      'Yes. Products can be tracked at batch level with visibility into expiry-sensitive inventory and quality inspection touchpoints, so older stock moves first and ageing inventory is visible before it becomes a write-off rather than being discovered at the counter.',
  },
  {
    question: 'We sell loose by weight in many pack sizes. Does billing handle that?',
    answer:
      'Counter billing supports weight-based selling across multi-size SKUs, so the same product sold loose, in a 250g box or in a festival pack stays one item in your catalogue with its own pricing. That keeps the counter fast and keeps outlet sales reconciling back to stock.',
  },
  {
    question: 'How do we keep quality consistent across outlets?',
    answer:
      'Recipes are held with controlled, versioned access and central-kitchen to outlet flows are managed in one place. Combined with batch-level traceability, that gives you a record of what was produced where and to which version — which is also what a food-safety recall needs.',
  },
  {
    question: 'We work through outlets and distributors. Does the platform cover both?',
    answer:
      'Yes. Outlet operations and distributor movement connect to the same system as production and inventory, so orders, dispatch and stock across the channel stay visible to your team instead of sitting in separate registers or chat threads.',
  },
  {
    question: 'Do we have to replace our billing or accounting system to start?',
    answer:
      'No. Most businesses start with the area causing the most friction — commonly inventory, production planning or outlet coordination — and connect the rest as they go. UpWon can operate alongside your current environment and connect through APIs and integration workflows for master data, orders and transactions.',
  },
];

const CTA_SECTION = {
  desktopImageUrl: '/images/sweet_cta_desktop.webp',
  mobileImageUrl: '/images/sweet_cta_mobile.webp',
  primaryLabel: 'Request a Demo',
  primaryHref: '/contact',
  secondaryLabel: 'Explore UpWon Solutions',
  secondaryHref: '/what-is-upwon',
};

/** True when the table has no rows at all, deleted or not. */
async function isEmpty(client: PoolClient, table: string): Promise<boolean> {
  const result = await client.query<{ count: string }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number(result.rows[0].count) === 0;
}

const positions = (list: unknown[]): number[] => list.map((_, index) => index);

export async function seedSweetsPage(client: PoolClient): Promise<{
  heroSlides: number;
  trustLogos: number;
  trustStats: number;
  platformTiles: number;
  faqEntries: number;
  ctaSection: number;
}> {
  const counts = {
    heroSlides: 0,
    trustLogos: 0,
    trustStats: 0,
    platformTiles: 0,
    faqEntries: 0,
    ctaSection: 0,
  };

  if (await isEmpty(client, 'sweets_hero_slides')) {
    const result = await client.query(
      `
      INSERT INTO sweets_hero_slides
        (eyebrow, headline, subhead,
         cta_label, cta_href, secondary_label, secondary_href,
         image_url, display_order, status)
      SELECT $1, u.headline, u.subhead, $2, $3, $4, $5, u.image_url, u.position, 'ACTIVE'
        FROM unnest($6::text[], $7::text[], $8::text[], $9::int[])
          AS u(headline, subhead, image_url, position)
      `,
      [
        EYEBROW,
        CTA.label,
        CTA.href,
        SECONDARY.label,
        SECONDARY.href,
        HERO_SLIDES.map((s) => s.headline),
        HERO_SLIDES.map((s) => s.subhead),
        HERO_SLIDES.map((s) => s.imageUrl),
        positions(HERO_SLIDES),
      ],
    );
    counts.heroSlides = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'sweets_trust_logos')) {
    const result = await client.query(
      `
      INSERT INTO sweets_trust_logos (alt, image_url, display_order, status)
      SELECT u.alt, u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(alt, image_url, position)
      `,
      [TRUST_LOGOS.map((l) => l.alt), TRUST_LOGOS.map((l) => l.imageUrl), positions(TRUST_LOGOS)],
    );
    counts.trustLogos = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'sweets_trust_stats')) {
    const result = await client.query(
      `
      INSERT INTO sweets_trust_stats (value, label, icon, display_order, status)
      SELECT u.value, u.label, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(value, label, icon, position)
      `,
      [
        TRUST_STATS.map((s) => s.value),
        TRUST_STATS.map((s) => s.label),
        TRUST_STATS.map((s) => s.icon),
        positions(TRUST_STATS),
      ],
    );
    counts.trustStats = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'sweets_platform_tiles')) {
    const result = await client.query(
      `
      INSERT INTO sweets_platform_tiles (label, href, icon_url, display_order, status)
      SELECT u.label, u.href, u.icon_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(label, href, icon_url, position)
      `,
      [
        PLATFORM_TILES.map((t) => t.label),
        PLATFORM_TILES.map((t) => t.href),
        PLATFORM_TILES.map((t) => t.iconUrl),
        positions(PLATFORM_TILES),
      ],
    );
    counts.platformTiles = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'sweets_faq_entries')) {
    const result = await client.query(
      `
      INSERT INTO sweets_faq_entries (question, answer, display_order, status)
      SELECT u.question, u.answer, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(question, answer, position)
      `,
      [
        FAQ_ENTRIES.map((f) => f.question),
        FAQ_ENTRIES.map((f) => f.answer),
        positions(FAQ_ENTRIES),
      ],
    );
    counts.faqEntries = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'sweets_cta_section')) {
    const result = await client.query(
      `
      INSERT INTO sweets_cta_section
        (singleton, desktop_image_url, mobile_image_url,
         primary_label, primary_href, secondary_label, secondary_href)
      VALUES (TRUE, $1, $2, $3, $4, $5, $6)
      `,
      [
        CTA_SECTION.desktopImageUrl,
        CTA_SECTION.mobileImageUrl,
        CTA_SECTION.primaryLabel,
        CTA_SECTION.primaryHref,
        CTA_SECTION.secondaryLabel,
        CTA_SECTION.secondaryHref,
      ],
    );
    counts.ctaSection = result.rowCount ?? 0;
  }

  return counts;
}
