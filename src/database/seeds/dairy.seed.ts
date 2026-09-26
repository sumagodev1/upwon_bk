// src/database/seeds/dairy.seed.ts

import { PoolClient } from 'pg';

/**
 * The Dairy & Ice Cream industry page, exactly as it renders today.
 *
 * Every list is seeded only when its table is empty, so re-running the seed
 * never duplicates a row and never overwrites what an editor has changed. A
 * table whose rows were all soft-deleted is not empty, so deleted content is
 * never brought back.
 *
 * The copy that heads each section is seeded alongside the other pages' in
 * seed.ts, under ('dairy', <section>).
 */

/** True when the table has no rows at all, deleted or not. */
async function isEmpty(client: PoolClient, table: string): Promise<boolean> {
  const result = await client.query<{ count: string }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number(result.rows[0].count) === 0;
}

export async function seedDairyPage(client: PoolClient): Promise<{
  heroSlides: number;
  trustLogos: number;
  trustStats: number;
  capabilityCards: number;
  benefitItems: number;
  coverageItems: number;
  platformTiles: number;
  faqEntries: number;
  capabilitiesPanel: number;
  benefitsPanel: number;
  ctaSection: number;
}> {
  const counts = {
    heroSlides: 0,
    trustLogos: 0,
    trustStats: 0,
    capabilityCards: 0,
    benefitItems: 0,
    coverageItems: 0,
    platformTiles: 0,
    faqEntries: 0,
    capabilitiesPanel: 0,
    benefitsPanel: 0,
    ctaSection: 0,
  };

  if (await isEmpty(client, 'dairy_hero_slides')) {
    const result = await client.query(
      `INSERT INTO dairy_hero_slides
         (eyebrow, headline, subhead, cta_label, cta_href, secondary_label, secondary_href,
          image_url, display_order, status)
       SELECT $1, u.headline, u.subhead, $2, $3, u.secondary_label, $4, u.image_url, u.position, 'ACTIVE'
         FROM unnest($5::text[], $6::text[], $7::text[], $8::text[], $9::int[])
           AS u(headline, subhead, image_url, secondary_label, position)`,
      [
        "DAIRY & ICE CREAM",
        'Request a Demo',
        '/demo',
        '/what-is-upwon',
        [
  "From Fresh Production to Every Cold-Chain Movement — Keep Every Operation Connected.",
  "Every Batch, Every Product — Every Temperature-Sensitive Movement Connected.",
  "Every Batch, Location and Product Movement — In One Connected View.",
  "Produce Fresh, Move Faster — Manage Everything in One Flow."
],
        [
  "Manage procurement, raw materials, production, quality, inventory, cold storage, warehouses, sales, distribution, and business operations through one connected platform built to bring greater visibility, control, and coordination to your dairy and ice cream business.",
  "Connect milk procurement, ingredients, production, quality, inventory, cold storage, finished products, sales, and distribution through one platform—so your teams can maintain better visibility across every stage of your dairy and ice cream operations.",
  "Bring procurement, production, inventory, quality, cold storage, warehouses, sales, and distribution together in one connected platform. Gain better visibility across operations and make faster, more informed decisions as products move through your business.",
  "Simplify the journey from milk and ingredient procurement through production, storage, sales, and distribution with one connected platform designed to help dairy and ice cream businesses stay coordinated as they grow."
],
        [
  "/images/dairy_hero_freshness_visibility.webp",
  "/images/dairy_hero_every_batch.webp",
  "/images/dairy_hero_visibility_control.webp",
  "/images/dairy_hero_scale_growth.webp"
],
        [
  "Explore UpWon for Dairy & Ice Cream",
  "Explore UpWon for Dairy & Ice Cream",
  "See How UpWon Connects Your Operations",
  "Explore UpWon for Dairy & Ice Cream"
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

  if (await isEmpty(client, 'dairy_trust_logos')) {
    const result = await client.query(
      `INSERT INTO dairy_trust_logos (alt, image_url, display_order, status)
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

  if (await isEmpty(client, 'dairy_trust_stats')) {
    const result = await client.query(
      `INSERT INTO dairy_trust_stats (value, label, image_url, display_order, status)
       SELECT u.value, u.label, u.image_url, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::text[], $4::int[]) AS u(value, label, image_url, position)`,
      [
        [
  "2.5 Cr+",
  "18,000+",
  "45+"
],
        [
  "Products managed across connected operations",
  "Inventory points tracked across locations",
  "Distribution locations kept in one flow"
],
        [
  "/images/dairy_proof_strip1.webp",
  "/images/dairy_proof_strip2.webp",
  "/images/dairy_proof_strip3.webp"
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

  if (await isEmpty(client, 'dairy_capability_cards')) {
    const result = await client.query(
      `INSERT INTO dairy_capability_cards (icon, title, description, display_order, status)
       SELECT u.icon, u.title, u.description, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::text[], $4::int[]) AS u(icon, title, description, position)`,
      [
        [
  "Box",
  "Settings",
  "ShieldCheck",
  "Snowflake",
  "Warehouse",
  "ShoppingCart",
  "MapPin",
  "BarChart3"
],
        [
  "Centralized Raw Material & Inventory Control",
  "Connected Production Management",
  "Batch & Quality Visibility",
  "Cold Storage & Finished Goods Coordination",
  "Warehouse Operations",
  "Smarter Sales & Order Management",
  "Connected Multi-Location Operations",
  "Real-Time Operational Insights"
],
        [
  "Get a clearer view of milk, ingredients, packaging materials, semi-finished goods, finished products, and inventory movement across plants, cold storage locations, warehouses, and other locations.",
  "Bring production requirements, recipes, materials, production activities, and finished-product movement closer together with better visibility across operational workflows.",
  "Maintain better visibility across production batches, quality inspection touchpoints, and product movement throughout the production and distribution journey.",
  "Coordinate finished-product storage, inventory movement, warehouse operations, dispatch, and distribution workflows.",
  "Support day-to-day warehouse activities including stock receipt, storage, transfers, picking, dispatch, and finished-product movement.",
  "Manage customer and channel orders through connected workflows with greater visibility from order creation to fulfillment.",
  "Bring plants, production locations, cold storage facilities, warehouses, distribution points, sales teams, and operational teams onto one connected system.",
  "Access dashboards and reports that provide visibility into production, inventory, product movement, sales, location activity, and overall business operations."
],
        [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7
],
      ],
    );
    counts.capabilityCards = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'dairy_benefit_items')) {
    const result = await client.query(
      `INSERT INTO dairy_benefit_items (icon, title, description, display_order, status)
       SELECT u.icon, u.title, u.description, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::text[], $4::int[]) AS u(icon, title, description, position)`,
      [
        [
  "Milk",
  "Factory",
  "ShieldCheck",
  "Truck",
  "Snowflake",
  "Package",
  "Users",
  "MapPin",
  "ClipboardList",
  "BarChart3"
],
        [
  "Raw Material & Ingredient Visibility",
  "Production & Inventory Coordination",
  "Batch & Quality Visibility",
  "Finished-Product Movement",
  "Cold Storage & Warehouse Coordination",
  "Stock & Inventory Management",
  "Sales & Distribution Coordination",
  "Multi-Location Operational Visibility",
  "Order & Fulfillment Management",
  "Access to Real-Time Business Insights"
],
        [
  "Keep milk, ingredients, and packaging materials visible across stores, plants, and warehouses.",
  "Keep production requirements connected with available materials and inventory levels.",
  "Maintain visibility across production batches and quality inspection touchpoints.",
  "Track finished goods through production, storage, dispatch, and delivery.",
  "Coordinate cold storage, warehouse activity, and finished-product movement.",
  "Manage stock levels and inventory movement across every operating location.",
  "Coordinate distributors, retailers, and sales teams through connected workflows.",
  "Follow activity across plants, cold stores, warehouses, and sales locations.",
  "Manage orders from creation through fulfillment across every channel.",
  "Reach dashboards and reports covering production, inventory, sales, and operations."
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
  9
],
      ],
    );
    counts.benefitItems = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'dairy_coverage_items')) {
    const result = await client.query(
      `INSERT INTO dairy_coverage_items (label, image_url, display_order, status)
       SELECT u.label, u.image_url, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::int[]) AS u(label, image_url, position)`,
      [
        [
  "Milk Processing",
  "Flavoured Milk",
  "Yogurt & Cultured Products",
  "Cheese & Paneer",
  "Butter & Ghee",
  "Cream & Dairy Ingredients",
  "Ice Cream Manufacturing",
  "Frozen Desserts",
  "Ice Cream Parlours",
  "Dairy Distribution",
  "Dairy Retail Operations",
  "Multi-Location Dairy & Ice Cream Businesses"
],
        [
  "/images/ind_cov_milk_process.webp",
  "/images/ind_cov_flavered_milk.webp",
  "/images/ind_cov_yogert.webp",
  "/images/ind_cov_cheese_paneer.webp",
  "/images/ind_cov_butter_ghee.webp",
  "/images/ind_cov_cream_dairy.webp",
  "/images/ind_cov_icecream_manfact.webp",
  "/images/ind_cov_frozen_desert.webp",
  "/images/ind_cov_icecream_parlor.webp",
  "/images/ind_cov_dairy_distrub.webp",
  "/images/ind_cov_dairy_retail.webp",
  "/images/ind_cov_multi_loc.webp"
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
  10,
  11
],
      ],
    );
    counts.coverageItems = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'dairy_platform_tiles')) {
    const result = await client.query(
      `INSERT INTO dairy_platform_tiles (label, href, icon_url, display_order, status)
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

  if (await isEmpty(client, 'dairy_faq_entries')) {
    const result = await client.query(
      `INSERT INTO dairy_faq_entries (question, answer, display_order, status)
       SELECT u.question, u.answer, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::int[]) AS u(question, answer, position)`,
      [
        [
  "What is dairy and ice cream ERP software?",
  "Can UpWon help manage production batches and quality workflows?",
  "Can the platform support multiple plants and storage locations?",
  "Can UpWon support dairy and ice cream sales and distribution?",
  "Can we start with selected solutions and expand later?"
],
        [
  "A connected business platform that brings together the core workflows of a dairy or ice cream business — procurement, raw materials, production, quality, inventory, cold storage, warehouses, sales, distribution, finance and reporting — so those teams work from shared information rather than separate tools and registers.",
  "Yes. Production batches, quality inspection touchpoints, inventory movement and finished-product workflows connect to the same system, so what was produced, under which batch, and how it tested stay together instead of being reconstructed from paper after the fact.",
  "Yes. Inventory and activity are tracked across plants, production facilities, cold storage, warehouses, distribution points and other operational locations in one system, so stock position and movement can be seen per location rather than assembled from separate sheets.",
  "Yes. Sales orders, inventory availability, distributors, retailers, customers and distribution activity run through connected workflows, so dispatch and channel movement stay visible to your team alongside what is actually in stock.",
  "Yes. The suite is modular and connected, so most businesses start with whichever area is causing the most friction and adopt the rest as they go. Because the workflows share one platform, the data built up in the first phase carries into the next."
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
    counts.faqEntries = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'dairy_capabilities_panel')) {
    const result = await client.query(
      `INSERT INTO dairy_capabilities_panel (singleton, image_url, alt) VALUES (TRUE, $1, $2)`,
      ["/images/dairy_capabilities.webp", "Dairy bottling line, quality inspection, ice cream scoops and cold storage warehouse"],
    );
    counts.capabilitiesPanel = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'dairy_benefits_panel')) {
    const result = await client.query(
      `INSERT INTO dairy_benefits_panel (singleton, image_url, alt) VALUES (TRUE, $1, $2)`,
      ["/images/dairy_benefits_sec.webp", "Milk and ingredients, a bottling line, ice cream scoops and a cold storage warehouse"],
    );
    counts.benefitsPanel = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'dairy_cta_section')) {
    const result = await client.query(
      `INSERT INTO dairy_cta_section
         (singleton, desktop_image_url, mobile_image_url,
          primary_label, primary_href, secondary_label, secondary_href)
       VALUES (TRUE, $1, $2, $3, $4, $5, $6)`,
      ["/images/dairy_cta_desktop.webp", "/images/dairy_cta_mobile.webp", "Request a Demo", "/demo", "Explore UpWon Solutions", "/what-is-upwon"],
    );
    counts.ctaSection = result.rowCount ?? 0;
  }

  return counts;
}
