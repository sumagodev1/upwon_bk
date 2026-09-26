// src/database/seeds/beverage.seed.ts

import { PoolClient } from 'pg';

/**
 * The Beverages & Juices industry page, exactly as it renders today: the four
 * hero slides from the website's BeveragesHeroSection, the trust section's
 * copy, stats and logos from BeveragesProofStrip, the core capabilities from
 * BeveragesCoreCapabilities, the connected platform section from
 * BeveragesHowUpwonHelps, the industry coverage grid from
 * BeveragesIndustryCoverage, the FAQ from BeveragesFaqSection, and the closing
 * band from BeveragesCtaSection.
 */

const EYEBROW = 'BEVERAGES & JUICES';
const CTA = { label: 'Request a Demo', href: '/demo' };
const EXPLORE = { label: 'Explore UpWon for Beverages & Juices', href: '/what-is-upwon' };

interface SeedSlide {
  headline: string;
  subhead: string;
  imageUrl: string;
  secondary: { label: string; href: string };
}

/**
 * Every slide shares the eyebrow and the primary button, but they are stored
 * per slide because the schema keeps them there - which is also what lets one
 * of them differ later, as the third slide's secondary button already does.
 */
const HERO_SLIDES: SeedSlide[] = [
  {
    headline: 'From Ingredients to Every Bottle — Keep Your Beverage Operations Connected.',
    subhead:
      'Connect procurement, ingredients, recipes, production, quality, inventory, packaging, warehouses, sales, distribution, and business operations through one platform built to bring greater visibility and coordination to growing beverage and juice businesses.',
    imageUrl: '/images/bev_from_ingredients_to_every_bottle.webp',
    secondary: EXPLORE,
  },
  {
    headline: 'Every Ingredient, Every Batch — Every Bottle Movement Connected.',
    subhead:
      'Connect procurement, ingredients, recipes, production, quality, packaging, inventory, warehouses, sales, and distribution through one platform—so teams can maintain better visibility as beverage products move from production to every sales channel.',
    imageUrl: '/images/bev_production_and_product_visibility.webp',
    secondary: EXPLORE,
  },
  {
    headline: 'Every Batch, Warehouse and Product Movement — In One Connected View.',
    subhead:
      'Bring procurement, raw-material stores, recipe workflows, production, quality inspection, inventory, packaging, sales, and dispatch together in one connected platform. Gain better visibility across operations and make faster decisions as products move through your business.',
    imageUrl: '/images/bev_quality_operational_control.webp',
    secondary: { label: 'See How UpWon Connects Your Operations', href: '/what-is-upwon' },
  },
  {
    headline: 'Produce Smarter, Move Faster — Manage Every Channel in One Flow.',
    subhead:
      'Simplify the journey from ingredient procurement through production, packaging, storage, sales, and distribution with one connected platform designed to help beverage and juice businesses stay coordinated as they grow.',
    imageUrl: '/images/bev_scale_and_growth.webp',
    secondary: EXPLORE,
  },
];

/** The copy over the trust section. The second half is the orange accent. */
const TRUST_COPY = {
  eyebrow: 'TRUSTED BY GROWING BRANDS',
  heading: 'Built to Keep Ingredients, Production, Quality, **and Every Sales Channel Connected.**',
  subtext:
    'Teams across beverages, food, dairy, and FMCG use UpWon to keep procurement, production, quality, inventory, and distribution connected across their locations.',
};

/** The four figures the stat card turns over, each on its own photograph. */
const TRUST_STATS = [
  {
    value: '2.5 Cr+',
    label: 'Products managed across connected operations',
    imageUrl: '/images/bev_from_ingredients_to_every_bottle.webp',
  },
  {
    value: '18,000+',
    label: 'Inventory points tracked across locations',
    imageUrl: '/images/bev_production_and_product_visibility.webp',
  },
  {
    value: '25,000+',
    label: 'Sales channels kept in one connected flow',
    imageUrl: '/images/bev_quality_operational_control.webp',
  },
  {
    value: '45+',
    label: 'Distribution locations connected end to end',
    imageUrl: '/images/bev_scale_and_growth.webp',
  },
];

