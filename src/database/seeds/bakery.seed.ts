// src/database/seeds/bakery.seed.ts

import { PoolClient } from 'pg';

/**
 * The Bakery & Confectionery industry page, exactly as it renders today: the
 * three hero slides, the trust logos and figures, the platform tiles, the
 * How UpWON Helps diagram, the six FAQ questions, and the closing band with its
 * four capability marks.
 *
 * Every list is seeded only when its table is empty, so re-running the seed
 * never duplicates a row and never overwrites what an editor has changed.
 *
 * The copy that heads each section is seeded alongside the other pages' in
 * seed.ts, under ('bakery', <section>).
 */

const CTA = { label: 'Book Free Demo', href: '/demo' };
const SECONDARY = { label: 'Explore UpWon', href: '/what-is-upwon' };

const HERO_SLIDES = [
  {
    eyebrow: 'BAKERY & CONFECTIONERY',
    headline: 'Bake Better. Manage Smarter — Deliver Fresh Every Time.',
    subhead:
      'From ingredient procurement and batch production to inventory, sales, and delivery, UpWon helps bakeries and confectionery businesses bring every operation into one connected system.',
    imageUrl: '/images/bakertandconfenary1.webp',
  },
  {
    eyebrow: 'BAKERY & CONFECTIONERY',
    headline: 'From Fresh Ingredients to Finished Delights — Keep Every Operation Connected.',
    subhead:
      'Manage procurement, inventory, production, batch planning, and multi-location operations through one connected platform built to bring greater visibility, control, and efficiency to your bakery business.',
    imageUrl: '/images/bakertandconfenary2.webp',
  },
  {
    eyebrow: 'BAKERY & CONFECTIONERY',
    headline: 'Bake More. Waste Less — Grow with Better Control.',
    subhead:
      'UpWon helps bakery and confectionery businesses streamline ingredient management, production planning, inventory movement, and daily operations—so every batch, product, and business decision stays on track.',
    imageUrl: '/images/bakertandconfenary3.webp',
  },
];

/*
 * The paths are percent-encoded where the file name has a space, so the seeded
 * URL is one the browser can fetch as written.
 */
const TRUST_LOGOS = [
  { alt: 'Winni', imageUrl: '/images/testimonial/winni.webp' },
  { alt: 'U2 Cake', imageUrl: '/images/testimonial/u2cake.webp' },
  { alt: 'OFC', imageUrl: '/images/testimonial/ofc.webp' },
  { alt: 'Monginis', imageUrl: '/images/testimonial/mongignis.webp' },
  { alt: 'Kaka Halwai', imageUrl: '/images/testimonial/kaka%20halwai.webp' },
  { alt: 'Gokul', imageUrl: '/images/testimonial/gokul.webp' },
];

const TRUST_STATS = [
  { value: '25,000+', label: 'Invoices processed daily', iconUrl: '/images/bakery_invoice.webp', featured: false },
  { value: '18,000+', label: 'Orders fulfilled daily', iconUrl: '/images/bakery_orders.webp', featured: false },
  { value: '2.5 Cr+', label: 'Products managed', iconUrl: '/images/bakery_product_managed.webp', featured: true },
  { value: '650+', label: 'Bakeries & outlets', iconUrl: '/images/bakery_outlet.webp', featured: false },
  { value: '45+', label: 'Cities served', iconUrl: '/images/bakery_served.webp', featured: false },
];

const PLATFORM_TILES = [
  { label: 'Cloud ERP', iconUrl: '/images/ERP.webp', href: '/products/erp' },
  { label: 'SFA & DMS', iconUrl: '/images/SFA-DMS.webp', href: '/products/sfa-dms' },
  { label: 'HREasy', iconUrl: '/images/HRMS.webp', href: '/products/hrms' },
  { label: 'WMS', iconUrl: '/images/WMS.webp', href: '/products/wms' },
  { label: 'FMS', iconUrl: '/images/FMS.webp', href: '/products/fms' },
];

const HELP_VISUAL = {
  imageUrl: '/images/how_UpWon_helps.webp',
  alt: 'UpWon connected platform for bakery operations',
};

const FAQ_ENTRIES = [
  {
    question: 'Can we see what a product actually costs when ingredient prices keep moving?',
    answer:
      'Yes. Recipes and formulations are held in the system with their ingredient quantities, so when purchase rates for inputs like sugar, maida or ghee change, the cost impact can be seen against the products that use them. Ingredient substitutions can be modelled the same way, rather than reworking costing sheets by hand.',
  },
  {
    question: 'How does the platform help reduce daily wastage?',
    answer:
      'Shelf life and expiry are tracked at batch level with FEFO dispatch, so older stock moves first and ageing inventory is visible before it becomes a write-off. Production, dispatch and outlet stock sit in the same system, which makes it easier to see where wastage is actually occurring instead of discovering it at month-end.',
  },
  {
    question:
      'Our custom cake orders come in over calls and WhatsApp. Can those be managed here?',
    answer:
      'Yes. Custom and special orders can be recorded as structured orders with their delivery date, specification and outlet, so they carry through to production planning and dispatch. The intent is that an order stops living only in a chat thread where it can be missed or entered twice.',
  },
  {
    question: 'How do we keep quality consistent across multiple outlets?',
    answer:
      'Recipes are versioned with controlled access, and central-kitchen to outlet flows are managed in one place. Combined with batch-level traceability, that gives you a record of what was produced where and to which version of the recipe — which is also what a food-safety recall needs.',
  },
  {
    question: 'What happens during festival and wedding-season peaks?',
    answer:
      'Production and procurement planning work from your own sales and inventory history rather than memory, so seasonal ramps can be planned ahead. Peaks will always be demanding, but the aim is to enter them with visibility into what needs to be produced, packed and stocked at each outlet.',
  },
  {
    question:
      'Do we have to replace our existing billing or accounting system to start?',
    answer:
      'No. Most bakeries start with the area causing the most friction — commonly inventory, production planning or outlet coordination — and connect the rest as they go. UpWon can operate alongside your current environment and connect through APIs and integration workflows for master data, orders and transactions.',
  },
];

