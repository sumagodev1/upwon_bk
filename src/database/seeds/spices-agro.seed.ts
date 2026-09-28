// src/database/seeds/spices-agro.seed.ts

import { PoolClient } from 'pg';

/**
 * The Spices & Agro Processing industry page, exactly as it renders today: the
 * four hero slides from the website's SpicesAgroHeroSection, the trust
 * section's copy, logos and screenshot from SpicesAgroProofStrip, the core
 * capabilities from SpicesAgroCoreCapabilities, the connected platform section
 * from SpicesAgroHowUpwonHelps, the industry coverage tiles from
 * SpicesAgroIndustryCoverage, the FAQ from SpicesAgroFaqSection, and the closing
 * band from SpicesAgroCtaSection.
 */

const EYEBROW = 'SPICES & AGRO PROCESSING';
const CTA = { label: 'Request a Demo', href: '/demo' };
const EXPLORE = {
  label: 'Explore UpWon for Spices & Agro Processing',
  href: '/what-is-upwon',
};

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
    headline:
      'From Raw Materials to Finished Products — Keep Every Processing Operation Connected.',
    subhead:
      'Connect procurement, raw materials, quality, production, batch workflows, inventory, warehousing, sales, distribution, and business operations through one platform built to bring greater visibility and coordination to spices and agro-processing businesses.',
    imageUrl: '/images/agro_materials_to_finished_products.webp',
    secondary: EXPLORE,
  },
  {
    headline: 'Every Raw Material, Every Batch — Every Processing Movement Connected.',
    subhead:
      'Connect sourcing, raw materials, quality checks, production, inventory, warehousing, finished goods, sales, and distribution through one platform—so teams can maintain better visibility as products move from origin through processing and into the market.',
    imageUrl: '/images/agro_traceability_production.webp',
    secondary: EXPLORE,
  },
  {
    headline: 'Every Batch, Warehouse and Product Movement — In One Connected View.',
    subhead:
      'Bring procurement, raw-material stores, production, quality inspection, inventory, warehousing, sales, and dispatch together in one connected platform. Gain better visibility across operations and make faster decisions as products move through your business.',
    imageUrl: '/images/agro_quality_operational_control.webp',
    secondary: { label: 'See How UpWon Connects Your Operations', href: '/what-is-upwon' },
  },
  {
    headline: 'Source Better, Process Smarter — Manage Every Movement in One Flow.',
    subhead:
      'Simplify the journey from raw-material procurement through processing, quality, storage, sales, and distribution with one connected platform designed to help growing spices and agro-processing businesses stay coordinated.',
    imageUrl: '/images/agro_scale_growth.webp',
    secondary: EXPLORE,
  },
];

/** The copy over the trust section. The second half is the orange accent. */
const TRUST_COPY = {
  eyebrow: 'TRUSTED BY GROWING BRANDS',
  heading:
    'Built to Keep Raw Materials, Processing, Quality, Warehouses, **and Every Sales Channel Connected.**',
  subtext:
    'Teams across spices, agro-processing, food, and FMCG use UpWon to keep procurement, production, quality, inventory, and distribution connected across their locations.',
};

/** The client marquee, in the order it scrolls. */
const TRUST_LOGOS = [
  { alt: 'Winni', imageUrl: '/images/testimonial/winni.webp' },
  { alt: 'U2 Cake', imageUrl: '/images/testimonial/u2cake.webp' },
  { alt: 'OFC', imageUrl: '/images/testimonial/ofc.webp' },
  { alt: 'Monginis', imageUrl: '/images/testimonial/mongignis.webp' },
  { alt: 'Kaka Halwai', imageUrl: '/images/testimonial/kaka%20halwai.webp' },
  { alt: 'Gokul', imageUrl: '/images/testimonial/gokul.webp' },
];

/** The product screenshot under the marquee. */
const TRUST_PANEL = {
  imageUrl: '/images/agro_proof_strip.webp',
  imageAlt:
    'The UpWon dashboard showing procurement, production, inventory and sales for a spices and agro-processing business',
};

/** The copy on the core capabilities panel. */
const CAPABILITIES_COPY = {
  eyebrow: 'CORE CAPABILITIES',
  heading: 'Built to Power Every Step of Your **Spices & Agro Processing Business**',
  subtext:
    'End-to-end capabilities to simplify operations, improve visibility, and support the growth of your spices and agro-processing business.',
};