/** The client marquee, in the order it scrolls. */
const TRUST_LOGOS = [
  { alt: 'Winni', imageUrl: '/images/testimonial/winni.webp' },
  { alt: 'U2 Cake', imageUrl: '/images/testimonial/u2cake.webp' },
  { alt: 'OFC', imageUrl: '/images/testimonial/ofc.webp' },
  { alt: 'Monginis', imageUrl: '/images/testimonial/mongignis.webp' },
  { alt: 'Kaka Halwai', imageUrl: '/images/testimonial/kaka%20halwai.webp' },
  { alt: 'Gokul', imageUrl: '/images/testimonial/gokul.webp' },
];

/** The copy over the core capabilities viewer. */
const CAPABILITIES_COPY = {
  eyebrow: 'CORE CAPABILITIES',
  heading: 'Built for Every Step of Your **Beverage Business**',
  subtext:
    'From ingredients to finished products, UpWon helps you manage, monitor, and connect your entire beverage and juice operations with ease.',
};

/** The soft illustration behind the whole section. */
const CAPABILITIES_BACKGROUND_URL = '/images/bev_core_capability_bg.webp';

/** The eight capabilities, in tab order, each with its own screenshot. */
const CAPABILITIES = [
  {
    title: 'Centralized Ingredient & Inventory Control',
    description:
      'Get a clearer view of ingredients, concentrates, sweeteners, additives, packaging materials, work-in-process items, finished products, and stock movement across plants and warehouses.',
    imageUrl: '/images/bev_centralized_ingredient.webp',
  },
  {
    title: 'Connected Procurement Workflows',
    description:
      'Bring supplier requirements, purchasing activity, incoming materials, inspection touchpoints, and inventory availability closer together.',
    imageUrl: '/images/bev_procurement_workflows.webp',
  },
  {
    title: 'Recipe & Production Management',
    description:
      'Connect recipe requirements, bills of materials, ingredient availability, production activities, and finished-product movement with better visibility across operations.',
    imageUrl: '/images/bev_production_management.webp',
  },
  {
    title: 'Quality Inspection & Product Control',
    description:
      'Maintain connected visibility across quality inspection touchpoints, product records, and operational requirements throughout procurement and production.',
    imageUrl: '/images/bev_quality_inspection.webp',
  },
  {
    title: 'Packaging & Finished Goods Coordination',
    description:
      'Coordinate packaging materials, production outputs, finished-product inventory, storage, warehouse movement, and dispatch workflows.',
    imageUrl: '/images/bev_packaging_finished.webp',
  },
  {
    title: 'Inventory & Shelf-Life Visibility',
    description:
      'Maintain better visibility across stock availability, product movement, and freshness-related inventory workflows.',
    imageUrl: '/images/bev_inventory_shelf.webp',
  },
  {
    title: 'Warehouse & Distribution Operations',
    description:
      'Support material receipt, storage, transfers, stock tracking, picking, dispatch, and product movement across warehouses and distribution workflows.',
    imageUrl: '/images/bev_warehouse_distribution.webp',
  },
  {
    title: 'Real-Time Business Insights',
    description:
      'Access dashboards and reports that provide visibility into procurement, production, inventory, stock movement, sales, location activity, and overall business operations.',
    imageUrl: '/images/bev_business_insights.webp',
  },
];

/** The copy over the connected workflows grid. */
const PLATFORM_COPY = {
  eyebrow: 'HOW UPWON HELPS',
  heading: 'One Connected Platform for Your **Beverages & Juices** Operations',
  subtext:
    'UpWon connects the key workflows behind beverage and juice operations—helping teams manage the movement of ingredients, batches, products, inventory, information, and operations through one unified platform.',
};

/** The banner behind the section, and the line over the grid. */
const PLATFORM_PANEL = {
  imageUrl: '/images/bev_how_upwon_help_bg.webp',
  listLabel: 'Connected Workflows Across:',
};

/** The workflow grid, in order. */
const PLATFORM_WORKFLOWS = [
  { label: 'Procurement & Purchasing', icon: 'ShoppingCart' },
  { label: 'Raw Material & Ingredient Management', icon: 'Leaf' },
  { label: 'Recipe & Bill of Materials Management', icon: 'ClipboardList' },
  { label: 'Quality Inspection', icon: 'ShieldCheck' },
  { label: 'Production Management', icon: 'Settings' },
  { label: 'Packaging Management', icon: 'Package' },
  { label: 'Inventory & Stock Management', icon: 'Boxes' },
  { label: 'Shelf-Life Related Workflows', icon: 'Clock' },
  { label: 'Warehouse Operations', icon: 'Warehouse' },
  { label: 'Sales & Order Management', icon: 'BarChart3' },
  { label: 'Dispatch & Distribution', icon: 'Truck' },
  { label: 'Multi-Location Operations', icon: 'MapPin' },
  { label: 'Finance & Reporting', icon: 'PieChart' },
];

