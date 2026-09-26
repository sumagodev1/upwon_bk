// src/database/seeds/qsr-franchise.seed.ts

import { PoolClient } from 'pg';

/**
 * The QSR & Franchise F&B industry page, exactly as it renders today: the four
 * hero slides from the website's QsrFranchiseHeroSection, and the trust
 * section's copy, logos, stat tiles and photographs from QsrProofStrip, the
 * core capabilities from QsrCoreCapabilities, the connected platform section
 * from QsrHowUpwonHelps, the industry coverage row from QsrIndustryCoverage,
 * the FAQ from QsrFaqSection, and the closing band from QsrCtaSection.
 */

const EYEBROW = 'QSR & FRANCHISE F&B';
const CTA = { label: 'Request a Demo', href: '/demo' };
const EXPLORE = {
  label: 'Explore UpWon for QSR & Franchise F&B',
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
    headline: 'From Central Kitchen to Every Outlet — Keep Your F&B Operations Connected.',
    subhead:
      'Manage procurement, recipes, production, inventory, central kitchens, outlets, franchise operations, people, sales, distribution, and business performance through one connected platform built to bring greater visibility, control, and coordination to your growing food business.',
    imageUrl: '/images/qsr_hero_central_kitchan.webp',
    secondary: EXPLORE,
  },
  {
    headline: 'Every Recipe, Every Outlet — Every Operational Movement Connected.',
    subhead:
      'Connect central kitchens, ingredients, recipes, production, inventory, outlets, franchise partners, orders, people, and business operations through one platform—so your teams can maintain better visibility across every location.',
    imageUrl: '/images/qsr_hero_multi_outlet.webp',
    secondary: EXPLORE,
  },
  {
    headline:
      'Every Kitchen, Outlet, Franchise and Product Movement — In One Connected View.',
    subhead:
      'Bring procurement, production, inventory, central kitchens, outlets, franchise operations, sales, and reporting together in one connected platform. Gain better visibility across locations and maintain stronger operational coordination as your network grows.',
    imageUrl: '/images/qsr_hero_consistancy_control.webp',
    secondary: { label: 'See How UpWon Connects Your Operations', href: '/what-is-upwon' },
  },
  {
    headline: 'Open More Outlets, Move Faster — Manage Every Location in One Flow.',
    subhead:
      'Simplify the journey from procurement and central production to outlet inventory, sales, workforce, franchise operations, and business reporting with one connected platform designed to help food brands scale with greater control.',
    imageUrl: '/images/qsr_hero_scale_growth.webp',
    secondary: EXPLORE,
  },
];

/**
 * The copy over the trust section. The line break holds the heading to two
 * lines at desktop widths; the second line is the orange accent.
 */
