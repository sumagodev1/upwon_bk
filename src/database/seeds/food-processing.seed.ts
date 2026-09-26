// src/database/seeds/food-processing.seed.ts

import { PoolClient } from 'pg';

/**
 * The Food Processing industry page, exactly as it renders today.
 *
 * Every list is seeded only when its table is empty, so re-running the seed
 * never duplicates a row and never overwrites what an editor has changed. A
 * table whose rows were all soft-deleted is not empty, so deleted content is
 * never brought back.
 *
 * The copy that heads each section is seeded alongside the other pages' in
 * seed.ts, under ('food-processing', <section>).
 */

/** True when the table has no rows at all, deleted or not. */
async function isEmpty(client: PoolClient, table: string): Promise<boolean> {
  const result = await client.query<{ count: string }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number(result.rows[0].count) === 0;
}

export async function seedFoodProcessingPage(client: PoolClient): Promise<{
  heroSlides: number;
  trustLogos: number;
  trustStats: number;
  coverageItems: number;
  platformTiles: number;
  faqEntries: number;
  trustPanel: number;
  ctaSection: number;
}> {
  const counts = {
    heroSlides: 0,
    trustLogos: 0,
    trustStats: 0,
    coverageItems: 0,
    platformTiles: 0,
    faqEntries: 0,
    trustPanel: 0,
    ctaSection: 0,
  };

  if (await isEmpty(client, 'food_processing_hero_slides')) {
    const result = await client.query(
      `INSERT INTO food_processing_hero_slides
         (eyebrow, headline, subhead, cta_label, cta_href, secondary_label, secondary_href,
          image_url, display_order, status)
       SELECT $1, u.headline, u.subhead, $2, $3, u.secondary_label, $4, u.image_url, u.position, 'ACTIVE'
         FROM unnest($5::text[], $6::text[], $7::text[], $8::text[], $9::int[])
           AS u(headline, subhead, image_url, secondary_label, position)`,
      [
        "FOOD PROCESSING",
        'Request a Demo',
        '/demo',
        '/what-is-upwon',
        [
  "From Raw Materials to Finished Products — Keep Every Process Connected.",
  "Every Ingredient. Every Batch — Every Movement Connected.",
  "Every Batch, Location, and Product Movement — One Connected View.",
  "Process More. Move Faster — Manage Everything in One Flow."
],
        [
  "Manage procurement, production, recipes, inventory, quality, warehouses, sales, distribution, and business operations through one connected platform built to bring greater visibility, control, and coordination to your food processing business.",
  "Connect raw materials, recipes, production, quality, inventory, shelf-life, packaging, and finished-goods movement through one platform—so your teams can maintain clearer visibility across every stage of food processing.",
  "Bring procurement, production, inventory, quality, warehouses, sales, and distribution together in one connected platform. Gain better visibility across operations and make faster, more informed decisions as products move through your business.",
  "Simplify the journey from incoming materials and production to storage, finished goods, sales, and distribution with one connected platform designed to help food processing operations stay coordinated as they grow."
],
        [
  "/images/food_process_hero_1.webp",
  "/images/food_process_hero_2.webp",
  "/images/food_process_hero_3.webp",
  "/images/food_process_hero_4.webp"
],
        [
  "Explore UpWon for Food Processing",
  "Explore UpWon for Food Processing",
  "See How UpWon Connects Your Operations",
  "Explore UpWon for Food Processing"
],
        [
  0,
  1,
  2,
  3
],
      ],
    );
    counts.heroSlides = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'food_processing_trust_logos')) {
    const result = await client.query(
      `INSERT INTO food_processing_trust_logos (alt, image_url, display_order, status)
       SELECT u.alt, u.image_url, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::int[]) AS u(alt, image_url, position)`,
      [
        [
  "Winni",
  "U2 Cake",
  "OFC",
  "Monginis",
  "Kaka Halwai",
  "Gokul"
],
        [
  "/images/testimonial/winni.webp",
  "/images/testimonial/u2cake.webp",
  "/images/testimonial/ofc.webp",
  "/images/testimonial/mongignis.webp",
  "/images/testimonial/kaka%20halwai.webp",
  "/images/testimonial/gokul.webp"
],
        [
  0,
  1,
  2,
  3,
  4,
  5
],
      ],
    );
    counts.trustLogos = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'food_processing_trust_stats')) {
    const result = await client.query(
      `INSERT INTO food_processing_trust_stats (value, label, display_order, status)
       SELECT u.value, u.label, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::int[]) AS u(value, label, position)`,
      [
        [
  "650+",
  "2.5 Cr+",
  "45+"
],
        [
  "Manufacturing units running on UpWon",
  "Products tracked every day",
  "Cities across India"
],
        [
  0,
  1,
  2
],
      ],
    );
    counts.trustStats = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'food_processing_coverage_items')) {
    const result = await client.query(
      `INSERT INTO food_processing_coverage_items (label, image_url, display_order, status)
       SELECT u.label, u.image_url, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::int[]) AS u(label, image_url, position)`,
      [
        [
  "Dairy Processing",
  "Fruits & Vegetables Processing",
  "Fats & Oils",
  "Grains & Cereals",
  "Snacks",
  "Confectionery",
  "Ready-to-Eat & Ready-to-Meal",
  "Frozen Foods",
  "Canned Foods",
  "Spices & Seasonings",
  "Health & Wellness Foods"
],
        [
  "/images/food_dairy_processing.webp",
  "/images/food_fruits_processing.webp",
  "/images/food_fats_oil.webp",
  "/images/food_grains_cereals.webp",
  "/images/food_snacks.webp",
  "/images/food_confectionary.webp",
  "/images/food_ready_to_eat.webp",
  "/images/food_frozen.webp",
  "/images/food_canned.webp",
  "/images/food_spices.webp",
  "/images/food_health_wellness.webp"
],
        [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10
],
      ],
    );
    counts.coverageItems = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'food_processing_platform_tiles')) {
    const result = await client.query(
      `INSERT INTO food_processing_platform_tiles (label, href, icon_url, display_order, status)
       SELECT u.label, u.href, u.icon_url, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::text[], $4::int[]) AS u(label, href, icon_url, position)`,
      [
        [
  "Cloud ERP",
  "SFA & DMS",
  "HREasy",
  "FMS",
  "WMS"
],
        [
  "/products/erp",
  "/products/sfa-dms",
  "/products/hrms",
  "/products/fms",
  "/products/wms"
],
        [
  "/images/ERP.webp",
  "/images/SFA-DMS.webp",
  "/images/HRMS.webp",
  "/images/FMS.webp",
  "/images/WMS.webp"
],
        [
  0,
  1,
  2,
  3,
  4
],
      ],
    );
    counts.platformTiles = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'food_processing_faq_entries')) {
    const result = await client.query(
      `INSERT INTO food_processing_faq_entries (question, answer, display_order, status)
       SELECT u.question, u.answer, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::int[]) AS u(question, answer, position)`,
      [
        [
  "What is food processing ERP software?",
  "Can UpWon help manage batch and quality workflows?",
  "Can the platform support inventory across multiple locations?",
  "Can we start with selected solutions and expand later?"
],
        [
  "A connected business platform that brings together the core workflows of a food processing business — procurement, raw materials, inventory, recipes, production, quality, warehouses, finance, sales, and distribution — so those teams work from shared information rather than separate tools and spreadsheets.",
  "Yes. Production batches and quality inspection touchpoints connect to the same system as production and inventory, so teams can see what was produced, under which batch, and where it was checked — instead of reconstructing that from separate registers after the fact.",
  "Yes. Inventory is managed across plants, warehouses, distribution points, and other operational locations in one system, so stock position and movement can be seen per location rather than assembled from separate sheets at the end of the week.",
  "Yes. The suite is modular and connected, so most businesses start with whichever area is causing the most friction and add the rest as they go. Because the workflows share one platform, the data built up in the first phase carries into the next."
],
        [
  0,
  1,
  2,
  3
],
      ],
    );
    counts.faqEntries = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'food_processing_trust_panel')) {
    const result = await client.query(
      `INSERT INTO food_processing_trust_panel (singleton, image_url, alt) VALUES (TRUE, $1, $2)`,
      ["/images/food_process_proof_strip.webp", "Food processing line running under UpWon"],
    );
    counts.trustPanel = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'food_processing_cta_section')) {
    const result = await client.query(
      `INSERT INTO food_processing_cta_section
         (singleton, desktop_image_url, mobile_image_url,
          primary_label, primary_href, secondary_label, secondary_href)
       VALUES (TRUE, $1, $2, $3, $4, $5, $6)`,
      ["/images/food_process_cta.webp", "/images/food_process_cta_mb.webp", "Request a Demo", "/demo", "Explore UpWon Solutions", "/what-is-upwon"],
    );
    counts.ctaSection = result.rowCount ?? 0;
  }

  return counts;
}