/** The copy over the industry coverage grid. */
const COVERAGE_COPY = {
  eyebrow: 'INDUSTRY COVERAGE',
  heading: 'Built for a Wide Range of **Beverage & Juice Businesses.**',
  subtext:
    'UpWon can support connected workflows across beverage and related product categories, including:',
};

/** The coverage grid, in order. The badge colours cycle by position on the site. */
const COVERAGE_CATEGORIES = [
  {
    label: 'Fruit Juices',
    detail: 'Ingredient sourcing, blending, filling, and batch visibility across juice lines.',
    icon: 'CupSoda',
  },
  {
    label: 'Fruit Drinks',
    detail: 'Recipe ratios, production runs, and packaging workflows kept connected.',
    icon: 'GlassWater',
  },
  {
    label: 'Nectars & Juice Blends',
    detail:
      'Blend recipes, ingredient availability, and batch records across multi-fruit ranges.',
    icon: 'Grape',
  },
  {
    label: 'Soft Drinks',
    detail: 'High-volume production, packaging, and stock movement across fast-moving SKUs.',
    icon: 'Wine',
  },
  {
    label: 'Carbonated Beverages',
    detail: 'Production activity, quality checkpoints, and finished-goods handling in one flow.',
    icon: 'Sparkles',
  },
  {
    label: 'Energy & Functional Drinks',
    detail:
      'Ingredient records, production activity, and inventory across functional formulations.',
    icon: 'Zap',
  },
  {
    label: 'Health & Wellness Beverages',
    detail: 'Ingredients, recipes, quality touchpoints, and shelf-life related workflows.',
    icon: 'HeartPulse',
  },
  {
    label: 'Bottled Water',
    detail: 'Packaging materials, filling activity, inventory, and dispatch across plants.',
    icon: 'Droplet',
  },
  {
    label: 'Flavoured Water',
    detail:
      'Flavour and ingredient tracking alongside production, packaging, and stock visibility.',
    icon: 'Droplets',
  },
  {
    label: 'Ready-to-Drink Beverages',
    detail: 'Recipes, production, packaging, and distribution connected for RTD formats.',
    icon: 'Milk',
  },
  {
    label: 'Syrups & Concentrates',
    detail: 'Concentrate recipes, batch production, storage, and onward supply.',
    icon: 'FlaskConical',
  },
  {
    label: 'Multi-Location Beverage Businesses',
    detail: 'Inventory and operational activity tracked across plants, warehouses, and depots.',
    icon: 'MapPin',
  },
];

/** The copy over the FAQ accordion. */
const FAQ_COPY = {
  eyebrow: 'FAQ',
  heading: 'Questions Beverage Teams **Ask Before They Switch.**',
  subtext:
    'Practical answers to what beverage and juice teams want to know before moving production, quality and distribution onto one platform.',
};

/** The practical questions beverage teams ask before they switch. */
const FAQ_ENTRIES = [
  {
    question: 'What is beverage and juice ERP software?',
    answer:
      'A connected business platform that can bring together workflows such as procurement, ingredients, recipes, production, quality inspection, inventory, packaging, warehousing, sales, finance, reporting, and distribution.',
  },
  {
    question: 'Can UpWon help manage ingredients, recipes, and production workflows?',
    answer:
      'Yes. Ingredient availability, recipe requirements, bills of materials, production activity, inventory movement and finished-product workflows run through one system, so what is on hand, what is being made and where it has moved stay visible together rather than across separate registers.',
  },
  {
    question: 'Can the platform support quality inspection and packaging workflows?',
    answer:
      'Yes. Quality inspection touchpoints connect to the production and packaging workflows they cover, so checks stay attached to what is moving through the line instead of being reconstructed from paper afterwards.',
  },
  {
    question: 'Can UpWon help manage inventory and shelf-life related workflows?',
    answer:
      'Yes. Stock, inventory movement and freshness-related operational requirements stay visible in the same system, so what is held where — and how long it has been there — can be seen per location rather than assembled from separate sheets.',
  },
  {
    question: 'Can UpWon support sales and distribution operations?',
    answer:
      'Yes. Sales orders, inventory availability, distributors, retailers, customers and dispatch activity run through connected workflows, so distribution stays visible to your team alongside what is actually in stock.',
  },
  {
    question: 'Can we start with selected solutions and expand later?',
    answer:
      'Yes. The suite is modular and connected, so most businesses start with whichever area is causing the most friction and adopt the rest as they go. Because the workflows share one platform, the data built up in the first phase carries into the next.',
  },
];

