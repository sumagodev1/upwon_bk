// src/database/seeds/fms.seed.ts

import { PoolClient } from 'pg';

/**
 * The FMS product page, exactly as it renders today: the four hero slides, the
 * six FAQ questions and the closing band.
 *
 * The copy that heads the FAQ and the band is seeded alongside the other pages'
 * in seed.ts, under ('fms', 'faq') and ('fms', 'cta').
 */

const CTA = { label: 'Talk to a Franchise Specialist', href: '/demo' };
const SECONDARY = { label: 'Watch 2-Min Product Tour', href: '/resources' };
const MICRO_TRUST =
  'Monginis scaled from 35 to 200+ outlets on this system — same back-office team.';

interface SeedSlide {
  eyebrow: string;
  headline: string;
  subhead: string;
  imageUrl: string;
}

/**
 * Every slide ships the same two buttons and the same reassurance line, but
 * they are stored per slide because the schema keeps them there - which is also
 * what lets one of them differ later.
 */
const HERO_SLIDES: SeedSlide[] = [
  {
    eyebrow: 'Built to Scale',
    headline: 'Your Product Is Built to Scale — Now Build the System That Scales With It.',
    subhead:
      'The recipe works. Make the operating system work just as hard — across every outlet you open.',
    imageUrl: '/images/fms_hero1.webp',
  },
  {
    eyebrow: 'Consistency at Scale',
    headline: 'Your 200th Outlet Will Run as Smooth as Your 5th — With UPWON FMS.',
    subhead:
      'Same recipes, same standards, same numbers — whether it is outlet #5 or outlet #200.',
    imageUrl: '/images/fms_hero2.webp',
  },
  {
    eyebrow: 'Frictionless Expansion',
    headline: 'Open Outlets — Not Problems.',
    subhead:
      'Standardise onboarding, supply and reporting so every new outlet opens clean — not chaotic.',
    imageUrl: '/images/fms_hero3.webp',
  },
  {
    eyebrow: 'Cost Control',
    headline: 'Control — As If You Are Standing in Every Shop.',
    subhead: 'Royalty calculated automatically, from real production cost — not an Excel guess.',
    imageUrl: '/images/fms_hero4.webp',
  },
];

/**
 * The objections franchisors actually raise, which is why they are worded the
 * way they are rather than as generic FAQ boilerplate.
 */
const FAQ_ENTRIES = [
  {
    question: 'We already pay for a POS — why do we need this too?',
    answer:
      'A POS rings up sales at one counter. UpWon FMS is the franchise operating system around it — royalty and brand-fee capture, outlet-level P&L, replenishment from your central kitchen, SOP and brand-standard scoring, and network-wide visibility. The POS becomes one connected piece of that picture, not the whole thing. If your POS already works, we connect to it rather than rip it out.',
  },
  {
    question: 'Will our outlets face any billing disruption during rollout?',
    answer:
      'No. Rollout is phased outlet by outlet, and each outlet keeps billing on its current setup until its go-live is confirmed. We run the new flow in parallel, reconcile the numbers, then switch over — so there is no day where an outlet cannot take an order or raise a bill.',
  },
  {
    question:
      'Our franchisees have very different comfort levels with technology — will onboarding work for all of them?',
    answer:
      'Yes. Outlet and field staff get a guided, mostly tap-based app that works offline and syncs when there is network. We onboard region by region with hands-on training, in-app help and a hyper-care period after each launch — so a tech-shy franchisee and a tech-savvy one both reach the same place.',
  },
  {
    question: 'Is our royalty and franchisee financial data secure?',
    answer:
      'Royalty and franchisee financials sit behind role-based access, encrypted in transit and at rest, with a full audit trail of who viewed or changed what. Each franchisee sees only their own numbers; head office sees the network. Nobody sees data they are not entitled to.',
  },
  {
    question: 'Can we start with just POS and add royalty/compliance later?',
    answer:
      'Yes — that is the intended path. Many networks start with POS and outlet visibility, then switch on royalty, compliance scoring and central-kitchen replenishment when they are ready. Because everything shares one data model, adding a module later is a configuration step, not a re-implementation.',
  },
  {
    question: 'How fast can you adapt as our franchise model evolves?',
    answer:
      'Most changes are configuration, not custom code — new royalty structures, fee slabs, outlet formats (COCO / FOFO / COFO / FOCO), regions and SOP checklists are settings you adjust as you grow. When something genuinely new comes up, our team turns it around without a ground-up rebuild.',
  },
];

/*
 * The artwork paths are percent-encoded as the component wrote them - both
 * files have spaces in their names, and re-spelling them here would seed URLs
 * that 404.
 */