/** The spices-and-leaves background around the panel. */
const CAPABILITIES_BACKGROUND_URL = '/images/agro_core_capability_back.webp';

/** The capabilities grid, in order. Their numbers follow this order on the site. */
const CAPABILITIES = [
  {
    title: 'Centralized Raw Material & Inventory Control',
    description:
      'Get a clearer view of raw materials, ingredients, packaging materials, work-in-process items, finished products, and stock movement across processing locations and warehouses.',
    icon: 'Boxes',
  },
  {
    title: 'Connected Procurement Workflows',
    description:
      'Bring supplier requirements, purchasing activity, incoming materials, inspection touchpoints, and inventory availability closer together.',
    icon: 'ShoppingCart',
  },
  {
    title: 'Production & Processing Management',
    description:
      'Connect production requirements, material availability, processing activities, and finished-product movement with better visibility across operational workflows.',
    icon: 'Factory',
  },
  {
    title: 'Quality Inspection & Operational Compliance',
    description:
      'Maintain connected visibility across quality inspection touchpoints, product records, and operational requirements throughout procurement and production.',
    icon: 'ShieldCheck',
  },
  {
    title: 'Batch & Product Movement Visibility',
    description:
      'Maintain clearer visibility as materials and products move through processing, storage, warehouse, dispatch, and distribution workflows.',
    icon: 'Package',
  },
  {
    title: 'Warehouse & Storage Operations',
    description:
      'Support day-to-day activities including material receipt, storage, transfers, stock tracking, picking, dispatch, and product movement.',
    icon: 'Warehouse',
  },
  {
    title: 'Smarter Sales & Order Management',
    description:
      'Manage customer and channel orders through connected workflows with greater visibility from order processing to fulfillment.',
    icon: 'ClipboardCheck',
  },
  {
    title: 'Real-Time Business Insights',
    description:
      'Access dashboards and reports that provide visibility into procurement, inventory, production, stock movement, sales, location activity, and overall business operations.',
    icon: 'BarChart3',
  },
];

/** The copy over the connected platform groups. */
const PLATFORM_COPY = {
  eyebrow: 'HOW UPWON HELPS',
  heading: 'One Connected Platform for Your **Spices & Agro Processing Operations**',
  subtext:
    'UpWon connects the key workflows behind spices and agro-processing businesses—helping teams manage the movement of raw materials, batches, products, inventory, information, and operations through one unified platform.',
};

/** The illustration behind the section. */
const PLATFORM_BACKGROUND_URL = '/images/agro_how_upwon_bg.webp';

/** The workflow groups, in order. Their numbers follow this order on the site. */
const PLATFORM_GROUPS = [
  {
    title: 'Procurement & Purchasing',
    description: 'Manage supplier requirements, purchase activity, and raw material availability.',
    icon: 'ShoppingCart',
  },
  {
    title: 'Raw Material & Store Management',
    description: 'Track and manage incoming materials, stores, and stock availability.',
    icon: 'Boxes',
  },
  {
    title: 'Quality Inspection',
    description: 'Keep quality checkpoints and batch-level visibility across all stages.',
    icon: 'ClipboardCheck',
  },
  {
    title: 'Production & Processing Management',
    description:
      'Connect raw-material requirements, processing activities, and production planning.',
    icon: 'Factory',
  },
  {
    title: 'Inventory & Warehouse Operations',
    description:
      'Track raw materials, work-in-process, finished goods, storage, and warehouse movement.',
    icon: 'Warehouse',
  },
  {
    title: 'Sales, Logistics & Multi-Location Operations',
    description: 'Manage orders, dispatch, logistics, and operations across multiple locations.',
    icon: 'Truck',
  },
];

/**
 * The copy over the coverage tiles. The newline is the break the heading takes
 * from 640px up; on phones the site runs it as one line.
 */
const COVERAGE_COPY = {
  eyebrow: 'INDUSTRY COVERAGE',
  heading: 'Built for a Wide Range of\n**Spices & Agro Processing Businesses.**',
  subtext:
    'UpWon can support connected workflows across processing and value-added product categories, including:',
};