/** The closing band's copy. It has no eyebrow. */
const CTA_COPY = {
  heading: 'Ready to Bring Your **Beverages & Juices Operations Together?**',
  subtext:
    'Connect procurement, ingredients, recipes, production, quality, packaging, inventory, warehouses, sales, distribution, and business operations through one platform designed to support growing beverage businesses.',
};

/** The closing band: its two crops and two buttons. */
const CTA_BAND = {
  desktopImageUrl: '/images/bev_desktop_cta.webp',
  mobileImageUrl: '/images/bev_mobile_cta.webp',
  primaryLabel: 'Request a Demo',
  primaryHref: '/demo',
  secondaryLabel: 'Explore UpWon Solutions',
  secondaryHref: '/what-is-upwon',
};

export async function seedBeveragePage(client: PoolClient): Promise<{
  heroSlides: number;
  trustCopy: number;
  trustStats: number;
  trustLogos: number;
  capabilitiesCopy: number;
  capabilitiesPanel: number;
  capabilities: number;
  platformCopy: number;
  platformPanel: number;
  platformWorkflows: number;
  coverageCopy: number;
  coverageCategories: number;
  faqCopy: number;
  faqEntries: number;
  ctaCopy: number;
  ctaSection: number;
}> {
  let heroSlides = 0;
  let trustStats = 0;
  let trustLogos = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM beverage_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO beverage_hero_slides
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
        HERO_SLIDES.map((_, index) => index),
      ],
    );
    heroSlides = result.rowCount ?? 0;
  }

  const copyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('beverage', 'trust', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [TRUST_COPY.eyebrow, TRUST_COPY.heading, TRUST_COPY.subtext],
  );
  const trustCopy = copyResult.rowCount ?? 0;

  const existingStats = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM beverage_trust_stats',
  );
  if (Number(existingStats.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO beverage_trust_stats (value, label, image_url, display_order, status)
      SELECT u.value, u.label, u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(value, label, image_url, position)
      `,
      [
        TRUST_STATS.map((s) => s.value),
        TRUST_STATS.map((s) => s.label),
        TRUST_STATS.map((s) => s.imageUrl),
        TRUST_STATS.map((_, index) => index),
      ],
    );
    trustStats = result.rowCount ?? 0;
  }

  const existingLogos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM beverage_trust_logos',
  );
  if (Number(existingLogos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO beverage_trust_logos (image_url, alt, display_order, status)
      SELECT u.image_url, u.alt, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(image_url, alt, position)
      `,
      [
        TRUST_LOGOS.map((l) => l.imageUrl),
        TRUST_LOGOS.map((l) => l.alt),
        TRUST_LOGOS.map((_, index) => index),
      ],
    );
    trustLogos = result.rowCount ?? 0;
  }

  const capabilitiesCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('beverage', 'capabilities', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [CAPABILITIES_COPY.eyebrow, CAPABILITIES_COPY.heading, CAPABILITIES_COPY.subtext],
  );
  const capabilitiesCopy = capabilitiesCopyResult.rowCount ?? 0;

  const capabilitiesPanelResult = await client.query(
    `
    INSERT INTO beverage_capabilities_panel (singleton, image_url)
    VALUES (TRUE, $1)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [CAPABILITIES_BACKGROUND_URL],
  );
  const capabilitiesPanel = capabilitiesPanelResult.rowCount ?? 0;

  let capabilities = 0;
  const existingCapabilities = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM beverage_capabilities',
  );
  if (Number(existingCapabilities.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO beverage_capabilities (title, description, image_url, display_order, status)
      SELECT u.title, u.description, u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(title, description, image_url, position)
      `,
      [
        CAPABILITIES.map((c) => c.title),
        CAPABILITIES.map((c) => c.description),
        CAPABILITIES.map((c) => c.imageUrl),
        CAPABILITIES.map((_, index) => index),
      ],
    );
    capabilities = result.rowCount ?? 0;
  }

  const platformCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('beverage', 'platform', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [PLATFORM_COPY.eyebrow, PLATFORM_COPY.heading, PLATFORM_COPY.subtext],
  );
  const platformCopy = platformCopyResult.rowCount ?? 0;

  const platformPanelResult = await client.query(
    `
    INSERT INTO beverage_platform_panel (singleton, image_url, list_label)
    VALUES (TRUE, $1, $2)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [PLATFORM_PANEL.imageUrl, PLATFORM_PANEL.listLabel],
  );
  const platformPanel = platformPanelResult.rowCount ?? 0;

  let platformWorkflows = 0;
  const existingWorkflows = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM beverage_platform_workflows',
  );
  if (Number(existingWorkflows.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO beverage_platform_workflows (label, icon, display_order, status)
      SELECT u.label, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(label, icon, position)
      `,
      [
        PLATFORM_WORKFLOWS.map((w) => w.label),
        PLATFORM_WORKFLOWS.map((w) => w.icon),
        PLATFORM_WORKFLOWS.map((_, index) => index),
      ],
    );
    platformWorkflows = result.rowCount ?? 0;
  }

  const coverageCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('beverage', 'coverage', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [COVERAGE_COPY.eyebrow, COVERAGE_COPY.heading, COVERAGE_COPY.subtext],
  );
  const coverageCopy = coverageCopyResult.rowCount ?? 0;

  let coverageCategories = 0;
  const existingCategories = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM beverage_coverage_categories',
  );
  if (Number(existingCategories.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO beverage_coverage_categories (label, detail, icon, display_order, status)
      SELECT u.label, u.detail, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(label, detail, icon, position)
      `,
      [
        COVERAGE_CATEGORIES.map((c) => c.label),
        COVERAGE_CATEGORIES.map((c) => c.detail),
        COVERAGE_CATEGORIES.map((c) => c.icon),
        COVERAGE_CATEGORIES.map((_, index) => index),
      ],
    );
    coverageCategories = result.rowCount ?? 0;
  }

  const faqCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('beverage', 'faq', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [FAQ_COPY.eyebrow, FAQ_COPY.heading, FAQ_COPY.subtext],
  );
  const faqCopy = faqCopyResult.rowCount ?? 0;

  let faqEntries = 0;
  const existingFaqs = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM beverage_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO beverage_faq_entries (question, answer, display_order, status)
      SELECT u.question, u.answer, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(question, answer, position)
      `,
      [
        FAQ_ENTRIES.map((f) => f.question),
        FAQ_ENTRIES.map((f) => f.answer),
        FAQ_ENTRIES.map((_, index) => index),
      ],
    );
    faqEntries = result.rowCount ?? 0;
  }

  const ctaCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('beverage', 'cta', NULL, $1, $2)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [CTA_COPY.heading, CTA_COPY.subtext],
  );
  const ctaCopy = ctaCopyResult.rowCount ?? 0;

  const ctaSectionResult = await client.query(
    `
    INSERT INTO beverage_cta_section
      (singleton, desktop_image_url, mobile_image_url,
       primary_label, primary_href, secondary_label, secondary_href)
    VALUES (TRUE, $1, $2, $3, $4, $5, $6)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [
      CTA_BAND.desktopImageUrl,
      CTA_BAND.mobileImageUrl,
      CTA_BAND.primaryLabel,
      CTA_BAND.primaryHref,
      CTA_BAND.secondaryLabel,
      CTA_BAND.secondaryHref,
    ],
  );
  const ctaSection = ctaSectionResult.rowCount ?? 0;

  return {
    heroSlides,
    trustCopy,
    trustStats,
    trustLogos,
    capabilitiesCopy,
    capabilitiesPanel,
    capabilities,
    platformCopy,
    platformPanel,
    platformWorkflows,
    coverageCopy,
    coverageCategories,
    faqCopy,
    faqEntries,
    ctaCopy,
    ctaSection,
  };
}
