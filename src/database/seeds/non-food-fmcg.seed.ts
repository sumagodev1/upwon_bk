// src/database/seeds/non-food-fmcg.seed.ts

import { PoolClient } from 'pg';

/**
 * The Non-Food FMCG industry page, exactly as it renders today.
 *
 * Every list is seeded only when its table is empty, so re-running the seed
 * never duplicates a row and never overwrites what an editor has changed. A
 * table whose rows were all soft-deleted is not empty, so deleted content is
 * never brought back.
 *
 * The copy that heads each section is seeded alongside the other pages' in
 * seed.ts, under ('non-food-fmcg', <section>).
 */

/** True when the table has no rows at all, deleted or not. */
async function isEmpty(client: PoolClient, table: string): Promise<boolean> {
  const result = await client.query<{ count: string }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number(result.rows[0].count) === 0;
}

export async function seedNonFoodFmcgPage(client: PoolClient): Promise<{
  heroSlides: number;
  trustLogos: number;
  trustStats: number;
  capabilityCards: number;
  benefitItems: number;
  coverageItems: number;
  platformTiles: number;
  faqEntries: number;
  coveragePanel: number;
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
    coveragePanel: 0,
    ctaSection: 0,
  };

  if (await isEmpty(client, 'non_food_fmcg_hero_slides')) {
    const result = await client.query(
      `INSERT INTO non_food_fmcg_hero_slides
         (eyebrow, headline, subhead, cta_label, cta_href, secondary_label, secondary_href,
          image_url, display_order, status)
       SELECT $1, u.headline, u.subhead, $2, $3, u.secondary_label, $4, u.image_url, u.position, 'ACTIVE'
         FROM unnest($5::text[], $6::text[], $7::text[], $8::text[], $9::int[])
           AS u(headline, subhead, image_url, secondary_label, position)`,
      [
        "NON-FOOD FMCG",
        'Request a Demo',
        '/demo',
        '/what-is-upwon',
        [
  "From Production to Every Sales Channel — Keep Your FMCG Operations Connected.",
  "Every Product. Every Order — Every Market Movement Connected.",
  "Every Product, Channel, and Business Movement — One Connected View.",
  "Sell More. Move Faster — Manage Every Channel in One Flow."
],
        [
  "Manage procurement, production, inventory, warehouses, sales, distribution, field operations, finance, and business performance through one connected platform built to bring greater visibility, control, and coordination to your non-food FMCG business.",
  "Connect products, inventory, warehouses, sales teams, distributors, retailers, orders, and market activity through one platform—so your teams have better visibility across every stage of your FMCG operations.",
  "Bring procurement, inventory, warehouses, sales, distribution, field teams, and business operations together in one connected platform. Gain better visibility across channels and make faster, more informed decisions as products move through your business.",
  "Simplify the journey from procurement and inventory to warehousing, sales, distribution, and market execution with one connected platform designed to help growing non-food FMCG businesses stay coordinated across products, teams, channels, and locations."
],
        [
  "/images/prod_to_every_sale.webp",
  "/images/every_product_order.webp",
  "/images/visibility_and_control.webp",
  "/images/scale_and_growth.webp"
],
        [
  "Explore UpWon for Non-Food FMCG",
  "Explore UpWon for Non-Food FMCG",
  "See How UpWon Connects Your Operations",
  "Explore UpWon for Non-Food FMCG"
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

  if (await isEmpty(client, 'non_food_fmcg_trust_logos')) {
    const result = await client.query(
      `INSERT INTO non_food_fmcg_trust_logos (alt, image_url, display_order, status)
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

  if (await isEmpty(client, 'non_food_fmcg_trust_stats')) {
    const result = await client.query(
      `INSERT INTO non_food_fmcg_trust_stats (value, label, description, display_order, status)
       SELECT u.value, u.label, u.description, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::text[], $4::int[]) AS u(value, label, description, position)`,
      [
        [
  "2.5 Cr+",
  "18,000+",
  "25,000+",
  "45+",
  "3 Lakh+",
  "Real-time"
],
        [
  "Products",
  "Inventory",
  "Sales Channels",
  "Distribution",
  "Field Teams",
  "Business Insights"
],
        [
  "Keep product information and movement connected across your operations.",
  "Maintain clearer visibility of stock across warehouses and locations.",
  "Connect orders, distributors, retailers, and sales activity in one flow.",
  "Coordinate product movement from warehouses to every sales channel.",
  "Bring sales activity and market execution closer to your core operations.",
  "Access connected visibility across sales, inventory, distribution, and performance."
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
    counts.trustStats = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'non_food_fmcg_capability_cards')) {
    const result = await client.query(
      `INSERT INTO non_food_fmcg_capability_cards (title, description, image_url, display_order, status)
       SELECT u.title, u.description, u.image_url, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::text[], $4::int[]) AS u(title, description, image_url, position)`,
      [
        [
  "Centralized Product & Inventory Control",
  "Connected Sales & Distribution Management",
  "Smarter Distributor & Channel Management",
  "Field Sales & Market Execution",
  "Warehouse Operations",
  "Connected Multi-Location Operations",
  "Real-Time Operational Insights"
],
        [
  "Get a clearer view of products, packaging materials, finished goods, inventory levels, and stock movement across warehouses, branches, distributors, and other locations.",
  "Bring sales orders, inventory availability, distributors, retailers, dispatch, and product movement closer together with better visibility across sales and distribution workflows.",
  "Maintain better visibility across distributor operations, orders, stock movement, sales activity, and channel performance.",
  "Support sales teams with connected workflows for market visits, order collection, customer activity, sales execution, and on-ground visibility.",
  "Support day-to-day warehouse activities including stock receipt, storage, transfers, picking, dispatch, returns, and inventory movement.",
  "Bring warehouses, branches, distributors, sales teams, and operational teams onto one connected system.",
  "Access dashboards and reports that provide visibility into inventory, sales, orders, distribution, field activity, channel performance, and overall business operations."
],
        [
  "/images/center_product.webp",
  "/images/conn_sales.webp",
  "/images/smarter_distribution.webp",
  "/images/field_sales_market.webp",
  "/images/operation_ware.webp",
  "/images/conn_multi_loc%20(1).webp",
  "/images/oper_insights.webp"
],
        [
  0,
  1,
  2,
  3,
  4,
  5,
  6
],
      ],
    );
    counts.capabilityCards = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'non_food_fmcg_benefit_items')) {
    const result = await client.query(
      `INSERT INTO non_food_fmcg_benefit_items (icon, label, display_order, status)
       SELECT u.icon, u.label, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::int[]) AS u(icon, label, position)`,
      [
        [
  "PackageSearch",
  "ClipboardList",
  "Users",
  "Warehouse",
  "MapPin",
  "Truck",
  "Globe",
  "ClipboardCheck",
  "BarChart3",
  "Monitor"
],
        [
  "Product and inventory visibility",
  "Sales and order coordination",
  "Distributor and channel visibility",
  "Warehouse and stock management",
  "Field sales and market execution",
  "Distribution and dispatch coordination",
  "Multi-location operational visibility",
  "Order and fulfillment management",
  "Retail and channel performance visibility",
  "Access to real-time business insights"
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

  if (await isEmpty(client, 'non_food_fmcg_coverage_items')) {
    const result = await client.query(
      `INSERT INTO non_food_fmcg_coverage_items (icon, label, display_order, status)
       SELECT u.icon, u.label, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::int[]) AS u(icon, label, position)`,
      [
        [
  "Sparkles",
  "Home",
  "Brush",
  "Droplet",
  "Scissors",
  "SprayCan",
  "WashingMachine",
  "ShieldCheck",
  "Baby",
  "HeartPulse",
  "Layers",
  "ShoppingBasket"
],
        [
  "Personal Care Products",
  "Home Care Products",
  "Cosmetics & Beauty Products",
  "Skincare Products",
  "Haircare Products",
  "Household Cleaning Products",
  "Detergents & Cleaning Supplies",
  "Hygiene Products",
  "Baby Care Products",
  "Health & Wellness Consumer Products",
  "Paper & Disposable Products",
  "Household & Everyday Consumer Goods"
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

  if (await isEmpty(client, 'non_food_fmcg_platform_tiles')) {
    const result = await client.query(
      `INSERT INTO non_food_fmcg_platform_tiles (label, href, icon_url, display_order, status)
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

  if (await isEmpty(client, 'non_food_fmcg_faq_entries')) {
    const result = await client.query(
      `INSERT INTO non_food_fmcg_faq_entries (question, answer, display_order, status)
       SELECT u.question, u.answer, u.position, 'ACTIVE'
         FROM unnest($1::text[], $2::text[], $3::int[]) AS u(question, answer, position)`,
      [
        [
  "What is non-food FMCG ERP software?",
  "Can UpWon help manage distributors and sales channels?",
  "Can the platform support inventory across multiple locations?",
  "Can UpWon help manage field sales operations?",
  "Can we start with selected solutions and expand later?"
],
        [
  "A connected business platform that brings together the core workflows of a non-food FMCG business — procurement, product management, inventory, warehouses, sales, distribution, finance and reporting — so those teams work from shared information rather than separate tools and spreadsheets.",
  "Yes. Distributors, sales teams, retailers, orders, inventory and distribution workflows connect to the same system, so channel activity stays visible to your team instead of sitting in separate registers, spreadsheets or chat threads.",
  "Yes. Inventory is managed across warehouses, branches, distributor locations and other operational points in one system, so stock position and movement can be seen per location rather than assembled from separate sheets.",
  "Yes. Sales activity, market visits, order collection and customer interactions run through connected workflows, so what happens in the market is visible alongside inventory, orders and dispatch rather than reported separately after the fact.",
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

  if (await isEmpty(client, 'non_food_fmcg_coverage_panel')) {
    const result = await client.query(
      `INSERT INTO non_food_fmcg_coverage_panel (singleton, image_url, alt) VALUES (TRUE, $1, $2)`,
      ["/images/industry_cov_dashboard.webp", "UpWon dashboard showing product, inventory, sales and distribution activity"],
    );
    counts.coveragePanel = result.rowCount ?? 0;
  }

  if (await isEmpty(client, 'non_food_fmcg_cta_section')) {
    const result = await client.query(
      `INSERT INTO non_food_fmcg_cta_section
         (singleton, desktop_image_url, mobile_image_url,
          primary_label, primary_href, secondary_label, secondary_href)
       VALUES (TRUE, $1, $2, $3, $4, $5, $6)`,
      ["/images/non_fmcg_cta_desktop.webp", "/images/non_fmcg_cta_mobile.webp", "Request a Demo", "/demo", "Explore UpWon Solutions", "/what-is-upwon"],
    );
    counts.ctaSection = result.rowCount ?? 0;
  }

  return counts;
}