const CTA_SECTION = {
  desktopImageUrl: '/images/CTA%20FMS.webp',
  mobileImageUrl: '/images/cta%20mb%20fms.webp',
  primaryLabel: 'Talk to a Franchise Specialist',
  primaryHref: '/demo',
  secondaryLabel: 'See How This Fits Your Outlet Network',
  secondaryHref: '/contact',
  footnote: 'No obligation. 30 minutes about your franchise network, not a sales pitch.',
};

/*
 * The proof strip: the brand wall on the left, and the sourced numbers on the
 * right.
 *
 * The logo paths are percent-encoded exactly as the component wrote them - one
 * of the files has a space in its name, and re-spelling it here would seed a
 * URL that 404s.
 *
 * The tint behind each figure's icon is not stored: it is the accent colour at
 * ten percent alpha, computed on the site, so the two cannot drift apart.
 */
const PROOF_LOGOS = [
  { imageUrl: '/images/testimonial/mongignis.webp', alt: 'Monginis' },
  { imageUrl: '/images/testimonial/kaka%20halwai.webp', alt: 'Kaka Halwai' },
  { imageUrl: '/images/testimonial/u2cake.webp', alt: 'U2 Cake' },
  { imageUrl: '/images/testimonial/gokul.webp', alt: 'Gokul' },
  { imageUrl: '/images/testimonial/ofc.webp', alt: 'OFC' },
  { imageUrl: '/images/testimonial/winni.webp', alt: 'Winni' },
];

const PROOF_STATS = [
  {
    icon: 'Store',
    label: 'Outlets on one platform',
    subtext: 'Monginis',
    value: '200+',
    accentColor: '#1D6FE0',
  },
  {
    icon: 'Store',
    label: 'Outlets, real-time visibility',
    subtext: 'U2 Cake',
    value: '250+',
    accentColor: '#22A45D',
  },
  {
    icon: 'Factory',
    label: 'Plants connected',
    subtext: 'To the outlet network',
    value: '16',
    accentColor: '#7C5CFC',
  },
  {
    icon: 'ShoppingCart',
    label: 'Orders processed daily',
    subtext: 'Across live deployments',
    value: '1.5L+',
    accentColor: '#E85A2A',
  },
];


/**
 * The franchise category map.
 *
 * Every category shares the brand orange and the same pale ground today, so
 * both colours are left to the column defaults rather than repeated four
 * times; an editor changing one category's accent is what those columns exist
 * for. The "Explore ... Model" link points at /demo for all four - that target
 * was hard-coded in the component, and a per-category destination is now
 * possible without one.
 */
interface SeedCategory {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  iconUrl: string;
  imageUrl: string;
  exploreLabel: string;
  steps: Array<{ icon: string; title: string; description: string }>;
  benefits: Array<{ icon: string; title: string; description: string }>;
}

const EXPLORE_HREF = '/demo';

/*
 * The video the showcase plays today. The same file the SFA-DMS page uses -
 * it is the one clip the site ships - but stored on its own row, so re-cutting
 * one page's film leaves the other alone.
 */
const VIDEO_URL = '/video/video_test.mp4';

/*
 * The marks pinned to the integration sphere, in the order the component
 * lists them - its left half first, then its right.
 *
 * The centre mark is not seeded: with none stored the site falls back to the
 * UpWon logo it already ships, which is the right answer for a section that
 * renders correctly either way.
 */
const LOGO_BASE = '/images/platform_integration_client/';

/*
 * The three tier cards, and the reassurance line under them.
 *
 * PRO is the highlighted one - the badge sits on a single card, which the
 * table enforces with a partial unique index. CORE has no `inheritsLabel`:
 * there is no tier beneath it to build on.
 */
interface SeedTier {
  slug: string;
  name: string;
  lead: string;
  tagline: string;
  scope: string;
  inheritsLabel: string | null;
  buttonLabel: string;
  buttonHref: string;
  isPopular: boolean;
  features: string[];
}

/*
 * The comparison grid, exactly as the table reads today.
 *
 * Stored in the shared comparison tables under ('fms', 'alternatives') - the
 * third grid to use them, after the ERP and SFA-DMS pages. Prose cells rather
 * than scores: the section's own subtext says "No star ratings" in as many
 * words, which is what the section's TEXT cell type records.
 *
 * Every row carries one cell per column, in the same order as the columns
 * below, so the two arrays line up positionally.
 */
/*
 * The customer outcomes carousel, exactly as it reads today.
 *
 * Every visible thing belongs to a story, the background photograph included -
 * the picture changes with the card, so it is a field on the story rather than
 * one image for the section.
 *
 * The "Watch the case study" link pointed at /demo for both stories before this
 * became CMS-driven; it is stored per story now, so one can point at its own
 * write-up without moving the other.
 */