const CTA_SECTION = {
  desktopImageUrl: '/images/bake_cta_back.webp',
  mobileImageUrl: '/images/bake_mb_cta.webp',
  primaryLabel: 'Request a Demo',
  primaryHref: '/contact',
  secondaryLabel: 'Explore UpWon Solutions',
  secondaryHref: '/what-is-upwon',
};

const CTA_FEATURES = [
  { icon: 'ShoppingCart', label: 'Streamline', subLabel: 'Procurement' },
  { icon: 'Boxes', label: 'Manage', subLabel: 'Inventory' },
  { icon: 'Settings', label: 'Plan', subLabel: 'Production' },
  { icon: 'BarChart3', label: 'Make Better', subLabel: 'Decisions' },
];

/** True when the table has no rows - the seed only ever fills an empty table. */
async function isEmpty(client: PoolClient, table: string): Promise<boolean> {
  const result = await client.query<{ count: string }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number(result.rows[0].count) === 0;
}

const positions = (list: unknown[]): number[] => list.map((_, index) => index);

export async function seedBakeryPage(client: PoolClient): Promise<{
  heroSlides: number;
  trustLogos: number;
  trustStats: number;
  platformTiles: number;
  helpVisuals: number;
  faqEntries: number;
  ctaSection: number;
  ctaFeatures: number;
}> {
  const counts = {
    heroSlides: 0,
    trustLogos: 0,
    trustStats: 0,
    platformTiles: 0,
    helpVisuals: 0,
    faqEntries: 0,
    ctaSection: 0,
    ctaFeatures: 0,
  };

  if (await isEmpty(client, 'bakery_hero_slides')) {
    const result = await client.query(
      `
      INSERT INTO bakery_hero_slides
        (eyebrow, headline, subhead,
         cta_label, cta_href, secondary_label, secondary_href,
         image_url, display_order, status)
      SELECT u.eyebrow, u.headline, u.subhead, $5, $6, $7, $8,
             u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $9::int[])
          AS u(eyebrow, headline, subhead, image_url, position)
      `,
      [
        HERO_SLIDES.map((s) => s.eyebrow),
        HERO_SLIDES.map((s) => s.headline),
        HERO_SLIDES.map((s) => s.subhead),
        HERO_SLIDES.map((s) => s.imageUrl),
        CTA.label,
        CTA.href,
        SECONDARY.label,
        SECONDARY.href,
        positions(HERO_SLIDES),
      ],
    );
    counts.heroSlides = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'bakery_trust_logos')) {
    const result = await client.query(
      `
      INSERT INTO bakery_trust_logos (alt, image_url, display_order, status)
      SELECT u.alt, u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(alt, image_url, position)
      `,
      [TRUST_LOGOS.map((l) => l.alt), TRUST_LOGOS.map((l) => l.imageUrl), positions(TRUST_LOGOS)],
    );
    counts.trustLogos = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'bakery_trust_stats')) {
    const result = await client.query(
      `
      INSERT INTO bakery_trust_stats
        (value, label, icon_url, is_featured, display_order, status)
      SELECT u.value, u.label, u.icon_url, u.featured, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::bool[], $5::int[])
          AS u(value, label, icon_url, featured, position)
      `,
      [
        TRUST_STATS.map((s) => s.value),
        TRUST_STATS.map((s) => s.label),
        TRUST_STATS.map((s) => s.iconUrl),
        TRUST_STATS.map((s) => s.featured),
        positions(TRUST_STATS),
      ],
    );
    counts.trustStats = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'bakery_platform_tiles')) {
    const result = await client.query(
      `
      INSERT INTO bakery_platform_tiles (label, href, icon_url, display_order, status)
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

  if (await isEmpty(client, 'bakery_help_visuals')) {
    const result = await client.query(
      `INSERT INTO bakery_help_visuals (image_url, alt, display_order, status)
       VALUES ($1, $2, 0, 'ACTIVE')`,
      [HELP_VISUAL.imageUrl, HELP_VISUAL.alt],
    );
    counts.helpVisuals = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'bakery_faq_entries')) {
    const result = await client.query(
      `
      INSERT INTO bakery_faq_entries (question, answer, display_order, status)
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

  if (await isEmpty(client, 'bakery_cta_section')) {
    const result = await client.query(
      `
      INSERT INTO bakery_cta_section
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

  if (await isEmpty(client, 'bakery_cta_features')) {
    const result = await client.query(
      `
      INSERT INTO bakery_cta_features (icon, label, sub_label, display_order, status)
      SELECT u.icon, u.label, u.sub_label, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(icon, label, sub_label, position)
      `,
      [
        CTA_FEATURES.map((f) => f.icon),
        CTA_FEATURES.map((f) => f.label),
        CTA_FEATURES.map((f) => f.subLabel),
        positions(CTA_FEATURES),
      ],
    );
    counts.ctaFeatures = result.rowCount ?? 0;
  }

  return counts;
}