const TRUST_COPY = {
  eyebrow: 'PROOF STRIP',
  heading:
    'Built to Keep Central Kitchens, Outlets, Franchise Networks,\n**and Every F&B Operation Connected.**',
  subtext:
    'From procurement and central production to outlet inventory, sales, people, and franchise operations—UpWon keeps every location working from the same information.',
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

/** The mosaic's stat tiles, in order. */
const TRUST_STATS = [
  {
    value: '2.5 Cr+',
    label: 'Products managed',
    description: 'Recipes, ingredients, and menu items held in one connected catalogue.',
    icon: 'UtensilsCrossed',
  },
  {
    value: '18,000+',
    label: 'Inventory points tracked',
    description: 'Central kitchen and outlet stock followed across every location.',
    icon: 'Warehouse',
  },
  {
    value: '25,000+',
    label: 'Sales channels connected',
    description: 'Outlet, franchise, and delivery orders moving through one system.',
    icon: 'Store',
  },
];

/** The mosaic's two photographs. */
const TRUST_PANEL = {
  smallImageUrl: '/images/qsr_proof_strip1.webp',
  tallImageUrl: '/images/qsr_proof_strip2.webp',
};

/** The copy over the core capabilities. */
const CAPABILITIES_COPY = {
  eyebrow: 'CORE CAPABILITIES',
  heading: 'Built to Power Every Part of Your **F&B Operations**',
  subtext:
    'From ingredients to outlets, people to performance — UpWon brings all your key operations together in one connected platform.',
};

/** The artwork beside the cards. */
const CAPABILITIES_PANEL = {
  imageUrl: '/images/qsr_core_capabilities.webp',
  imageAlt:
    'A chef reviewing the UpWon dashboard, surrounded by procurement, production, recipes, outlets, inventory, sales and workforce workflows',
};

/** The cards, in order. Their numbers and icon colours follow this order on the site. */
const CAPABILITIES = [
  {
    title: 'Centralized Procurement & Inventory Control',
    description:
      'Get a clearer view of ingredients, raw materials, packaging materials, semi-finished goods, finished products, and stock movement across central kitchens, warehouses, and outlets.',
    icon: 'ShoppingCart',
  },
  {
    title: 'Connected Central Kitchen Operations',
    description:
      'Bring production requirements, recipes, materials, production activities, and outlet demand closer together with better visibility across central kitchen workflows.',
    icon: 'Factory',
  },
  {
    title: 'Recipe, Production & Cost Visibility',
    description:
      'Maintain better visibility across recipes, ingredient requirements, production activities, consumption, and operational cost-related workflows.',
    icon: 'FileText',
  },
  {
    title: 'Multi-Outlet & Franchise Operations',
    description:
      'Bring company-owned outlets, franchise locations, kitchens, warehouses, and operational teams onto one connected system.',
    icon: 'Store',
  },
  {
    title: 'Outlet Inventory & Stock Movement',
    description:
      'Support connected workflows for stock receipt, transfers, issues, returns, consumption, replenishment, and movement between locations.',
    icon: 'Package',
  },
  {
    title: 'Smarter Sales & Order Management',
    description:
      'Manage orders and sales activity through connected workflows with better visibility across outlets, channels, and operational teams.',
    icon: 'BarChart3',
  },
  {
    title: 'Connected Workforce Operations',
    description:
      'Support employees across kitchens, outlets, offices, and other locations with connected workflows for attendance, shifts, payroll, leave, and workforce visibility.',
    icon: 'Users',
  },
  {
    title: 'Real-Time Business Insights',
    description:
      'Access dashboards and reports that provide visibility into inventory, outlet activity, sales, production, location performance, and overall business operations.',
    icon: 'PieChart',
  },
];

/** The copy over the connected platform section. */
const PLATFORM_COPY = {
  eyebrow: 'HOW UPWON HELPS',
  heading: 'One Connected Platform for Your **QSR & Franchise F&B Operations**',
  subtext:
    'UpWon connects the key workflows behind multi-outlet and franchise-led food businesses—helping teams manage the movement of ingredients, products, inventory, orders, people, information, and operations through one unified platform.',
};

/** The artwork, the label over the grid, and the closing line. */
const PLATFORM_PANEL = {
  imageUrl: '/images/qsr_how_upwon_help.webp',
  imageAlt:
    'The UpWon app showing outlets, orders, wastage, on-time dispatch and a weekly operations overview',
  listLabel: 'Connected Workflows Across:',
  closingTitle: 'All Workflows. One Platform.',
  closingSubtext: 'Connect. Control. Grow.',
};

/** The workflow grid, in order. */
const PLATFORM_WORKFLOWS = [
  { label: 'Procurement & Purchasing', icon: 'ShoppingCart' },
  { label: 'Ingredient & Inventory Management', icon: 'Package' },
  { label: 'Recipe & Bill of Materials Management', icon: 'ClipboardList' },
  { label: 'Central Kitchen & Production Management', icon: 'CookingPot' },
  { label: 'Outlet & Store Operations', icon: 'Store' },
  { label: 'Warehouse Operations', icon: 'Warehouse' },
  { label: 'Sales & Order Management', icon: 'TrendingUp' },
  { label: 'Franchise & Multi-Location Operations', icon: 'MapPin' },
  { label: 'Workforce & Shift Management', icon: 'Users' },
  { label: 'Distribution & Dispatch', icon: 'Truck' },
  { label: 'Finance & Reporting', icon: 'Receipt' },
  { label: 'Business Performance Insights', icon: 'PieChart' },
];

/** The copy over the industry coverage row. */
const COVERAGE_COPY = {
  eyebrow: 'INDUSTRY COVERAGE',
  heading: 'Built for a Wide Range of QSR & **Franchise F&B Businesses.**',
  subtext:
    'UpWon can support connected workflows across a wide range of food-service and multi-location business formats, including:',
};

/** The business formats, in the order the row shows them. */
const COVERAGE_CATEGORIES = [
  { label: 'Quick Service Restaurants (QSRs)', imageUrl: '/images/quick_service_rest.webp', icon: 'Sandwich' },
  { label: 'Restaurant Chains', imageUrl: '/images/rest_chains.webp', icon: 'UtensilsCrossed' },
  { label: 'Franchise-Led Food Brands', imageUrl: '/images/franchise_led.webp', icon: 'Store' },
  { label: 'Multi-Outlet Cafés', imageUrl: '/images/cafe_outlet.webp', icon: 'Coffee' },
  { label: 'Central Kitchen Operations', imageUrl: '/images/qsr_central_kitchan_oper.webp', icon: 'ChefHat' },
  { label: 'Cloud Kitchen Networks', imageUrl: '/images/cloud_kitcha_net.webp', icon: 'Cloud' },
  {
    label: 'Food Courts & Multi-Brand Food Concepts',
    imageUrl: '/images/food_courts.webp',
    icon: 'Building2',
  },
  { label: 'Bakery & Dessert Chains', imageUrl: '/images/bakery_dessert_chains.webp', icon: 'CakeSlice' },
  {
    label: 'Ice Cream & Frozen Dessert Parlours',
    imageUrl: '/images/dessert_parlor.webp',
    icon: 'IceCreamCone',
  },
  { label: 'Beverage & Café Chains', imageUrl: '/images/beverage_cafe_chains.webp', icon: 'Coffee' },
  {
    label: 'Takeaway & Delivery-First Brands',
    imageUrl: '/images/delivery_first_brands.webp',
    icon: 'Bike',
  },
  { label: 'Multi-Location F&B Businesses', imageUrl: '/images/f_b_businesses.webp', icon: 'Store' },
];

/** The copy over the FAQ accordion. */
const FAQ_COPY = {
  eyebrow: 'FAQ',
  heading: 'Questions Food Brands **Ask Before They Switch.**',
  subtext:
    'Practical answers to what QSR and franchise teams want to know before moving kitchens, outlets and reporting onto one platform.',
};

/** The practical questions multi-outlet and franchise teams ask before they switch. */
const FAQ_ENTRIES = [
  {
    question: 'What is QSR and franchise management software?',
    answer:
      'A connected business platform that can bring together core workflows such as procurement, recipes, production, inventory, central kitchens, outlets, workforce, sales, finance, reporting, and multi-location operations.',
  },
  {
    question: 'Can UpWon help manage central kitchens and multiple outlets?',
    answer:
      'Yes. Central production, inventory, stock movement and outlet requirements run through connected workflows, so what is produced centrally and what each outlet needs stay visible in the same system rather than being reconciled across separate sheets.',
  },
  {
    question: 'Can the platform support franchise and company-owned outlets?',
    answer:
      'Yes. Franchise-led, company-owned and multi-location outlets sit on one connected system, so head office and location teams work from the same operational information rather than reporting up through separate tools.',
  },
  {
    question: 'Can UpWon help manage inventory across outlets?',
    answer:
      'Yes. Ingredients, packaging materials, semi-finished goods and finished products stay visible as they move between warehouses, central kitchens and outlet locations, so stock position can be seen per location instead of assembled after the fact.',
  },
  {
    question: 'Can we start with selected solutions and expand later?',
    answer:
      'Yes. The suite is modular and connected, so most businesses start with whichever area is causing the most friction and adopt the rest as they go. Because the workflows share one platform, the data built up in the first phase carries into the next.',
  },
];

/** The closing band's copy. It has no eyebrow. */
const CTA_COPY = {
  heading: 'Ready to Bring Your **QSR & Franchise F&B Operations Together?**',
  subtext:
    'Connect procurement, central kitchens, recipes, production, inventory, outlets, franchise operations, people, sales, and business performance through one platform designed to support growing multi-location food businesses.',
};

/** The closing band: its two crops and two buttons. */
const CTA_BAND = {
  desktopImageUrl: '/images/qsr_cta_sec_desktop.webp',
  mobileImageUrl: '/images/qsr_cta_sec_mobile.webp',
  primaryLabel: 'Request a Demo',
  primaryHref: '/demo',
  secondaryLabel: 'Explore UpWon Solutions',
  secondaryHref: '/what-is-upwon',
};

export async function seedQsrFranchisePage(client: PoolClient): Promise<{
  heroSlides: number;
  trustCopy: number;
  trustLogos: number;
  trustStats: number;
  trustPanel: number;
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
  let trustLogos = 0;
  let trustStats = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM qsr_franchise_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO qsr_franchise_hero_slides
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
    VALUES ('qsr-franchise', 'trust', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [TRUST_COPY.eyebrow, TRUST_COPY.heading, TRUST_COPY.subtext],
  );
  const trustCopy = copyResult.rowCount ?? 0;

  const existingLogos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM qsr_franchise_trust_logos',
  );
  if (Number(existingLogos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO qsr_franchise_trust_logos (image_url, alt, display_order, status)
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

  const existingStats = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM qsr_franchise_trust_stats',
  );
  if (Number(existingStats.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO qsr_franchise_trust_stats
        (value, label, description, icon, display_order, status)
      SELECT u.value, u.label, u.description, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
          AS u(value, label, description, icon, position)
      `,
      [
        TRUST_STATS.map((s) => s.value),
        TRUST_STATS.map((s) => s.label),
        TRUST_STATS.map((s) => s.description),
        TRUST_STATS.map((s) => s.icon),
        TRUST_STATS.map((_, index) => index),
      ],
    );
    trustStats = result.rowCount ?? 0;
  }

  const panelResult = await client.query(
    `
    INSERT INTO qsr_franchise_trust_panel (singleton, small_image_url, tall_image_url)
    VALUES (TRUE, $1, $2)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [TRUST_PANEL.smallImageUrl, TRUST_PANEL.tallImageUrl],
  );
  const trustPanel = panelResult.rowCount ?? 0;

  const capabilitiesCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('qsr-franchise', 'capabilities', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [CAPABILITIES_COPY.eyebrow, CAPABILITIES_COPY.heading, CAPABILITIES_COPY.subtext],
  );
  const capabilitiesCopy = capabilitiesCopyResult.rowCount ?? 0;

  const capabilitiesPanelResult = await client.query(
    `
    INSERT INTO qsr_franchise_capabilities_panel (singleton, image_url, image_alt)
    VALUES (TRUE, $1, $2)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [CAPABILITIES_PANEL.imageUrl, CAPABILITIES_PANEL.imageAlt],
  );
  const capabilitiesPanel = capabilitiesPanelResult.rowCount ?? 0;

  let capabilities = 0;
  const existingCapabilities = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM qsr_franchise_capabilities',
  );
  if (Number(existingCapabilities.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO qsr_franchise_capabilities (title, description, icon, display_order, status)
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
    VALUES ('qsr-franchise', 'platform', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [PLATFORM_COPY.eyebrow, PLATFORM_COPY.heading, PLATFORM_COPY.subtext],
  );
  const platformCopy = platformCopyResult.rowCount ?? 0;

  const platformPanelResult = await client.query(
    `
    INSERT INTO qsr_franchise_platform_panel
      (singleton, image_url, image_alt, list_label, closing_title, closing_subtext)
    VALUES (TRUE, $1, $2, $3, $4, $5)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [
      PLATFORM_PANEL.imageUrl,
      PLATFORM_PANEL.imageAlt,
      PLATFORM_PANEL.listLabel,
      PLATFORM_PANEL.closingTitle,
      PLATFORM_PANEL.closingSubtext,
    ],
  );
  const platformPanel = platformPanelResult.rowCount ?? 0;

  let platformWorkflows = 0;
  const existingWorkflows = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM qsr_franchise_platform_workflows',
  );
  if (Number(existingWorkflows.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO qsr_franchise_platform_workflows (label, icon, display_order, status)
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
    VALUES ('qsr-franchise', 'coverage', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [COVERAGE_COPY.eyebrow, COVERAGE_COPY.heading, COVERAGE_COPY.subtext],
  );
  const coverageCopy = coverageCopyResult.rowCount ?? 0;

  let coverageCategories = 0;
  const existingCategories = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM qsr_franchise_coverage_categories',
  );
  if (Number(existingCategories.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO qsr_franchise_coverage_categories
        (image_url, label, icon, display_order, status)
      SELECT u.image_url, u.label, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(image_url, label, icon, position)
      `,
      [
        COVERAGE_CATEGORIES.map((c) => c.imageUrl),
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
    VALUES ('qsr-franchise', 'faq', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [FAQ_COPY.eyebrow, FAQ_COPY.heading, FAQ_COPY.subtext],
  );
  const faqCopy = faqCopyResult.rowCount ?? 0;

  let faqEntries = 0;
  const existingFaqs = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM qsr_franchise_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO qsr_franchise_faq_entries (question, answer, display_order, status)
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
    VALUES ('qsr-franchise', 'cta', NULL, $1, $2)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [CTA_COPY.heading, CTA_COPY.subtext],
  );
  const ctaCopy = ctaCopyResult.rowCount ?? 0;

  const ctaSectionResult = await client.query(
    `
    INSERT INTO qsr_franchise_cta_section
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
    trustStats,
    trustPanel,
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