interface SeedStory {
  slug: string;
  name: string;
  logoUrl: string;
  photoUrl: string;
  quote: string;
  personName: string;
  personCompany: string;
  stats: Array<{ value: string; label: string }>;
}

const OUTCOME_LINK = { label: 'Watch the case study', href: '/demo' };

const OUTCOME_STORIES: SeedStory[] = [
  {
    slug: 'monginis',
    name: 'Monginis',
    logoUrl: '/images/testimonial/mongignis.webp',
    photoUrl: '/images/fms_hero1.webp',
    quote:
      'We scaled from 35 to 200+ outlets on this system \u2014 and the same back-office team still runs the whole network.',
    personName: 'Back-Office Operations',
    personCompany: 'Monginis',
    stats: [
      { value: '35\u2192200+', label: 'Outlets, same back-office team' },
      { value: '16', label: 'Plants connected to the network' },
      { value: '\u20b91.5 Cr+', label: 'Order value processed daily' },
    ],
  },
  {
    slug: 'u2cake',
    name: 'U2 Cake',
    logoUrl: '/images/testimonial/u2cake.webp',
    photoUrl: '/images/fms_hero2.webp',
    quote:
      'Every outlet reports into one place in real time \u2014 we see the whole chain and act on the same day.',
    personName: 'Operations Team',
    personCompany: 'U2 Cake',
    stats: [
      { value: '250+', label: 'Outlets, real-time visibility' },
      { value: '6,000+', label: 'Orders processed daily' },
      { value: '\u20b923L', label: 'Order value processed daily' },
    ],
  },
];

const ALTERNATIVES_COLUMNS = [
  { name: 'UpWon', highlight: true },
  { name: 'Petpooja / POSist', highlight: false },
  { name: 'WhatsApp + Tally', highlight: false },
];

const ALTERNATIVES_ROWS = [
  {
    parameter: 'Hub-spoke central kitchen',
    cells: [
      'Central kitchen demand consolidation built-in \u2014 production plan auto-generated',
      'Limited \u2014 kitchen module is bolt-on; consolidation manual',
      'No central kitchen module \u2014 WhatsApp orders, Excel planning',
    ],
  },
  {
    parameter: 'Outlet POS + back-office',
    cells: [
      'Same UI, same data \u2014 POS to royalty in one platform',
      'POS only \u2014 back-office is separate integration project',
      'No POS \u2014 third-party billing software needed',
    ],
  },
  {
    parameter: 'Royalty automation',
    cells: [
      'Auto-calculated from POS daily \u2014 franchisee statement on the 1st',
      'POS data must be exported and reconciled monthly',
      'Manual calculation; dispute-prone',
    ],
  },
  {
    parameter: 'Aggregator integration',
    cells: [
      'Swiggy, Zomato, ONDC native \u2014 orders + settlement auto-matched',
      'Aggregator orders need plug-ins per platform',
      'No integration \u2014 settlement reconciled manually',
    ],
  },
  {
    parameter: 'Multi-outlet visibility',
    cells: [
      'Live across 200+ outlets \u2014 sales, stock, KOT throughput',
      'Visible outlet-by-outlet; consolidation is a report job',
      'No consolidation \u2014 outlets call HQ for status',
    ],
  },
  {
    parameter: 'Right fit for',
    cells: [
      'Franchise chains 10\u2013500 outlets running CK or hub-spoke',
      'Single-outlet or small chains with simple menus',
      'Owner-operated single outlets with no expansion plans',
    ],
  },
];

const GROWTH_FOOTNOTE =
  'No setup fees \u00b7 Free data migration \u00b7 Dedicated onboarding \u00b7 Phased, outlet-by-outlet rollout';