/** The coverage tiles, in order. */
const COVERAGE_CATEGORIES = [
  { label: 'Spices & Seasonings', imageUrl: '/images/agro_indust_spices_seasoning.webp' },
  { label: 'Whole & Ground Spices', imageUrl: '/images/agro_indust_ground_spices.webp' },
  { label: 'Spice Blends', imageUrl: '/images/agro_indust_spice_blends.webp' },
  {
    label: 'Private Label & Co-Packing Operations',
    imageUrl: '/images/agro_indust_copacking_oper.webp',
  },
  { label: 'Grain & Pulse Processing', imageUrl: '/images/agro_indust_grain_pulse.webp' },
  { label: 'Flour & Milling Operations', imageUrl: '/images/agro_indust_flour_milling.webp' },
  {
    label: 'Oilseed & Edible Oil Processing',
    imageUrl: '/images/agro_indust_adible_oil_processing.webp',
  },
  {
    label: 'Fruit & Vegetable Processing',
    imageUrl: '/images/agro_indust_vegetabel_processing.webp',
  },
  { label: 'Dehydrated & Dried Products', imageUrl: '/images/agro_indust_dried_products.webp' },
  { label: 'Herbs & Botanical Products', imageUrl: '/images/agro_indust_botanical_products.webp' },
  { label: 'Packaged Agro Products', imageUrl: '/images/agro_indust_package_agro_product.webp' },
  {
    label: 'Multi-Location Processing Businesses',
    imageUrl: '/images/agro_indust_business_processing.webp',
  },
];

/** The copy over the FAQ accordion. */
const FAQ_COPY = {
  eyebrow: 'FAQ',
  heading: 'Questions Processing Teams **Ask Before They Switch.**',
  subtext:
    'Practical answers to what spices and agro-processing teams want to know before moving procurement, processing and distribution onto one platform.',
};

