// src/database/seeds/erp-recognition.seed.ts

import { PoolClient } from 'pg';

/**
 * The industry recognition switcher, exactly as the ERP page renders it today.
 *
 * Kept in its own file rather than inline in seed.ts because it is the largest
 * single block of content in the CMS - seven industries carrying forty-two
 * features between them - and it reads better beside its own notes than buried
 * a thousand lines into the shared seed.
 *
 * Every slug matches the id the live component keys its selection on, so a
 * deep link or a saved selection means the same thing before and after the
 * switch to the database.
 */

interface SeedFeature {
  title: string;
  description: string;
  icon: string;
}

interface SeedIndustry {
  slug: string;
  name: string;
  icon: string;
  shortDescription: string;
  erpTitle: string;
  erpDescription: string;
  imageUrl: string;
  features: SeedFeature[];
}

/**
 * The dashboard mockup.
 *
 * The page hardcodes this one image for all seven panels, so all seven are
 * seeded with it. It is stored per industry rather than once for the section
 * because the panel is the industry's own - which is what lets an editor give
 * one industry its own screenshot later without touching the other six.
 */
const DASHBOARD_URL = '/images/dashboard.webp';
const DASHBOARD_ALT = 'UPWON ERP dashboard';

const ERP_INDUSTRIES: SeedIndustry[] = [
  {
    slug: 'bakery',
    name: 'Bakery & Confectionery',
    icon: 'Cake',
    shortDescription: 'Shelf-life planning, recipe management & production costing.',
    erpTitle: 'Bakery & Confectionery ERP',
    erpDescription:
      'End-to-end control across recipes, batches, shelf-life and outlet billing.',
    imageUrl: '/images/bakery.webp',
    features: [
      {
        title: 'Recipe & BOM Costing',
        description:
          'Ingredient-level recipe, batch and yield costing with real-time margins on every product.',
        icon: 'FlaskConical',
      },
      {
        title: 'Shelf-life & Freshness',
        description:
          'Expiry dates, FEFO rotation and freshness control across every counter and outlet.',
        icon: 'Timer',
      },
      {
        title: 'Production Planning',
        description:
          'Demand-driven batch production planning with wastage, rework and yield tracking.',
        icon: 'Settings',
      },
      {
        title: 'Counter POS',
        description:
          'Outlet billing, offers, loyalty and daily sales on one fast, offline-ready counter POS.',
        icon: 'Store',
      },
      {
        title: 'Multi-Outlet Distribution',
        description:
          'Central bakery to outlet dispatch, indenting and live stock visibility, every day.',
        icon: 'Truck',
      },
      {
        title: 'Costing & Reports',
        description:
          'Product costing, GST billing and daily MIS reports for every branch on one dashboard.',
        icon: 'TrendingUp',
      },
    ],
  },
  {
    slug: 'dairy',
    name: 'Dairy & Ice Cream',
    icon: 'IceCream',
    shortDescription: 'FEFO management, expiry tracking & milk procurement.',
    erpTitle: 'Dairy & Ice Cream ERP',
    erpDescription:
      'End-to-end visibility across procurement, production, quality, inventory and distribution.',
    imageUrl: '/images/dairy.webp',
    features: [
      {
        title: 'FEFO & Expiry Management',
        description: 'Automated FEFO, shelf-life tracking and expiry alerts.',
        icon: 'CalendarClock',
      },
      {
        title: 'Milk Procurement',
        description: 'Milk collection, testing, fat/SNF management & supplier tracking.',
        icon: 'Truck',
      },
      {
        title: 'Production Management',
        description: 'Batch-wise production, formula management & yield tracking.',
        icon: 'Settings',
      },
      {
        title: 'Quality Control',
        description: 'QC checks, lab integration and compliance management.',
        icon: 'ShieldCheck',
      },
      {
        title: 'Cold Chain & Distribution',
        description: 'Temperature tracking, cold storage & route optimization.',
        icon: 'Snowflake',
      },
      {
        title: 'Reports & Analytics',
        description: 'Procurement, yield and sales dashboards.',
        icon: 'TrendingUp',
      },
    ],
  },
  {
    slug: 'beverages',
    name: 'Beverages',
    icon: 'CupSoda',
    shortDescription: 'Batch production, formula management & dispatch tracking.',
    erpTitle: 'Beverages ERP',
    erpDescription:
      'Formula-driven batch production with full dispatch and distribution visibility.',
    imageUrl: '/images/beverage.webp',
    features: [
      {
        title: 'Formula Management',
        description:
          'Version-controlled formulas and batch recipes with precise ingredient ratios.',
        icon: 'FlaskConical',
      },
      {
        title: 'Batch Production',
        description:
          'Line-wise production, filling and yield tracking across every shift and SKU.',
        icon: 'Factory',
      },
      {
        title: 'Quality Control',
        description:
          'In-line QC checks, lab integration and full FSSAI compliance management.',
        icon: 'ShieldCheck',
      },
      {
        title: 'Dispatch Tracking',
        description:
          'Warehouse-to-route dispatch visibility with real-time delivery status.',
        icon: 'Package',
      },
      {
        title: 'Inventory & Expiry',
        description:
          'Batch-wise stock with shelf-life control and automated expiry alerts.',
        icon: 'Boxes',
      },
      {
        title: 'Costing & Margins',
        description:
          'SKU-level costing and margin analytics across every pack size and channel.',
        icon: 'TrendingUp',
      },
    ],
  },
  {
    slug: 'namkeen',
    name: 'Snacks & Namkeen',
    icon: 'Popcorn',
    shortDescription: 'Recipe control, oil management & wastage tracking.',
    erpTitle: 'Snacks & Namkeen ERP',
    erpDescription: 'Recipe-accurate production with tight oil, yield and wastage control.',
    imageUrl: '/images/namkeens.webp',
    features: [
      {
        title: 'Recipe Control',
        description:
          'Standardised recipes and batch consistency across every kitchen and shift.',
        icon: 'FlaskConical',
      },
      {
        title: 'Oil & Consumption',
        description:
          'Frying oil usage, top-up and consumption norms tracked against every batch.',
        icon: 'Droplets',
      },
      {
        title: 'Wastage Tracking',
        description:
          'Real-time wastage and yield variance alerts to protect your margins.',
        icon: 'Timer',
      },
      {
        title: 'Packing & Dispatch',
        description: 'Pack-size costing, weighment and dispatch control for every SKU.',
        icon: 'Package',
      },
      {
        title: 'Quality & Compliance',
        description: 'FSSAI compliance, batch QC checks and full lot traceability.',
        icon: 'ShieldCheck',
      },
      {
        title: 'Costing & Reports',
        description:
          'SKU-level costing and daily MIS reports across every plant and channel.',
        icon: 'TrendingUp',
      },
    ],
  },
  {
    slug: 'spices',
    name: 'Spices & Condiments',
    icon: 'Soup',
    shortDescription: 'Lot traceability, quality compliance & lab testing.',
    erpTitle: 'Spices & Condiments ERP',
    erpDescription: 'Farm-to-pack lot traceability with lab-grade quality compliance.',
    imageUrl: '/images/spices.webp',
    features: [
      {
        title: 'Lot Traceability',
        description:
          'Full forward and backward lot tracing from raw material to finished pack.',
        icon: 'ClipboardCheck',
      },
      {
        title: 'Lab Testing',
        description:
          'Moisture, purity and contaminant testing with lab-grade QC records.',
        icon: 'FlaskConical',
      },
      {
        title: 'Quality Compliance',
        description: 'FSSAI, spice-board and export compliance managed end to end.',
        icon: 'ShieldCheck',
      },
      {
        title: 'Grinding & Blending',
        description:
          'Blend recipes and batch grinding control with precise ratio management.',
        icon: 'Factory',
      },
      {
        title: 'Packing & Dispatch',
        description: 'Pack-size costing, weighment and dispatch control for every SKU.',
        icon: 'Package',
      },
      {
        title: 'Costing & Reports',
        description: 'Blend costing, quality reports and MIS dashboards on one platform.',
        icon: 'TrendingUp',
      },
    ],
  },
  {
    slug: 'nutra',
    name: 'Nutraceuticals',
    icon: 'Pill',
    shortDescription: 'Regulatory compliance, batch validation & formula tracking.',
    erpTitle: 'Nutraceuticals ERP',
    erpDescription:
      'Validated, compliant manufacturing with full formula and batch genealogy.',
    imageUrl: '/images/Nutraceutical.webp',
    features: [
      {
        title: 'Regulatory Compliance',
        description: 'GMP, FSSAI and audit-ready documentation maintained automatically.',
        icon: 'ShieldCheck',
      },
      {
        title: 'Batch Validation',
        description: 'Batch records, genealogy and release control for every production lot.',
        icon: 'ClipboardCheck',
      },
      {
        title: 'Formula Tracking',
        description: 'Actives, potency and formulation versioning with full change history.',
        icon: 'FlaskConical',
      },
      {
        title: 'Inventory & Expiry',
        description: 'Lot-wise stock with strict expiry enforcement and near-expiry alerts.',
        icon: 'Boxes',
      },
      {
        title: 'Production Control',
        description: 'Line-wise manufacturing, in-process checks and yield tracking.',
        icon: 'Factory',
      },
      {
        title: 'Reports & Analytics',
        description: 'Batch, QC and inventory dashboards for complete plant visibility.',
        icon: 'TrendingUp',
      },
    ],
  },
  {
    slug: 'fmcg',
    name: 'FMCG Distribution',
    icon: 'Truck',
    shortDescription: 'Secondary sales, distributor management & order automation.',
    erpTitle: 'FMCG Distribution ERP',
    erpDescription: 'Primary-to-secondary visibility with automated ordering and claims.',
    imageUrl: '/images/fmcg_ind.webp',
    features: [
      {
        title: 'Secondary Sales',
        description: 'Outlet-level secondary sales visibility across every beat and territory.',
        icon: 'TrendingUp',
      },
      {
        title: 'Distributor Management',
        description: 'Distributor stock, claims and settlement tracked in real time.',
        icon: 'Users',
      },
      {
        title: 'Order Automation',
        description: 'Beat-wise ordering and auto-replenishment straight from the field.',
        icon: 'Route',
      },
      {
        title: 'Stock & Dispatch',
        description: 'Multi-warehouse stock, picking and dispatch control on one system.',
        icon: 'Package',
      },
      {
        title: 'Schemes & Claims',
        description: 'Scheme automation and fast, accurate claim settlement for every partner.',
        icon: 'Target',
      },
      {
        title: 'Reports & Analytics',
        description: 'Sales, stock and distributor dashboards with same-day visibility.',
        icon: 'TrendingUp',
      },
    ],
  },
];