const GROWTH_TIERS: SeedTier[] = [
  {
    slug: 'core',
    name: 'CORE',
    lead: 'Talk to us',
    tagline: 'Run outlet operations digitally',
    scope: 'Outlet billing \u2192 operations',
    inheritsLabel: null,
    buttonLabel: 'Get Started',
    buttonHref: '/demo',
    isPopular: false,
    features: [
      'Franchisee Onboarding',
      'Outlet POS Billing',
      'KOT System',
      'Central Order Processing',
      'Menu & recipe management',
      'Daily sales & outlet reports',
    ],
  },
  {
    slug: 'pro',
    name: 'PRO',
    lead: 'Talk to us',
    tagline: 'Automate royalty & see the network',
    scope: 'Royalty + network visibility',
    inheritsLabel: 'Everything in Core, plus:',
    buttonLabel: 'Book a Demo',
    buttonHref: '/demo',
    isPopular: true,
    features: [
      'Royalty Management',
      'Brand-fee & billing automation',
      'Hub-Spoke Dispatch',
      'Multi-outlet stock visibility',
      'Swiggy / Zomato order sync',
      'Franchise MIS',
    ],
  },
  {
    slug: 'plus',
    name: 'PLUS',
    lead: 'Talk to us',
    tagline: 'Govern, comply & scale with confidence',
    scope: 'Governance + ERP connect',
    inheritsLabel: 'Everything in Pro, plus:',
    buttonLabel: 'Contact Sales',
    buttonHref: '/contact',
    isPopular: false,
    features: [
      'SOP Audit & Compliance Scoring',
      'Grievance Management',
      'Outlet-level P&L & network dashboards',
      'Role-based access & full audit trail',
      'Multi-region rollout controls',
      'Full connection into central-kitchen production data via UpWon ERP',
    ],
  },
];

const INTEGRATION_LOGOS = [
  { file: 'PhonePe.webp', alt: 'PhonePe' },
  { file: 'Tally.webp', alt: 'Tally' },
  { file: 'SAP.webp', alt: 'SAP' },
  { file: 'Oracle.webp', alt: 'Oracle' },
  { file: 'Dynamics.webp', alt: 'Microsoft Dynamics 365' },
  { file: 'Tcsion.webp', alt: 'TCS iON' },
  { file: 'EPSON.webp', alt: 'EPSON' },
  { file: 'eSSL.webp', alt: 'eSSL' },
  { file: 'zomato.webp', alt: 'Zomato' },
  { file: 'swiggy.webp', alt: 'Swiggy' },
  { file: 'ondc.webp', alt: 'ONDC' },
  { file: 'unzo.webp', alt: 'Dunzo' },
  { file: 'paytm.webp', alt: 'Paytm' },
  { file: 'upi.webp', alt: 'UPI' },
  { file: 'Gpay.webp', alt: 'Google Pay' },
  { file: 'BharatPe.webp', alt: 'BharatPe' },
];

