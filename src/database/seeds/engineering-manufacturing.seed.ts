// src/database/seeds/engineering-manufacturing.seed.ts

import { PoolClient } from 'pg';

/**
 * The Engineering & Manufacturing industry page, exactly as it renders today:
 * the four hero slides from the website's EngineeringHeroSection, and the
 * trust section's copy, figure cards and logos from EngineeringProofStrip, and
 * the core capabilities from EngineeringCoreCapabilities, the connected
 * platform section from EngineeringHowUpwonHelps, the industry coverage
 * section from EngineeringIndustryCoverage, the FAQ from EngineeringFaqSection,
 * and the closing band from EngineeringCtaSection.
 */

const EYEBROW = 'ENGINEERING & MANUFACTURING';
const CTA = { label: 'Request a Demo', href: '/demo' };
const EXPLORE = { label: 'Explore UpWon for Engineering & Manufacturing', href: '/what-is-upwon' };

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
      'From Raw Materials to Finished Products — Keep Every Manufacturing Operation Connected.',
    subhead:
      'Connect procurement, raw materials, bill of materials, production planning, quality, inventory, warehouses, sales, dispatch, people, and business operations through one platform built to bring greater visibility and coordination to growing engineering and manufacturing businesses.',
    imageUrl: '/images/eng_hero_raw_material.webp',
    secondary: EXPLORE,
  },
  {
    headline: 'Every Material, Every Process — Every Production Movement Connected.',
    subhead:
      'Connect procurement, raw materials, bill of materials, production planning, quality, inventory, warehouses, finished goods, sales, and dispatch through one platform—so teams can maintain better visibility as materials move through every stage of manufacturing.',
    imageUrl: '/images/eng_hero_production_shop_visibility.webp',
    secondary: EXPLORE,
  },
  {
    headline:
      'Every Material, Process, Warehouse and Product Movement — In One Connected View.',
    subhead:
      'Bring procurement, raw-material stores, bill of materials, production, quality inspection, inventory, warehouses, sales, and dispatch together in one connected platform. Gain better visibility across operations and make faster decisions as products move through your business.',
    imageUrl: '/images/eng_hero_planning_oper_control.webp',
    secondary: { label: 'See How UpWon Connects Your Operations', href: '/what-is-upwon' },
  },
  {
    headline:
      'Plan Better, Produce Smarter — Manage Every Manufacturing Movement in One Flow.',
    subhead:
      'Simplify the journey from raw-material procurement through production, quality, storage, sales, and dispatch with one connected platform designed to help engineering and manufacturing businesses stay coordinated as they grow.',
    imageUrl: '/images/eng_hero_scale_growth.webp',
    secondary: EXPLORE,
  },
];

/**
 * The copy over the trust section. The accent is the second half of the
 * heading, which the site draws in the orange gradient.
 */
const TRUST_COPY = {
  eyebrow: 'TRUSTED BY GROWING BRANDS',
  heading:
    'Built to Keep Raw Materials, Production, Quality, Warehouses, **and Every Finished Product Movement Connected.**',
  subtext:
    'Teams across manufacturing, food, dairy, and FMCG use UpWon to keep procurement, production, quality, inventory, and dispatch connected across their locations.',
};

/**
 * The three figure cards. Each turns over between two figures; the colours are
 * the ones the section ships - the orange is the site's orange-500.
 */