/**
 * The strip along the bottom of the panel.
 *
 * Section-level, not per industry: the live component holds these in one
 * module constant and draws the same four whichever industry is selected. Per
 * industry would mean twenty-eight rows saying the same four things, and an
 * editor changing one wording in seven places.
 */
const ERP_INDUSTRY_BENEFITS: Array<{ title: string; icon: string }> = [
  { title: 'Industry Best Practices Built-in', icon: 'Target' },
  { title: 'Higher Efficiency & Lower Waste', icon: 'TrendingUp' },
  { title: 'Compliance Assured', icon: 'ShieldCheck' },
  { title: 'Scalable as You Grow', icon: 'Rocket' },
];

/**
 * Seeds the industries with their features, and the shared benefits strip.
 *
 * Guarded on each table separately, so a half-seeded database fills in only
 * the part that is missing. Features are inserted against the ids the industry
 * insert returns rather than by a second lookup on slug - the returning rows
 * come back in insert order, which is the order they were built from.
 */
export async function seedErpIndustries(
  client: PoolClient,
): Promise<{ industries: number; features: number; benefits: number }> {
  let industries = 0;
  let features = 0;
  let benefits = 0;

  const existingIndustries = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM erp_industries',
  );

  if (Number(existingIndustries.rows[0].count) === 0) {
    const inserted = await client.query<{ id: string; slug: string }>(
      `
      INSERT INTO erp_industries
        (name, slug, icon, short_description, erp_title, erp_description,
         image_url, image_alt, dashboard_url, dashboard_alt, display_order, status)
      SELECT u.name, u.slug, u.icon, u.short_description, u.erp_title, u.erp_description,
             u.image_url, u.image_alt, $10, $11, u.position, 'ACTIVE'
        FROM unnest(
               $1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
               $6::text[], $7::text[], $8::text[], $9::int[]
             )
          AS u(name, slug, icon, short_description, erp_title, erp_description,
               image_url, image_alt, position)
      RETURNING id, slug
      `,
      [
        ERP_INDUSTRIES.map((i) => i.name),
        ERP_INDUSTRIES.map((i) => i.slug),
        ERP_INDUSTRIES.map((i) => i.icon),
        ERP_INDUSTRIES.map((i) => i.shortDescription),
        ERP_INDUSTRIES.map((i) => i.erpTitle),
        ERP_INDUSTRIES.map((i) => i.erpDescription),
        ERP_INDUSTRIES.map((i) => i.imageUrl),
        // The selector photo reads its name on mobile; desktop marks it
        // decorative, so one alt serves both.
        ERP_INDUSTRIES.map((i) => i.name),
        ERP_INDUSTRIES.map((_, index) => index),
        DASHBOARD_URL,
        DASHBOARD_ALT,
      ],
    );
    industries = inserted.rowCount ?? 0;

    const idBySlug = new Map(inserted.rows.map((row) => [row.slug, row.id]));

    // One flat insert for all forty-two features, carrying each one's parent id
    // and its position within that parent.
    const flat = ERP_INDUSTRIES.flatMap((industry) =>
      industry.features.map((feature, index) => ({
        industryId: idBySlug.get(industry.slug) as string,
        ...feature,
        position: index,
      })),
    );

    const insertedFeatures = await client.query(
      `
      INSERT INTO erp_industry_features
        (industry_id, title, description, icon, display_order, status)
      SELECT u.industry_id, u.title, u.description, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::int[])
          AS u(industry_id, title, description, icon, position)
      `,
      [
        flat.map((f) => f.industryId),
        flat.map((f) => f.title),
        flat.map((f) => f.description),
        flat.map((f) => f.icon),
        flat.map((f) => f.position),
      ],
    );
    features = insertedFeatures.rowCount ?? 0;
  }

  const existingBenefits = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM erp_industry_benefits',
  );

  if (Number(existingBenefits.rows[0].count) === 0) {
    const insertedBenefits = await client.query(
      `
      INSERT INTO erp_industry_benefits (title, icon, display_order, status)
      SELECT u.title, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[])
          AS u(title, icon, position)
      `,
      [
        ERP_INDUSTRY_BENEFITS.map((b) => b.title),
        ERP_INDUSTRY_BENEFITS.map((b) => b.icon),
        ERP_INDUSTRY_BENEFITS.map((_, index) => index),
      ],
    );
    benefits = insertedBenefits.rowCount ?? 0;
  }

  return { industries, features, benefits };
}