const FRANCHISE_CATEGORIES: SeedCategory[] = [
  {
    slug: 'bakery',
    name: 'Bakery & Confectionery',
    tagline: 'Central Kitchen',
    description:
      'Manage recipes, production and outlet demand from one place — reducing waste and maximizing freshness.',
    iconUrl: '/images/bakery%20icon.webp',
    imageUrl: '/images/bakery%20img.webp',
    exploreLabel: 'Explore Bakery Model',
    steps: [
      { icon: 'Factory', title: 'Central Kitchen', description: 'Plan production based on recipes and demand.' },
      { icon: 'Package', title: 'Batch Production', description: 'Standardized batches with quality control.' },
      { icon: 'Truck', title: 'Dispatch', description: 'Timely dispatch to maintain product quality.' },
      { icon: 'Store', title: 'Outlet', description: 'Outlets receive fresh stock as per demand.' },
      { icon: 'TrendingUp', title: 'Sales', description: 'Better availability drives higher sales and happiness.' },
    ],
    benefits: [
      { icon: 'ShieldCheck', title: 'Consistent Quality', description: 'Same taste and quality across all outlets.' },
      { icon: 'Trash2', title: 'Lower Wastage', description: 'Batch-wise tracking helps reduce losses.' },
      { icon: 'BarChart3', title: 'Higher Performance', description: 'Better control leads to more profitable operations.' },
    ],
  },
  {
    slug: 'sweets',
    name: 'Sweets & Namkeen',
    tagline: 'Multi-State',
    description:
      'Keep royalty structures and product consistency intact as you expand from legacy stores to new franchise partners across states.',
    iconUrl: '/images/sweet%20namkin%20icon.webp',
    imageUrl: '/images/sweet%20and%20namkin%20img.webp',
    exploreLabel: 'Explore Sweets Model',
    steps: [
      { icon: 'Factory', title: 'Central Production', description: 'One recipe-controlled source for every partner.' },
      { icon: 'Package', title: 'Festive Planning', description: 'Demand-aware batches for peak-season spikes.' },
      { icon: 'Truck', title: 'Multi-State Dispatch', description: 'Supply legacy and new stores on one plan.' },
      { icon: 'Store', title: 'Franchise Outlet', description: 'Consistent range at every franchise counter.' },
      { icon: 'TrendingUp', title: 'Royalty & Sales', description: 'Accurate royalty capture on every sale.' },
    ],
    benefits: [
      { icon: 'ShieldCheck', title: 'Brand Consistency', description: 'Same range and quality in every state.' },
      { icon: 'Package', title: 'Festive-Ready Supply', description: 'Plan ahead for demand surges with confidence.' },
      { icon: 'BarChart3', title: 'Royalty Accuracy', description: 'Transparent settlement across all partners.' },
    ],
  },
  {
    slug: 'icecream',
    name: 'Ice Cream & Desserts',
    tagline: 'Cold-Chain',
    description:
      'Cold-chain-linked replenishment from central production to parlour, with spoilage-risk visibility at every hop.',
    iconUrl: '/images/icon%20icecream.webp',
    imageUrl: '/images/ice%20cream%20img.webp',
    exploreLabel: 'Explore Ice Cream Model',
    steps: [
      { icon: 'Factory', title: 'Central Production', description: 'Produce and freeze to strict quality specs.' },
      { icon: 'Package', title: 'Cold Storage', description: 'Temperature-controlled stock, always monitored.' },
      { icon: 'Truck', title: 'Cold-Chain Dispatch', description: 'Replenish parlours without breaking the chain.' },
      { icon: 'Store', title: 'Parlour', description: 'Right SKUs, fresh, exactly when needed.' },
      { icon: 'TrendingUp', title: 'Profitability', description: 'Parlour-level margins tracked in real time.' },
    ],
    benefits: [
      { icon: 'ShieldCheck', title: 'Spoilage Control', description: 'Spoilage-risk flagged before it costs you.' },
      { icon: 'Truck', title: 'Cold-Chain Visibility', description: 'See every hop from plant to parlour.' },
      { icon: 'BarChart3', title: 'Parlour Profitability', description: 'Know which outlets truly make money.' },
    ],
  },
  {
    slug: 'qsr',
    name: 'QSR & Franchise F&B',
    tagline: 'High-Turnover',
    description:
      'Enforce SOPs across every outlet with KOT and POS integration and real-time central production visibility.',
    iconUrl: '/images/QSR%20icon.webp',
    imageUrl: '/images/QSR%20img.webp',
    exploreLabel: 'Explore QSR Model',
    steps: [
      { icon: 'Factory', title: 'Central Kitchen', description: 'Prep and portion to a single standard.' },
      { icon: 'Package', title: 'SOP & Prep', description: 'Enforced recipes and portions per outlet.' },
      { icon: 'Truck', title: 'Dispatch', description: 'Fast replenishment for high-turnover demand.' },
      { icon: 'Store', title: 'Outlet KOT / POS', description: 'Kitchen and billing connected end to end.' },
      { icon: 'TrendingUp', title: 'Sales', description: 'Faster service, higher throughput per outlet.' },
    ],
    benefits: [
      { icon: 'ShieldCheck', title: 'SOP Enforcement', description: 'Same experience across every franchise outlet.' },
      { icon: 'Package', title: 'KOT + POS Sync', description: 'No gaps between kitchen and counter.' },
      { icon: 'BarChart3', title: 'Central Visibility', description: 'Live view of production across the network.' },
    ],
  },
];

