// src/database/seeds/fmcg.seed.ts

import { PoolClient } from 'pg';

/**
 * The FMCG Distribution industry page, exactly as it renders today: the four
 * hero slides, the trust logos and figures, the platform tiles, the six FAQ
 * questions and the closing band.
 *
 * Every list is seeded only when its table is empty, so re-running the seed
 * never duplicates a row and never overwrites what an editor has changed. A
 * table whose rows were all soft-deleted is not empty, so deleted content is
 * never brought back.
 *
 * The copy that heads each section is seeded alongside the other pages' in
 * seed.ts, under ('fmcg', <section>).
 */

const EYEBROW = 'FMCG DISTRIBUTION';
const CTA = { label: 'Request a Demo', href: '/demo' };
const EXPLORE = { label: 'Explore UpWon for FMCG Distribution', href: '/what-is-upwon' };

/** Every slide shares the first button; the third words its second one differently. */
const HERO_SLIDES = [
  {
    headline: 'Move Products Faster — Keep Every Channel Connected.',
    subhead:
      'Manage procurement, inventory, warehouses, distributors, sales orders, and deliveries through one connected platform built to bring greater visibility, control, and efficiency to your FMCG distribution operations.',
    imageUrl: '/images/move_product_faster.webp',
    secondary: EXPLORE,
  },
  {
    headline: 'From Procurement to Delivery — Move Every Order with Confidence.',
    subhead:
      'Connect procurement, inventory, warehouses, distributors, orders, and deliveries in one platform—so your teams can reduce delays, improve visibility, and keep products moving efficiently across every channel.',
    imageUrl: '/images/procument_to_delivery.webp',
    secondary: EXPLORE,
  },
  {
    headline: 'Your Entire Distribution Network — One Connected View.',
    subhead:
      'Bring products, inventory, warehouses, distributors, sales orders, and deliveries together in one connected platform. Gain the visibility and control you need to make faster decisions and keep your distribution operation on track.',
    imageUrl: '/images/one_connected_view.webp',
    secondary: { label: 'See How UpWon Connects FMCG Distribution', href: '/what-is-upwon' },
  },
  {
    headline: 'A Faster, Smarter Distribution Operation — Built to Scale.',
    subhead:
      'Simplify the flow from procurement to delivery with one connected platform for managing inventory, warehouses, distributors, sales orders, and fulfillment—helping your FMCG business operate efficiently as it grows.',
    imageUrl: '/images/build_a_faster.webp',
    secondary: EXPLORE,
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
  {
    value: '40%',
    label: 'faster order processing',
    description:
      'Move orders from creation to fulfillment through structured workflows instead of manual follow-up.',
  },
  {
    value: '50–80%',
    label: 'operational leakage cut',
    description:
      'Close the gaps across schemes, claims and stock movement that quietly erode margin.',
  },
  {
    value: '40%',
    label: 'higher distributor fill rates',
    description:
      'Keep distributor stock replenished with clearer visibility into demand across the channel.',
  },
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
    question:
      'Can UpWon handle stock across multiple warehouses, branches and distribution points?',
    answer:
      'Yes. Inventory is managed across warehouses, distribution centers, branches and other storage locations in one system, so teams can see product availability and stock movement per location rather than reconciling separate registers. Stock transfers, inward and outward movements, and returns are tracked across the network.',
  },
  {
    question: 'How does batch and expiry tracking work for fast-moving products?',
    answer:
      'Products can be tracked at batch level through the distribution cycle, with visibility into expiry-sensitive inventory. That helps teams prioritise the right stock for dispatch, spot ageing inventory earlier, and reduce avoidable losses instead of discovering issues at the point of delivery.',
  },
  {
    question: 'We work through distributors and retailers. Does the platform cover that?',
    answer:
      'Yes. Distributor and channel operations connect to the same system as your internal workflows, so orders, stock movement and transactions across the channel stay visible to your team rather than sitting in separate spreadsheets or email threads.',
  },
  {
    question: 'Do we have to move every workflow across at once?',
    answer:
      'No. Most teams start with the area causing the most friction — commonly inventory visibility or order fulfillment — and connect procurement, warehousing, distribution and reporting as they go. Because the workflows share one platform, data built up in the first phase carries into the next.',
  },
  {
    question: 'Can it connect with the systems we already run?',
    answer:
      'Yes. UpWon can operate alongside your existing environment and connect through APIs and integration workflows for master data, orders, inventory and transactions, so adopting it does not require replacing everything you already have in place.',
  },
  {
    question: 'What visibility do managers get without asking the team for reports?',
    answer:
      'Dashboards and reports cover inventory, orders, warehouse movement, sales activity and overall distribution performance. The intent is that operational questions can be answered from the system directly, rather than through a manual consolidation exercise at the end of every week or month.',
  },
];

/** No mobile crop: the page crops the desktop artwork into its phone banner. */
const CTA_SECTION = {
  desktopImageUrl: '/images/fmcg_cta_sec.webp',
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

export async function seedFmcgPage(client: PoolClient): Promise<{
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

  if (await isEmpty(client, 'fmcg_hero_slides')) {
    const result = await client.query(
      `
      INSERT INTO fmcg_hero_slides
        (eyebrow, headline, subhead,
         cta_label, cta_href, secondary_label, secondary_href,
         image_url, display_order, status)
      SELECT $1, u.headline, u.subhead, $2, $3, u.secondary_label, u.secondary_href,
             u.image_url, u.position, 'ACTIVE'
        FROM unnest($4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::int[])
          AS u(headline, subhead, secondary_label, secondary_href, image_url, position)
      `,
      [
        EYEBROW,
        CTA.label,
        CTA.href,
        HERO_SLIDES.map((s) => s.headline),
        HERO_SLIDES.map((s) => s.subhead),
        HERO_SLIDES.map((s) => s.secondary.label),
        HERO_SLIDES.map((s) => s.secondary.href),
        HERO_SLIDES.map((s) => s.imageUrl),
        positions(HERO_SLIDES),
      ],
    );
    counts.heroSlides = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'fmcg_trust_logos')) {
    const result = await client.query(
      `
      INSERT INTO fmcg_trust_logos (alt, image_url, display_order, status)
      SELECT u.alt, u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(alt, image_url, position)
      `,
      [TRUST_LOGOS.map((l) => l.alt), TRUST_LOGOS.map((l) => l.imageUrl), positions(TRUST_LOGOS)],
    );
    counts.trustLogos = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'fmcg_trust_stats')) {
    const result = await client.query(
      `
      INSERT INTO fmcg_trust_stats (value, label, description, display_order, status)
      SELECT u.value, u.label, u.description, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(value, label, description, position)
      `,
      [
        TRUST_STATS.map((s) => s.value),
        TRUST_STATS.map((s) => s.label),
        TRUST_STATS.map((s) => s.description),
        positions(TRUST_STATS),
      ],
    );
    counts.trustStats = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'fmcg_platform_tiles')) {
    const result = await client.query(
      `
      INSERT INTO fmcg_platform_tiles (label, href, icon_url, display_order, status)
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

  if (await isEmpty(client, 'fmcg_faq_entries')) {
    const result = await client.query(
      `
      INSERT INTO fmcg_faq_entries (question, answer, display_order, status)
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

  if (await isEmpty(client, 'fmcg_cta_section')) {
    const result = await client.query(
      `
      INSERT INTO fmcg_cta_section
        (singleton, desktop_image_url,
         primary_label, primary_href, secondary_label, secondary_href)
      VALUES (TRUE, $1, $2, $3, $4, $5)
      `,
      [
        CTA_SECTION.desktopImageUrl,
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