const TRUST_CARDS = [
  {
    icon: 'Boxes',
    accentColor: '#E85A2A',
    tintColor: '#FDF0E6',
    value: '2.5 Cr+',
    label: 'Products managed across connected operations',
    altValue: '18,000+',
    altLabel: 'Inventory points tracked across locations',
  },
  {
    icon: 'Factory',
    accentColor: '#2F6FED',
    tintColor: '#E9F1FD',
    value: '45+',
    label: 'Distribution locations kept in one flow',
    altValue: '25,000+',
    altLabel: 'Sales channels connected end to end',
  },
  {
    icon: 'BarChart3',
    accentColor: '#1F9D55',
    tintColor: '#E8F7ED',
    value: '3 Lakh+',
    label: 'Field and floor teams working in one system',
    altValue: 'Real-time',
    altLabel: 'Visibility across operations and reporting',
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

/** The copy on the left of the core capabilities artwork. */
const CAPABILITIES_COPY = {
  eyebrow: 'CORE CAPABILITIES',
  heading: 'Built to Power Every Part of Your **Manufacturing Operations**',
  subtext:
    'From procurement to production, inventory to insights — UpWon brings all critical operations together in one connected platform, helping you operate with greater clarity, control, and efficiency.',
};

/**
 * The eight capabilities, in the order they fill the artwork's cards. The
 * colours are the stacked cards' - #E85A2A is the site's orange-500.
 */
const CAPABILITIES = [
  {
    title: 'Centralized Procurement & Raw Material Control',
    description:
      'Suppliers, purchase activity, incoming materials, and raw-material availability in one view.',
    icon: 'ShoppingCart',
    accentColor: '#E85A2A',
    tintColor: '#FDF0E6',
  },
  {
    title: 'Bill of Materials & Production Planning',
    description:
      'Bill of materials, material requirements, and production planning kept connected.',
    icon: 'FileText',
    accentColor: '#2F6FED',
    tintColor: '#E9F1FD',
  },
  {
    title: 'Connected Production Management',
    description:
      'Production requirements, material availability, work progress, and product movement together.',
    icon: 'Settings',
    accentColor: '#1F9D55',
    tintColor: '#E8F7ED',
  },
  {
    title: 'Quality Inspection & Product Control',
    description:
      'Quality inspection touchpoints, material checks, and product records across production.',
    icon: 'ShieldCheck',
    accentColor: '#DC2626',
    tintColor: '#FDEEF0',
  },
  {
    title: 'Inventory & Stock Management',
    description:
      'Raw materials, components, work-in-process, and finished products across every location.',
    icon: 'Database',
    accentColor: '#7C3AED',
    tintColor: '#F2ECFD',
  },
  {
    title: 'Warehouse & Material Movement',
    description:
      'Receiving, storage, transfers, picking, packing, and dispatch across warehouses.',
    icon: 'Warehouse',
    accentColor: '#C8820A',
    tintColor: '#FDF6E0',
  },
  {
    title: 'Asset & Operational Visibility',
    description:
      'Operational assets and business activity visible for better coordination and reporting.',
    icon: 'Activity',
    accentColor: '#0D9488',
    tintColor: '#E6F6F4',
  },
  {
    title: 'Real-Time Business Insights',
    description:
      'Dashboards covering procurement, production, inventory, quality, sales, and operations.',
    icon: 'BarChart3',
    accentColor: '#D6336C',
    tintColor: '#FDECF3',
  },
];

/** The copy on the left of the connected platform section. */
const PLATFORM_COPY = {
  eyebrow: 'HOW UPWON HELPS',
  heading:
    'One Connected Platform for Your **Engineering & Manufacturing** Operations',
  subtext:
    'UpWon connects the key workflows behind engineering and manufacturing businesses—helping teams manage the movement of materials, production information, inventory, products, people, and operations through one unified platform.',
};

/** The centre illustration and the label over the workflow list. */
const PLATFORM_PANEL = {
  imageUrl: '/images/eng_how_upwon.webp',
  imageAlt:
    'A connected plant view with procurement, production planning, quality, raw materials, inventory and dispatch running through one UpWon dashboard',
  listLabel: 'Connected Workflows Across',
};

/** The workflow column, in order. #E85A2A is the site's orange-500. */
const PLATFORM_WORKFLOWS = [
  { label: 'Procurement & Purchasing', icon: 'ShoppingCart', accentColor: '#E85A2A', tintColor: '#FDF0E6' },
  { label: 'Raw Material & Department Store Management', icon: 'Boxes', accentColor: '#2F6FED', tintColor: '#E9F1FD' },
  { label: 'Bill of Materials Management', icon: 'FileText', accentColor: '#7C3AED', tintColor: '#F2ECFD' },
  { label: 'Production Planning & Management', icon: 'Settings', accentColor: '#1F9D55', tintColor: '#E8F7ED' },
  { label: 'Quality Inspection', icon: 'ShieldCheck', accentColor: '#C8820A', tintColor: '#FDF6E0' },
  { label: 'Inventory & Stock Management', icon: 'Database', accentColor: '#2F6FED', tintColor: '#E9F1FD' },
  { label: 'Warehouse Operations', icon: 'Warehouse', accentColor: '#DC2626', tintColor: '#FDEEF0' },
  { label: 'Sales & Order Management', icon: 'ClipboardList', accentColor: '#DC2626', tintColor: '#FDEEF0' },
  { label: 'Dispatch & Logistics', icon: 'Truck', accentColor: '#7C3AED', tintColor: '#F2ECFD' },
  { label: 'Vendor Management', icon: 'Users', accentColor: '#1F9D55', tintColor: '#E8F7ED' },
  { label: 'Workforce Operations', icon: 'UserCog', accentColor: '#C8820A', tintColor: '#FDF6E0' },
  { label: 'Finance & Reporting', icon: 'BarChart3', accentColor: '#2F6FED', tintColor: '#E9F1FD' },
];

/** The copy over the industry coverage grid. */
const COVERAGE_COPY = {
  eyebrow: 'INDUSTRY COVERAGE',
  heading: 'Built for a Wide Range of **Engineering & Manufacturing Businesses.**',
  subtext:
    'UpWon can support connected workflows across a wide range of engineering and manufacturing environments, including:',
};

/** The illustration feathered into the top right of the section. */
const COVERAGE_IMAGE_URL = '/images/eng_indust_cover.webp';

/** The coverage grid, in order. */
const COVERAGE_CATEGORIES = [
  { label: 'Engineering Components Manufacturing', icon: 'Settings' },
  { label: 'Industrial Equipment Manufacturing', icon: 'Factory' },
  { label: 'Machine & Machinery Manufacturing', icon: 'Wrench' },
  { label: 'Fabrication & Assembly Operations', icon: 'Bot' },
  { label: 'Electrical & Electronic Components', icon: 'Cpu' },
  { label: 'Automotive & Auto Components', icon: 'Car' },
  { label: 'Industrial Parts Manufacturing', icon: 'Cog' },
  { label: 'Metal & Engineering Products', icon: 'Layers' },
  { label: 'Consumer Durables Manufacturing', icon: 'WashingMachine' },
  { label: 'Industrial Goods Manufacturing', icon: 'Package' },
  { label: 'Contract & Job-Based Manufacturing', icon: 'Handshake' },
  { label: 'Multi-Plant Manufacturing Businesses', icon: 'Building2' },
];

/** The copy over the FAQ accordion. */
const FAQ_COPY = {
  eyebrow: 'FAQ',
  heading: 'Questions Manufacturing Teams **Ask Before They Switch.**',
  subtext:
    'Practical answers to what engineering and manufacturing teams want to know before moving procurement, production and dispatch onto one platform.',
};

/** The practical questions manufacturing teams ask before they switch. */
const FAQ_ENTRIES = [
  {
    question: 'What is engineering and manufacturing ERP software?',
    answer:
      'A connected business platform that can bring together workflows such as procurement, raw materials, bill of materials, production planning, quality inspection, inventory, warehousing, sales, finance, reporting, and dispatch.',
  },
  {
    question: 'Can UpWon help manage production planning and scheduling?',
    answer:
      'Yes. Production requirements, material availability, resource planning, production activity and work progress run through one system, so what is planned, what is available and how far a job has moved stay visible together rather than across separate registers.',
  },
  {
    question: 'Can the platform support bill of materials and inventory workflows?',
    answer:
      'Yes. Bills of materials connect to material requirements, raw-material availability, inventory movement and finished-product workflows, so what a product needs and what is actually in stock sit in the same place.',
  },
  {
    question: 'Can UpWon support quality inspection in manufacturing?',
    answer:
      'Yes. Quality inspection touchpoints connect to the procurement and production workflows they cover, so checks stay attached to the materials and products moving through the plant instead of being reconstructed from paper afterwards.',
  },
  {
    question: 'Can UpWon support warehouse operations for manufacturing businesses?',
    answer:
      'Yes. Receiving, inventory, storage, transfers, picking, packing, shipping and material movement run through connected workflows, so stock position and movement can be seen per location rather than assembled from separate sheets.',
  },
  {
    question: 'Can we start with selected solutions and expand later?',
    answer:
      'Yes. The suite is modular and connected, so most businesses start with whichever area is causing the most friction and adopt the rest as they go. Because the workflows share one platform, the data built up in the first phase carries into the next.',
  },
];

/** The closing band's copy. It has no eyebrow. */
const CTA_COPY = {
  heading: 'Ready to Bring Your **Engineering & Manufacturing Operations Together?**',
  subtext:
    'Connect procurement, raw materials, bill of materials, production planning, quality, inventory, warehouses, sales, dispatch, people, and business operations through one platform designed to support growing manufacturing businesses.',
};

/** The closing band: its two crops and two buttons. */
const CTA_BAND = {
  desktopImageUrl: '/images/eng_desktop_cta.webp',
  mobileImageUrl: '/images/eng_mobile_cta.webp',
  primaryLabel: 'Request a Demo',
  primaryHref: '/demo',
  secondaryLabel: 'Explore UpWon Solutions',
  secondaryHref: '/what-is-upwon',
};

export async function seedEngineeringManufacturingPage(client: PoolClient): Promise<{
  heroSlides: number;
  trustCopy: number;
  trustCards: number;
  trustLogos: number;
  capabilitiesCopy: number;
  capabilities: number;
  platformCopy: number;
  platformPanel: number;
  platformWorkflows: number;
  coverageCopy: number;
  coveragePanel: number;
  coverageCategories: number;
  faqCopy: number;
  faqEntries: number;
  ctaCopy: number;
  ctaSection: number;
}> {
  let heroSlides = 0;
  let trustCards = 0;
  let trustLogos = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM engineering_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO engineering_hero_slides
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
    VALUES ('engineering-manufacturing', 'trust', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [TRUST_COPY.eyebrow, TRUST_COPY.heading, TRUST_COPY.subtext],
  );
  const trustCopy = copyResult.rowCount ?? 0;

  const existingCards = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM engineering_trust_cards',
  );
  if (Number(existingCards.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO engineering_trust_cards
        (icon, accent_color, tint_color, value, label, alt_value, alt_label,
         display_order, status)
      SELECT u.icon, u.accent_color, u.tint_color, u.value, u.label,
             u.alt_value, u.alt_label, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                    $6::text[], $7::text[], $8::int[])
          AS u(icon, accent_color, tint_color, value, label, alt_value, alt_label, position)
      `,
      [
        TRUST_CARDS.map((c) => c.icon),
        TRUST_CARDS.map((c) => c.accentColor),
        TRUST_CARDS.map((c) => c.tintColor),
        TRUST_CARDS.map((c) => c.value),
        TRUST_CARDS.map((c) => c.label),
        TRUST_CARDS.map((c) => c.altValue),
        TRUST_CARDS.map((c) => c.altLabel),
        TRUST_CARDS.map((_, index) => index),
      ],
    );
    trustCards = result.rowCount ?? 0;
  }

  const existingLogos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM engineering_trust_logos',
  );
  if (Number(existingLogos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO engineering_trust_logos (image_url, alt, display_order, status)
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
    VALUES ('engineering-manufacturing', 'capabilities', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [CAPABILITIES_COPY.eyebrow, CAPABILITIES_COPY.heading, CAPABILITIES_COPY.subtext],
  );
  const capabilitiesCopy = capabilitiesCopyResult.rowCount ?? 0;

  let capabilities = 0;
  const existingCapabilities = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM engineering_capabilities',
  );
  if (Number(existingCapabilities.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO engineering_capabilities
        (title, description, icon, accent_color, tint_color, display_order, status)
      SELECT u.title, u.description, u.icon, u.accent_color, u.tint_color, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::int[])
          AS u(title, description, icon, accent_color, tint_color, position)
      `,
      [
        CAPABILITIES.map((c) => c.title),
        CAPABILITIES.map((c) => c.description),
        CAPABILITIES.map((c) => c.icon),
        CAPABILITIES.map((c) => c.accentColor),
        CAPABILITIES.map((c) => c.tintColor),
        CAPABILITIES.map((_, index) => index),
      ],
    );
    capabilities = result.rowCount ?? 0;
  }

  const platformCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('engineering-manufacturing', 'platform', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [PLATFORM_COPY.eyebrow, PLATFORM_COPY.heading, PLATFORM_COPY.subtext],
  );
  const platformCopy = platformCopyResult.rowCount ?? 0;

  const platformPanelResult = await client.query(
    `
    INSERT INTO engineering_platform_panel (singleton, image_url, image_alt, list_label)
    VALUES (TRUE, $1, $2, $3)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [PLATFORM_PANEL.imageUrl, PLATFORM_PANEL.imageAlt, PLATFORM_PANEL.listLabel],
  );
  const platformPanel = platformPanelResult.rowCount ?? 0;

  let platformWorkflows = 0;
  const existingWorkflows = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM engineering_platform_workflows',
  );
  if (Number(existingWorkflows.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO engineering_platform_workflows
        (label, icon, accent_color, tint_color, display_order, status)
      SELECT u.label, u.icon, u.accent_color, u.tint_color, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
          AS u(label, icon, accent_color, tint_color, position)
      `,
      [
        PLATFORM_WORKFLOWS.map((w) => w.label),
        PLATFORM_WORKFLOWS.map((w) => w.icon),
        PLATFORM_WORKFLOWS.map((w) => w.accentColor),
        PLATFORM_WORKFLOWS.map((w) => w.tintColor),
        PLATFORM_WORKFLOWS.map((_, index) => index),
      ],
    );
    platformWorkflows = result.rowCount ?? 0;
  }

  const coverageCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('engineering-manufacturing', 'coverage', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [COVERAGE_COPY.eyebrow, COVERAGE_COPY.heading, COVERAGE_COPY.subtext],
  );
  const coverageCopy = coverageCopyResult.rowCount ?? 0;

  const coveragePanelResult = await client.query(
    `
    INSERT INTO engineering_coverage_panel (singleton, image_url)
    VALUES (TRUE, $1)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [COVERAGE_IMAGE_URL],
  );
  const coveragePanel = coveragePanelResult.rowCount ?? 0;

  let coverageCategories = 0;
  const existingCategories = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM engineering_coverage_categories',
  );
  if (Number(existingCategories.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO engineering_coverage_categories (label, icon, display_order, status)
      SELECT u.label, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(label, icon, position)
      `,
      [
        COVERAGE_CATEGORIES.map((c) => c.label),
        COVERAGE_CATEGORIES.map((c) => c.icon),
        COVERAGE_CATEGORIES.map((_, index) => index),
      ],
    );
    coverageCategories = result.rowCount ?? 0;
  }

  const faqCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('engineering-manufacturing', 'faq', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [FAQ_COPY.eyebrow, FAQ_COPY.heading, FAQ_COPY.subtext],
  );
  const faqCopy = faqCopyResult.rowCount ?? 0;

  let faqEntries = 0;
  const existingFaqs = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM engineering_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO engineering_faq_entries (question, answer, display_order, status)
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
    VALUES ('engineering-manufacturing', 'cta', NULL, $1, $2)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [CTA_COPY.heading, CTA_COPY.subtext],
  );
  const ctaCopy = ctaCopyResult.rowCount ?? 0;

  const ctaSectionResult = await client.query(
    `
    INSERT INTO engineering_cta_section
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
    trustCards,
    trustLogos,
    capabilitiesCopy,
    capabilities,
    platformCopy,
    platformPanel,
    platformWorkflows,
    coverageCopy,
    coveragePanel,
    coverageCategories,
    faqCopy,
    faqEntries,
    ctaCopy,
    ctaSection,
  };
}