export async function seedFmsPage(client: PoolClient): Promise<{
  heroSlides: number;
  faqEntries: number;
  ctaSection: number;
  proofLogos: number;
  proofStats: number;
  franchiseCategories: number;
  franchiseSteps: number;
  franchiseBenefits: number;
  videoEntries: number;
  integrationLogos: number;
  growthSection: number;
  growthTiers: number;
  growthFeatures: number;
  alternativesColumns: number;
  alternativesRows: number;
  alternativesCells: number;
  outcomeStories: number;
  outcomeStats: number;
}> {
  let heroSlides = 0;
  let faqEntries = 0;
  let ctaSection = 0;
  let proofLogos = 0;
  let proofStats = 0;
  let franchiseCategories = 0;
  let franchiseSteps = 0;
  let franchiseBenefits = 0;
  let videoEntries = 0;
  let integrationLogos = 0;
  let growthSection = 0;
  let growthTiers = 0;
  let growthFeatures = 0;
  let alternativesColumns = 0;
  let alternativesRows = 0;
  let alternativesCells = 0;
  let outcomeStories = 0;
  let outcomeStats = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO fms_hero_slides
        (eyebrow, headline, subhead, micro_trust,
         cta_label, cta_href, secondary_label, secondary_href,
         image_url, display_order, status)
      SELECT u.eyebrow, u.headline, u.subhead, $5, $6, $7, $8, $9,
             u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $10::int[])
          AS u(eyebrow, headline, subhead, image_url, position)
      `,
      [
        HERO_SLIDES.map((s) => s.eyebrow),
        HERO_SLIDES.map((s) => s.headline),
        HERO_SLIDES.map((s) => s.subhead),
        HERO_SLIDES.map((s) => s.imageUrl),
        MICRO_TRUST,
        CTA.label,
        CTA.href,
        SECONDARY.label,
        SECONDARY.href,
        HERO_SLIDES.map((_, index) => index),
      ],
    );
    heroSlides = result.rowCount ?? 0;
  }

  const existingFaqs = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO fms_faq_entries (question, answer, display_order, status)
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

  const existingCta = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_cta_section',
  );
  if (Number(existingCta.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO fms_cta_section
        (singleton, desktop_image_url, mobile_image_url,
         primary_label, primary_href, secondary_label, secondary_href, footnote)
      VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7)
      `,
      [
        CTA_SECTION.desktopImageUrl,
        CTA_SECTION.mobileImageUrl,
        CTA_SECTION.primaryLabel,
        CTA_SECTION.primaryHref,
        CTA_SECTION.secondaryLabel,
        CTA_SECTION.secondaryHref,
        CTA_SECTION.footnote,
      ],
    );
    ctaSection = result.rowCount ?? 0;
  }

  const existingLogos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_proof_logos',
  );
  if (Number(existingLogos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO fms_proof_logos (image_url, alt, display_order, status)
      SELECT u.image_url, u.alt, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(image_url, alt, position)
      `,
      [
        PROOF_LOGOS.map((l) => l.imageUrl),
        PROOF_LOGOS.map((l) => l.alt),
        PROOF_LOGOS.map((_, index) => index),
      ],
    );
    proofLogos = result.rowCount ?? 0;
  }

  const existingStats = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_proof_stats',
  );
  if (Number(existingStats.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO fms_proof_stats
        (icon, label, subtext, value, accent_color, display_order, status)
      SELECT u.icon, u.label, u.subtext, u.value, u.accent_color, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::int[])
          AS u(icon, label, subtext, value, accent_color, position)
      `,
      [
        PROOF_STATS.map((s) => s.icon),
        PROOF_STATS.map((s) => s.label),
        PROOF_STATS.map((s) => s.subtext),
        PROOF_STATS.map((s) => s.value),
        PROOF_STATS.map((s) => s.accentColor),
        PROOF_STATS.map((_, index) => index),
      ],
    );
    proofStats = result.rowCount ?? 0;
  }


  const existingCategories = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_franchise_categories',
  );
  if (Number(existingCategories.rows[0].count) === 0) {
    /*
     * The categories go in as one statement so their ids come back with
     * the rows, which is what the child inserts key on. The steps and the
     * benefits then go in one statement each rather than one per category -
     * eight round trips become two.
     */
    const inserted = await client.query<{ id: string; slug: string }>(
      `
      INSERT INTO fms_franchise_categories
        (name, slug, tagline, description, icon_url, image_url,
         explore_label, explore_href, display_order, status)
      SELECT u.name, u.slug, u.tagline, u.description, u.icon_url, u.image_url,
             u.explore_label, $9, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[],
                    $5::text[], $6::text[], $7::text[], $8::int[])
          AS u(name, slug, tagline, description, icon_url, image_url,
               explore_label, position)
      RETURNING id, slug
      `,
      [
        FRANCHISE_CATEGORIES.map((c) => c.name),
        FRANCHISE_CATEGORIES.map((c) => c.slug),
        FRANCHISE_CATEGORIES.map((c) => c.tagline),
        FRANCHISE_CATEGORIES.map((c) => c.description),
        FRANCHISE_CATEGORIES.map((c) => c.iconUrl),
        FRANCHISE_CATEGORIES.map((c) => c.imageUrl),
        FRANCHISE_CATEGORIES.map((c) => c.exploreLabel),
        FRANCHISE_CATEGORIES.map((_, index) => index),
        EXPLORE_HREF,
      ],
    );
    franchiseCategories = inserted.rowCount ?? 0;

    // Keyed by slug rather than by position: RETURNING makes no order promise.
    const idBySlug = new Map(inserted.rows.map((row) => [row.slug, row.id]));

    const flatten = (pick: 'steps' | 'benefits') =>
      FRANCHISE_CATEGORIES.flatMap((category) =>
        category[pick].map((entry, index) => ({
          categoryId: idBySlug.get(category.slug) as string,
          position: index,
          ...entry,
        })),
      );

    for (const [table, pick] of [
      ['fms_franchise_steps', 'steps'],
      ['fms_franchise_benefits', 'benefits'],
    ] as const) {
      const rows = flatten(pick);
      const result = await client.query(
        `
        INSERT INTO ${table} (category_id, title, description, icon, display_order, status)
        SELECT u.category_id, u.title, u.description, u.icon, u.position, 'ACTIVE'
          FROM unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::int[])
            AS u(category_id, title, description, icon, position)
        `,
        [
          rows.map((r) => r.categoryId),
          rows.map((r) => r.title),
          rows.map((r) => r.description),
          rows.map((r) => r.icon),
          rows.map((r) => r.position),
        ],
      );
      if (pick === 'steps') franchiseSteps = result.rowCount ?? 0;
      else franchiseBenefits = result.rowCount ?? 0;
    }
  }


  const existingVideos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_video_entries',
  );
  if (Number(existingVideos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO fms_video_entries (video_url, display_order, status)
      VALUES ($1, 0, 'ACTIVE')
      `,
      [VIDEO_URL],
    );
    videoEntries = result.rowCount ?? 0;
  }


  const existingIntegrationLogos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_integration_logos',
  );
  if (Number(existingIntegrationLogos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO fms_integration_logos (logo_url, logo_alt, display_order, status)
      SELECT u.logo_url, u.logo_alt, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[])
          AS u(logo_url, logo_alt, position)
      `,
      [
        INTEGRATION_LOGOS.map((l) => `${LOGO_BASE}${l.file}`),
        INTEGRATION_LOGOS.map((l) => l.alt),
        INTEGRATION_LOGOS.map((_, index) => index),
      ],
    );
    integrationLogos = result.rowCount ?? 0;
  }


  const existingGrowthSection = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_growth_section',
  );
  if (Number(existingGrowthSection.rows[0].count) === 0) {
    const result = await client.query(
      'INSERT INTO fms_growth_section (singleton, footnote) VALUES (TRUE, $1)',
      [GROWTH_FOOTNOTE],
    );
    growthSection = result.rowCount ?? 0;
  }

  const existingTiers = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_growth_tiers',
  );
  if (Number(existingTiers.rows[0].count) === 0) {
    /*
     * The tiers go in as one statement so their ids come back with the
     * rows, which is what the tick insert keys on - three round trips
     * become two.
     */
    const inserted = await client.query<{ id: string; slug: string }>(
      `
      INSERT INTO fms_growth_tiers
        (name, slug, lead, tagline, scope, inherits_label,
         button_label, button_href, is_popular, display_order, status)
      SELECT u.name, u.slug, u.lead, u.tagline, u.scope, u.inherits_label,
             u.button_label, u.button_href, u.is_popular, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                    $6::text[], $7::text[], $8::text[], $9::boolean[], $10::int[])
          AS u(name, slug, lead, tagline, scope, inherits_label,
               button_label, button_href, is_popular, position)
      RETURNING id, slug
      `,
      [
        GROWTH_TIERS.map((t) => t.name),
        GROWTH_TIERS.map((t) => t.slug),
        GROWTH_TIERS.map((t) => t.lead),
        GROWTH_TIERS.map((t) => t.tagline),
        GROWTH_TIERS.map((t) => t.scope),
        GROWTH_TIERS.map((t) => t.inheritsLabel),
        GROWTH_TIERS.map((t) => t.buttonLabel),
        GROWTH_TIERS.map((t) => t.buttonHref),
        GROWTH_TIERS.map((t) => t.isPopular),
        GROWTH_TIERS.map((_, index) => index),
      ],
    );
    growthTiers = inserted.rowCount ?? 0;

    // Keyed by slug rather than by position: RETURNING makes no order promise.
    const tierIdBySlug = new Map(inserted.rows.map((row) => [row.slug, row.id]));
    const featureRows = GROWTH_TIERS.flatMap((tier) =>
      tier.features.map((label, index) => ({
        tierId: tierIdBySlug.get(tier.slug) as string,
        label,
        position: index,
      })),
    );

    const featureResult = await client.query(
      `
      INSERT INTO fms_growth_features (tier_id, label, display_order, status)
      SELECT u.tier_id, u.label, u.position, 'ACTIVE'
        FROM unnest($1::uuid[], $2::text[], $3::int[]) AS u(tier_id, label, position)
      `,
      [
        featureRows.map((r) => r.tierId),
        featureRows.map((r) => r.label),
        featureRows.map((r) => r.position),
      ],
    );
    growthFeatures = featureResult.rowCount ?? 0;
  }


  const existingGrid = await client.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM comparison_sections
      WHERE page_key = 'fms' AND section_key = 'alternatives'`,
  );
  if (Number(existingGrid.rows[0].count) === 0) {
    const section = await client.query<{ id: string }>(
      `
      INSERT INTO comparison_sections
        (page_key, section_key, cell_type, leader_label, status)
      VALUES ('fms', 'alternatives', 'TEXT', 'Criteria', 'ACTIVE')
      RETURNING id
      `,
    );
    const sectionId = section.rows[0].id;

    const columnIds: string[] = [];
    for (const [index, column] of ALTERNATIVES_COLUMNS.entries()) {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO comparison_columns
          (section_id, name, column_type, highlight_column, display_order, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        RETURNING id
        `,
        [
          sectionId,
          column.name,
          column.highlight ? 'OURS' : 'COMPETITOR',
          column.highlight,
          index,
        ],
      );
      columnIds.push(inserted.rows[0].id);
      alternativesColumns += inserted.rowCount ?? 0;
    }

    /*
     * One band, never surfaced: this design is a flat list of criteria, but
     * a row has to belong to a category.
     */
    const category = await client.query<{ id: string }>(
      `
      INSERT INTO comparison_categories (section_id, name, display_order, status)
      VALUES ($1, 'Criteria', 0, 'ACTIVE')
      RETURNING id
      `,
      [sectionId],
    );
    const categoryId = category.rows[0].id;

    for (const [index, row] of ALTERNATIVES_ROWS.entries()) {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO comparison_rows
          (category_id, parameter, row_type, display_order, status)
        VALUES ($1, $2, 'STANDARD', $3, 'ACTIVE')
        RETURNING id
        `,
        [categoryId, row.parameter, index],
      );
      alternativesRows += inserted.rowCount ?? 0;

      const cells = await client.query(
        `
        INSERT INTO comparison_values (row_id, column_id, content)
        SELECT $1, u.column_id, u.content
          FROM unnest($2::uuid[], $3::text[]) AS u(column_id, content)
        `,
        [inserted.rows[0].id, columnIds, row.cells],
      );
      alternativesCells += cells.rowCount ?? 0;
    }
  }


  const existingStories = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_outcome_stories',
  );
  if (Number(existingStories.rows[0].count) === 0) {
    /*
     * The stories go in as one statement so their ids come back with the
     * rows, which is what the figure insert keys on - three round trips
     * become two.
     */
    const inserted = await client.query<{ id: string; slug: string }>(
      `
      INSERT INTO fms_outcome_stories
        (name, slug, logo_url, photo_url, quote, person_name, person_company,
         link_label, link_href, display_order, status)
      SELECT u.name, u.slug, u.logo_url, u.photo_url, u.quote,
             u.person_name, u.person_company, $8, $9, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                    $6::text[], $7::text[], $10::int[])
          AS u(name, slug, logo_url, photo_url, quote, person_name,
               person_company, position)
      RETURNING id, slug
      `,
      [
        OUTCOME_STORIES.map((s) => s.name),
        OUTCOME_STORIES.map((s) => s.slug),
        OUTCOME_STORIES.map((s) => s.logoUrl),
        OUTCOME_STORIES.map((s) => s.photoUrl),
        OUTCOME_STORIES.map((s) => s.quote),
        OUTCOME_STORIES.map((s) => s.personName),
        OUTCOME_STORIES.map((s) => s.personCompany),
        OUTCOME_LINK.label,
        OUTCOME_LINK.href,
        OUTCOME_STORIES.map((_, index) => index),
      ],
    );
    outcomeStories = inserted.rowCount ?? 0;

    // Keyed by slug rather than by position: RETURNING makes no order promise.
    const storyIdBySlug = new Map(inserted.rows.map((row) => [row.slug, row.id]));
    const statRows = OUTCOME_STORIES.flatMap((story) =>
      story.stats.map((stat, index) => ({
        storyId: storyIdBySlug.get(story.slug) as string,
        value: stat.value,
        label: stat.label,
        position: index,
      })),
    );

    const statResult = await client.query(
      `
      INSERT INTO fms_outcome_stats (story_id, value, label, display_order, status)
      SELECT u.story_id, u.value, u.label, u.position, 'ACTIVE'
        FROM unnest($1::uuid[], $2::text[], $3::text[], $4::int[])
          AS u(story_id, value, label, position)
      `,
      [
        statRows.map((r) => r.storyId),
        statRows.map((r) => r.value),
        statRows.map((r) => r.label),
        statRows.map((r) => r.position),
      ],
    );
    outcomeStats = statResult.rowCount ?? 0;
  }

  return {
    heroSlides,
    faqEntries,
    ctaSection,
    proofLogos,
    proofStats,
    franchiseCategories,
    franchiseSteps,
    franchiseBenefits,
    videoEntries,
    integrationLogos,
    growthSection,
    growthTiers,
    growthFeatures,
    alternativesColumns,
    alternativesRows,
    alternativesCells,
    outcomeStories,
    outcomeStats,
  };
}