/** The practical questions processing teams ask before they switch. */
const FAQ_ENTRIES = [
  {
    question: 'What is spices and agro-processing ERP software?',
    answer:
      'A connected business platform that can bring together workflows such as procurement, raw materials, quality inspection, production, inventory, warehousing, sales, finance, reporting, and distribution.',
  },
  {
    question: 'Can UpWon help manage raw materials and production workflows?',
    answer:
      'Yes. Procurement, raw-material availability, production requirements, processing activity, inventory movement and finished-product workflows run through one system, so what is on hand, what is being produced and where it has moved stay visible together rather than across separate registers.',
  },
  {
    question: 'Can the platform support quality inspection and batch-related workflows?',
    answer:
      'Yes. Quality inspection touchpoints connect to the materials and products they cover, so checks stay attached to what is moving through processing instead of being reconstructed from paper afterwards.',
  },
  {
    question: 'Can UpWon support multiple processing locations and warehouses?',
    answer:
      'Yes. Inventory and operational activity are tracked across plants, processing units, warehouses, depots and other locations in one system, so stock position and movement can be seen per location rather than assembled from separate sheets.',
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
  heading: 'Ready to Bring Your **Spices & Agro Processing Operations Together?**',
  subtext:
    'Connect procurement, raw materials, quality, processing, production, inventory, warehouses, sales, distribution, and business operations through one platform designed to support growing processing businesses.',
};

/** The closing band: its two crops and two buttons. */
const CTA_BAND = {
  desktopImageUrl: '/images/agro_desktop_cta.webp',
  mobileImageUrl: '/images/agro_mobile_cta.webp',
  primaryLabel: 'Request a Demo',
  primaryHref: '/demo',
  secondaryLabel: 'Explore UpWon Solutions',
  secondaryHref: '/what-is-upwon',
};

export async function seedSpicesAgroPage(client: PoolClient): Promise<{
  heroSlides: number;
  trustCopy: number;
  trustLogos: number;
  trustPanel: number;
  capabilitiesCopy: number;
  capabilitiesPanel: number;
  capabilities: number;
  platformCopy: number;
  platformPanel: number;
  platformGroups: number;
  coverageCopy: number;
  coverageCategories: number;
  faqCopy: number;
  faqEntries: number;
  ctaCopy: number;
  ctaSection: number;
}> {
  let heroSlides = 0;
  let trustLogos = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM spices_agro_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO spices_agro_hero_slides
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
    VALUES ('spices-agro', 'trust', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [TRUST_COPY.eyebrow, TRUST_COPY.heading, TRUST_COPY.subtext],
  );
  const trustCopy = copyResult.rowCount ?? 0;

  const existingLogos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM spices_agro_trust_logos',
  );
  if (Number(existingLogos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO spices_agro_trust_logos (image_url, alt, display_order, status)
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

  const panelResult = await client.query(
    `
    INSERT INTO spices_agro_trust_panel (singleton, image_url, image_alt)
    VALUES (TRUE, $1, $2)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [TRUST_PANEL.imageUrl, TRUST_PANEL.imageAlt],
  );
  const trustPanel = panelResult.rowCount ?? 0;

  const capabilitiesCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('spices-agro', 'capabilities', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [CAPABILITIES_COPY.eyebrow, CAPABILITIES_COPY.heading, CAPABILITIES_COPY.subtext],
  );
  const capabilitiesCopy = capabilitiesCopyResult.rowCount ?? 0;

  const capabilitiesPanelResult = await client.query(
    `
    INSERT INTO spices_agro_capabilities_panel (singleton, image_url)
    VALUES (TRUE, $1)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [CAPABILITIES_BACKGROUND_URL],
  );
  const capabilitiesPanel = capabilitiesPanelResult.rowCount ?? 0;

  let capabilities = 0;
  const existingCapabilities = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM spices_agro_capabilities',
  );
  if (Number(existingCapabilities.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO spices_agro_capabilities (title, description, icon, display_order, status)
      SELECT u.title, u.description, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(title, description, icon, position)
      `,
      [
        CAPABILITIES.map((c) => c.title),
        CAPABILITIES.map((c) => c.description),
        CAPABILITIES.map((c) => c.icon),
        CAPABILITIES.map((_, index) => index),
      ],
    );
    capabilities = result.rowCount ?? 0;
  }

  const platformCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('spices-agro', 'platform', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [PLATFORM_COPY.eyebrow, PLATFORM_COPY.heading, PLATFORM_COPY.subtext],
  );
  const platformCopy = platformCopyResult.rowCount ?? 0;

  const platformPanelResult = await client.query(
    `
    INSERT INTO spices_agro_platform_panel (singleton, image_url)
    VALUES (TRUE, $1)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [PLATFORM_BACKGROUND_URL],
  );
  const platformPanel = platformPanelResult.rowCount ?? 0;

  let platformGroups = 0;
  const existingGroups = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM spices_agro_platform_groups',
  );
  if (Number(existingGroups.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO spices_agro_platform_groups (title, description, icon, display_order, status)
      SELECT u.title, u.description, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(title, description, icon, position)
      `,
      [
        PLATFORM_GROUPS.map((g) => g.title),
        PLATFORM_GROUPS.map((g) => g.description),
        PLATFORM_GROUPS.map((g) => g.icon),
        PLATFORM_GROUPS.map((_, index) => index),
      ],
    );
    platformGroups = result.rowCount ?? 0;
  }

  const coverageCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('spices-agro', 'coverage', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [COVERAGE_COPY.eyebrow, COVERAGE_COPY.heading, COVERAGE_COPY.subtext],
  );
  const coverageCopy = coverageCopyResult.rowCount ?? 0;

  let coverageCategories = 0;
  const existingCategories = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM spices_agro_coverage_categories',
  );
  if (Number(existingCategories.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO spices_agro_coverage_categories (image_url, label, display_order, status)
      SELECT u.image_url, u.label, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(image_url, label, position)
      `,
      [
        COVERAGE_CATEGORIES.map((c) => c.imageUrl),
        COVERAGE_CATEGORIES.map((c) => c.label),
        COVERAGE_CATEGORIES.map((_, index) => index),
      ],
    );
    coverageCategories = result.rowCount ?? 0;
  }

  const faqCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('spices-agro', 'faq', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [FAQ_COPY.eyebrow, FAQ_COPY.heading, FAQ_COPY.subtext],
  );
  const faqCopy = faqCopyResult.rowCount ?? 0;

  let faqEntries = 0;
  const existingFaqs = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM spices_agro_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO spices_agro_faq_entries (question, answer, display_order, status)
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
    VALUES ('spices-agro', 'cta', NULL, $1, $2)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [CTA_COPY.heading, CTA_COPY.subtext],
  );
  const ctaCopy = ctaCopyResult.rowCount ?? 0;

  const ctaSectionResult = await client.query(
    `
    INSERT INTO spices_agro_cta_section
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
    trustLogos,
    trustPanel,
    capabilitiesCopy,
    capabilitiesPanel,
    capabilities,
    platformCopy,
    platformPanel,
    platformGroups,
    coverageCopy,
    coverageCategories,
    faqCopy,
    faqEntries,
    ctaCopy,
    ctaSection,
  };
}
