// src/database/seeds/hreasy.seed.ts

import { PoolClient } from 'pg';

/**
 * The HREasy product page, exactly as it renders today: the five hero slides,
 * the proof bento, the seven lifecycle modules, the six FAQ questions and the
 * closing band with its trust strip.
 *
 * The copy that heads the lifecycle switcher, the FAQ and the band is seeded
 * alongside the other pages' in seed.ts, under ('hreasy', 'proof'),
 * ('hreasy', 'capabilities'), ('hreasy', 'faq') and ('hreasy', 'cta').
 *
 * The page is served at /products/hrms on the site, but every name here
 * follows the product id - which is what the module folder, the tables and
 * the page key already use.
 */

const CTA = { label: 'Talk to an HR Systems Specialist', href: '/demo' };
const SECONDARY = { label: 'Watch 2-Min Product Tour', href: '/resources' };
const MICRO_TRUST = '95% fewer HR errors at Luft Food, across 3 business verticals.';

interface SeedSlide {
  eyebrow: string;
  headline: string;
  subhead: string;
  imageUrl: string;
}

/**
 * Every slide ships the same two buttons and the same reassurance line, but
 * they are stored per slide because the schema keeps them there - which is
 * also what lets one of them differ later.
 */
const HERO_SLIDES: SeedSlide[] = [
  {
    eyebrow: 'Scaled Operations',
    headline: 'Scaled Operations, Complex Rules — All in one UpWon HRMS',
    subhead:
      'Piecework, daily-wage and salaried staff — every pay type in one payroll run that understands Indian labour law.',
    imageUrl: '/images/upwon_hrms.webp',
  },
  {
    eyebrow: 'Live, Real-time',
    headline: 'See Your Whole Workforce on One System — Live, Real-time',
    subhead:
      'Biometric attendance at the gate, leave requests from a phone — same system.',
    imageUrl: '/images/live_realtime.webp',
  },
  {
    eyebrow: 'Comprehensive HRMS',
    headline: 'Beyond Payroll & Compliance — Comprehensive HRMS',
    subhead:
      'Recruitment, onboarding, attendance, payroll, performance and exit — the whole lifecycle on one platform.',
    imageUrl: '/images/comprehensive_hrms.webp',
  },
  {
    eyebrow: 'One Platform',
    headline: 'ESS + Payroll + Compliance + EIS + PMS',
    subhead:
      "One login for HR, whether they're on the floor or in the office — plus a mobile ESS app in every employee's pocket.",
    imageUrl: '/images/eis_pms.webp',
  },
  {
    eyebrow: 'Multi-State, Hassle-free',
    headline: 'Managing Multi-State Operations & Compliances — Hassle-free',
    subhead:
      'PF, ESI, PT, TDS calculated automatically, for every shift, in every state.',
    imageUrl: '/images/hassle_free.webp',
  },
];

/**
 * The questions an HR or payroll buyer asks before switching systems -
 * migration- and compliance-focused, which is the editorial point of the list.
 */
const FAQ_ENTRIES = [
  {
    question: 'Can this handle our factory shifts and our office staff in one system?',
    answer:
      'Yes. HREasy runs multi-shift factory rostering with biometric and geo-fenced attendance for the plant, and standard 9-to-5 leave & attendance for office staff — on one platform, one login and one payroll. Field and franchise teams sit on the same system too.',
  },
  {
    question: 'How do you migrate our existing payroll history?',
    answer:
      'Through a structured migration: we audit your current data, migrate the employee master, salary structures and history, then run your new payroll in parallel with your existing system for a full cycle to reconcile every number. Nothing goes live until it matches.',
  },
  {
    question:
      'Is statutory compliance guaranteed to be accurate across every state we operate in?',
    answer:
      'PF, ESI, PT, TDS and LWF are calculated at current rates with state-specific rules built in, and returns are filing-ready every cycle. Multi-state operations are handled natively — no separate spreadsheets per state, no month-end scramble.',
  },
  {
    question: 'Does it work for contract and casual labour, not just permanent staff?',
    answer:
      'Yes. Permanent, contract, casual, piecework and daily-wage staff all run in the same payroll cycle, with Factories Act and contract-labour documentation and compliance tracked in one place.',
  },
  {
    question: 'Can we start with just Core and upgrade later?',
    answer:
      'Absolutely. Start with Core HR & payroll, then move up to Pro or Plus as you grow — your data and history carry forward with no re-implementation or re-entry. You only pay for the depth you need today.',
  },
  {
    question: "What happens if there's an error in a live payroll run?",
    answer:
      'The parallel-run step is designed to catch issues before anyone is paid, and every live run passes through controlled checks with expert supervision. If a correction is needed, there is a clear audit trail and controlled reprocessing — plus ongoing support from the team that builds the product.',
  },
];

/**
 * The lifecycle switcher's modules, in the order the list runs - recruitment
 * at the top through to offboarding at the bottom, which is the section's
 * whole editorial point.
 *
 * Each is the title in the left-hand list and the artwork drawn beside it.
 * The heading and the line inside the panel are part of that artwork, not
 * fields here.
 */
const CAPABILITY_MODULES = [
  {
    name: 'Recruitment & Onboarding',
    slug: 'recruitment-onboarding',
    imageUrl: '/images/recruitment.webp',
  },
  {
    name: 'Attendance & Leave',
    slug: 'attendance-leave',
    imageUrl: '/images/Attendance_leave.webp',
  },
  {
    name: 'Payroll & Statutory Compliance',
    slug: 'payroll-compliance',
    // Percent-encoded, as the site's own list has them: these filenames carry
    // a space, and the value goes straight into an <img src>.
    imageUrl: '/images/Payroll_Statutory%20Compliance.webp',
  },
  {
    name: 'Employee Self-Service',
    slug: 'employee-self-service',
    imageUrl: '/images/Employee%20Self-Service.webp',
  },
  {
    name: 'Training & Performance',
    slug: 'training-performance',
    imageUrl: '/images/Training_Performance.webp',
  },
  {
    name: 'Expense Management',
    slug: 'expense-management',
    imageUrl: '/images/Expense%20Management.webp',
  },
  {
    name: 'Offboarding',
    slug: 'offboarding',
    imageUrl: '/images/Offboarding.webp',
  },
];

/**
 * The capability card grid further down the page - four across, with the
 * final three centred.
 *
 * The same seven stages the switcher above lists, and a separate section: a
 * card is a photograph with a title and a one-line outcome, where a switcher
 * module is a nav label with one composite panel. Different artwork, too.
 */
const LIFECYCLE_CARDS = [
  {
    title: 'Recruitment & Onboarding',
    description: 'Structured hiring from job description to day one.',
    imageUrl: '/images/onboard_core_cap.webp',
  },
  {
    title: 'Attendance & Leave',
    description: 'Biometric, geo-fencing and multi-shift workflows built in.',
    imageUrl: '/images/attendance_core_cap.webp',
  },
  {
    title: 'Payroll & Statutory Compliance',
    description: 'PF, ESI, PT, TDS calculated and deducted automatically.',
    imageUrl: '/images/payroll_core_cap.webp',
  },
  {
    title: 'Employee Self-Service',
    description: 'Payslips, leave, documents, accessible from a phone.',
    // Percent-encoded, as the site's own list has it: this filename carries a
    // space, and the value goes straight into an <img src>.
    imageUrl: '/images/Employee%20Self-Service.webp',
  },
  {
    title: 'Training & Performance',
    description: 'KRA/KPI definition and review, skill-gap-linked training.',
    imageUrl: '/images/training_core_cap.webp',
  },
  {
    title: 'Expense Management',
    description: 'Claims, receipts and approvals in one workflow.',
    imageUrl: '/images/expense_core_cap.webp',
  },
  {
    title: 'Offboarding',
    description: 'Resignation to full-and-final settlement, structured and compliant.',
    imageUrl: '/images/offboard_core_cap.webp',
  },
];

/**
 * The tier row - HREasy's Core, Pro and Plus packages.
 *
 * Pro is the highlighted card: the orange border, the "Most Popular" badge
 * and the filled button. The other two differ from each other in their button
 * treatment, which is why the style is stored per card rather than derived
 * from the highlight.
 */
const PACKAGE_TIERS: Array<{
  name: string;
  slug: string;
  lead: string;
  tagline: string;
  scope: string;
  inheritsLabel: string | null;
  buttonLabel: string;
  buttonHref: string;
  buttonStyle: string;
  isPopular: boolean;
  features: string[];
}> = [
  {
    name: 'Core',
    slug: 'core',
    lead: 'Core HR & Payroll',
    tagline: 'Everything a growing team needs to run HR & payroll right.',
    scope: '1 company',
    // The entry tier has nothing beneath it to build on.
    inheritsLabel: null,
    buttonLabel: 'Get Started',
    buttonHref: '/demo',
    buttonStyle: 'OUTLINE_ACCENT',
    isPopular: false,
    features: [
      'HR & Staff access roles',
      '3 leave / salary structures',
      'Document management',
      'Attendance & OT workflow',
      'Leave approval, encashment & carry-forward',
      'Payroll & statutory compliance',
      'Employee self-service',
    ],
  },
  {
    name: 'Pro',
    slug: 'pro',
    lead: 'Multi-Company HR',
    tagline: 'Onboarding, biometric attendance and a mobile app.',
    scope: 'Up to 5 companies',
    inheritsLabel: 'Everything in Core, plus…',
    buttonLabel: 'Book a Demo',
    buttonHref: '/demo',
    buttonStyle: 'FILLED',
    isPopular: true,
    features: [
      'Multiple access roles',
      '10 leave / salary structures',
      'Employee onboarding',
      'Biometric / web / geo / selfie login',
      'Expense approval workflow',
      'Advanced auto-deduction',
      'Exit & offboarding automation',
      'Mobile app',
    ],
  },
  {
    name: 'Plus',
    slug: 'plus',
    lead: 'Full HR Lifecycle',
    tagline: 'Recruitment, training, performance and appraisals.',
    scope: 'Unlimited companies',
    inheritsLabel: 'Everything in Core & Pro, plus…',
    buttonLabel: 'Contact Sales',
    buttonHref: '/demo',
    buttonStyle: 'OUTLINE_NAVY',
    isPopular: false,
    features: [
      'Unlimited leave / salary structures',
      'JD & recruitment',
      'Skill-gap & training workflows',
      'KPA / KPI definition',
      'Appraisal management system',
      'Mobile app',
    ],
  },
];

/**
 * The comparison grid - two columns and the seven rows they differ on.
 *
 * Ticks and crosses rather than stars: the section's own subtext says "no
 * star ratings", and the first three rows are deliberately shared ground so
 * the last four land as an honest difference rather than a sales sheet.
 */
const ALTERNATIVES_COLUMNS: Array<{
  name: string;
  description: string | null;
  highlight: boolean;
}> = [
  { name: 'UpWon HREasy', description: null, highlight: true },
  // Named products rather than a logo, which keeps a competitor's mark off
  // the page while still saying who is meant.
  { name: 'Office-First HRMS', description: 'Keka, greytHR', highlight: false },
];

/** `flags` lines up with ALTERNATIVES_COLUMNS, left to right. */
const ALTERNATIVES_ROWS: Array<{ parameter: string; flags: boolean[] }> = [
  { parameter: 'Office payroll & statutory compliance', flags: [true, true] },
  { parameter: 'Employee self-service & mobile app', flags: [true, true] },
  { parameter: 'Leave, attendance & OT for desk staff', flags: [true, true] },
  { parameter: 'Multi-shift factory & plant attendance', flags: [true, false] },
  { parameter: 'Contract labour compliance (Factories Act)', flags: [true, false] },
  { parameter: 'Connected to your production / ERP data', flags: [true, false] },
  { parameter: 'One system for office, plant & franchise staff', flags: [true, false] },
];

/**
 * The outcome cards - two named, published customers.
 *
 * Luft Food carries no mark, so the card draws its name as words; Monginis
 * carries the wordmark the proof bento already uses. Both are working
 * designs, which is why the mark is optional on this card.
 */
const OUTCOME_STORIES: Array<{
  name: string;
  slug: string;
  logoUrl: string | null;
  tag: string;
  heroValue: string;
  heroLabel: string;
  body: string;
  linkLabel: string;
  linkHref: string;
  stats: Array<{ value: string; label: string }>;
}> = [
  {
    name: 'Luft Food',
    slug: 'luft-food',
    logoUrl: null,
    tag: 'Flagship Story',
    heroValue: '95%',
    heroLabel: 'fewer HR errors',
    body: 'Luft Food runs 250+ employees across three business verticals — office, plant and field — on one HREasy system. Manual HR errors fell sharply and month-end stopped being a compliance emergency.',
    linkLabel: 'Read story',
    linkHref: '/resources',
    stats: [
      { value: '250+', label: 'Employees' },
      { value: '3', label: 'Verticals' },
      { value: '40%', label: 'Less admin' },
    ],
  },
  {
    name: 'Monginis',
    slug: 'monginis',
    logoUrl: '/images/testimonial/mongignis.webp',
    tag: 'Franchise Scale',
    heroValue: '140',
    heroLabel: 'outlets on one HR system',
    body: 'Monginis (Galadhar Foods) manages 3 factories and 140 retail outlets on one HR system — a seven-year journey scaling HR across plants and franchise outlets without stitching separate tools together.',
    linkLabel: 'Read story',
    linkHref: '/resources',
    stats: [
      { value: '3', label: 'Factories' },
      { value: '7 yrs', label: 'Partnership' },
      { value: '1', label: 'Platform' },
    ],
  },
];

/**
 * The closing band. One banner, two buttons each carrying an icon, and the
 * four reassurances under them.
 */
const CTA_SECTION = {
  imageUrl: '/images/hrms_cta.webp',
  primaryLabel: 'Talk to an HR Systems Specialist',
  primaryHref: '/demo',
  primaryIcon: 'CalendarDays',
  secondaryLabel: 'See How This Fits Your Workforce',
  secondaryHref: '/demo',
  secondaryIcon: 'Users',
};

/** Each is an icon over two short lines, drawn one above the other. */
const CTA_TRUST_ITEMS = [
  { icon: 'Users', lineOne: 'Built for factories,', lineTwo: 'offices & field teams' },
  { icon: 'ShieldCheck', lineOne: 'Trusted by businesses', lineTwo: 'across industries' },
  { icon: 'Lock', lineOne: 'Your data is safe', lineTwo: 'and confidential' },
  { icon: 'Clock', lineOne: 'Real-world insights', lineTwo: 'in just 30 minutes' },
];

/**
 * The proof bento's cards.
 *
 * Keyed by a short name so the arrangement below can name them without
 * repeating their content - which is exactly what the two tables do.
 */
const PROOF_TILES: Record<string, Record<string, string | null>> = {
  monginisLogo: {
    kind: 'LOGO',
    name: 'Monginis',
    imageUrl: '/images/testimonial/mongignis.webp',
  },
  kakaLogo: {
    kind: 'LOGO',
    name: 'Kaka Halwai',
    imageUrl: '/images/testimonial/kaka%20halwai.webp',
  },
  u2Logo: { kind: 'LOGO', name: 'U2 Cake', imageUrl: '/images/testimonial/u2cake.webp' },
  gokulLogo: { kind: 'LOGO', name: 'Gokul', imageUrl: '/images/testimonial/gokul.webp' },
  ofcLogo: { kind: 'LOGO', name: 'OFC', imageUrl: '/images/testimonial/ofc.webp' },
  winniLogo: { kind: 'LOGO', name: 'Winni', imageUrl: '/images/testimonial/winni.webp' },

  stat95: { kind: 'STAT', value: '95%', label: 'fewer HR errors', client: 'Luft Food' },
  stat40: { kind: 'STAT', value: '40%', label: 'less admin time', client: 'Luft Food' },

  proofMonginis: {
    kind: 'PROOF',
    client: 'Monginis',
    headline: '3 factories, 140 outlets',
    line: 'Plants and retail outlets running on one HR system.',
  },
  proofLuft: {
    kind: 'PROOF',
    client: 'Luft Food',
    headline: '250+ employees, 3 verticals',
    line: 'Office, plant and field on a single platform \u2014 one source of truth, one payroll run.',
  },
};

/**
 * The arrangement: six columns of mixed width and shape, in the order the
 * marquee scrolls them.
 *
 * Width and shape are enums because the site draws them with Tailwind
 * classes, which have to exist in its source at build time.
 */
const PROOF_CELLS = [
  { width: 'WIDE', shape: 'WIDE_TOP', tiles: ['proofMonginis', 'kakaLogo', 'u2Logo'] },
  { width: 'MEDIUM', shape: 'TALL', tiles: ['proofLuft'] },
  { width: 'SMALL', shape: 'STACK', tiles: ['stat95', 'gokulLogo'] },
  { width: 'SMALL', shape: 'STACK', tiles: ['ofcLogo', 'stat40'] },
  { width: 'NARROW', shape: 'TALL', tiles: ['winniLogo'] },
  { width: 'NARROW', shape: 'TALL', tiles: ['monginisLogo'] },
];

export async function seedHreasyPage(client: PoolClient): Promise<{
  heroSlides: number;
  capabilityModules: number;
  lifecycleCards: number;
  packageTiers: number;
  packageFeatures: number;
  alternativesColumns: number;
  alternativesRows: number;
  alternativesCells: number;
  outcomeStories: number;
  outcomeStats: number;
  faqEntries: number;
  ctaSection: number;
  ctaTrustItems: number;
  proofTiles: number;
  proofCells: number;
}> {
  let heroSlides = 0;
  let capabilityModules = 0;
  let lifecycleCards = 0;
  let packageTiers = 0;
  let packageFeatures = 0;
  let alternativesColumns = 0;
  let alternativesRows = 0;
  let alternativesCells = 0;
  let outcomeStories = 0;
  let outcomeStats = 0;
  let faqEntries = 0;
  let ctaSection = 0;
  let ctaTrustItems = 0;
  let proofTiles = 0;
  let proofCells = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM hreasy_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO hreasy_hero_slides
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

  const existingModules = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM hreasy_capability_modules',
  );
  if (Number(existingModules.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO hreasy_capability_modules
        (name, slug, image_url, display_order, status)
      SELECT u.name, u.slug, u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(name, slug, image_url, position)
      `,
      [
        CAPABILITY_MODULES.map((m) => m.name),
        CAPABILITY_MODULES.map((m) => m.slug),
        CAPABILITY_MODULES.map((m) => m.imageUrl),
        CAPABILITY_MODULES.map((_, index) => index),
      ],
    );
    capabilityModules = result.rowCount ?? 0;
  }

  const existingCards = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM hreasy_lifecycle_cards',
  );
  if (Number(existingCards.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO hreasy_lifecycle_cards
        (title, description, image_url, display_order, status)
      SELECT u.title, u.description, u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(title, description, image_url, position)
      `,
      [
        LIFECYCLE_CARDS.map((c) => c.title),
        LIFECYCLE_CARDS.map((c) => c.description),
        LIFECYCLE_CARDS.map((c) => c.imageUrl),
        LIFECYCLE_CARDS.map((_, index) => index),
      ],
    );
    lifecycleCards = result.rowCount ?? 0;
  }

  const existingTiers = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM hreasy_package_tiers',
  );
  if (Number(existingTiers.rows[0].count) === 0) {
    const inserted = await client.query<{ id: string }>(
      `
      INSERT INTO hreasy_package_tiers
        (name, slug, lead, tagline, scope, inherits_label,
         button_label, button_href, button_style, is_popular,
         display_order, status)
      SELECT u.name, u.slug, u.lead, u.tagline, u.scope, u.inherits_label,
             u.button_label, u.button_href, u.button_style, u.is_popular,
             u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                    $6::text[], $7::text[], $8::text[], $9::text[], $10::bool[],
                    $11::int[])
          AS u(name, slug, lead, tagline, scope, inherits_label,
               button_label, button_href, button_style, is_popular, position)
      RETURNING id
      `,
      [
        PACKAGE_TIERS.map((t) => t.name),
        PACKAGE_TIERS.map((t) => t.slug),
        PACKAGE_TIERS.map((t) => t.lead),
        PACKAGE_TIERS.map((t) => t.tagline),
        PACKAGE_TIERS.map((t) => t.scope),
        PACKAGE_TIERS.map((t) => t.inheritsLabel),
        PACKAGE_TIERS.map((t) => t.buttonLabel),
        PACKAGE_TIERS.map((t) => t.buttonHref),
        PACKAGE_TIERS.map((t) => t.buttonStyle),
        PACKAGE_TIERS.map((t) => t.isPopular),
        PACKAGE_TIERS.map((_, index) => index),
      ],
    );
    packageTiers = inserted.rowCount ?? 0;

    /*
     * unnest preserves input order, so the returned ids line up with
     * PACKAGE_TIERS one for one - which is what lets each tick list find the
     * card it belongs to without a second lookup by slug.
     */
    const tierIds = inserted.rows.map((row) => row.id);
    const featureTierIds: string[] = [];
    const featureLabels: string[] = [];
    const featurePositions: number[] = [];
    PACKAGE_TIERS.forEach((tier, index) => {
      tier.features.forEach((label, position) => {
        featureTierIds.push(tierIds[index]);
        featureLabels.push(label);
        featurePositions.push(position);
      });
    });

    const features = await client.query(
      `
      INSERT INTO hreasy_package_features (tier_id, label, display_order, status)
      SELECT u.tier_id, u.label, u.position, 'ACTIVE'
        FROM unnest($1::uuid[], $2::text[], $3::int[]) AS u(tier_id, label, position)
      `,
      [featureTierIds, featureLabels, featurePositions],
    );
    packageFeatures = features.rowCount ?? 0;
  }

  const existingGrid = await client.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM comparison_sections
      WHERE page_key = 'hreasy' AND section_key = 'alternatives'`,
  );
  if (Number(existingGrid.rows[0].count) === 0) {
    const section = await client.query<{ id: string }>(
      `
      INSERT INTO comparison_sections
        (page_key, section_key, cell_type, leader_label, status)
      VALUES ('hreasy', 'alternatives', 'BOOLEAN', 'What your workforce needs', 'ACTIVE')
      RETURNING id
      `,
    );
    const sectionId = section.rows[0].id;

    const columnIds: string[] = [];
    for (const [index, column] of ALTERNATIVES_COLUMNS.entries()) {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO comparison_columns
          (section_id, name, description, column_type, highlight_column,
           display_order, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
        RETURNING id
        `,
        [
          sectionId,
          column.name,
          column.description,
          column.highlight ? 'OURS' : 'COMPETITOR',
          column.highlight,
          index,
        ],
      );
      columnIds.push(inserted.rows[0].id);
      alternativesColumns += inserted.rowCount ?? 0;
    }

    /*
     * One band, never surfaced: this design is a flat list of needs, but a
     * row has to belong to a category.
     */
    const category = await client.query<{ id: string }>(
      `
      INSERT INTO comparison_categories (section_id, name, display_order, status)
      VALUES ($1, 'What your workforce needs', 0, 'ACTIVE')
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
        INSERT INTO comparison_values (row_id, column_id, flag)
        SELECT $1, u.column_id, u.flag
          FROM unnest($2::uuid[], $3::boolean[]) AS u(column_id, flag)
        `,
        [inserted.rows[0].id, columnIds, row.flags],
      );
      alternativesCells += cells.rowCount ?? 0;
    }
  }

  const existingOutcomes = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM hreasy_outcome_stories',
  );
  if (Number(existingOutcomes.rows[0].count) === 0) {
    for (const [index, story] of OUTCOME_STORIES.entries()) {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO hreasy_outcome_stories
          (name, slug, logo_url, tag, hero_value, hero_label, body,
           link_label, link_href, display_order, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
        RETURNING id
        `,
        [
          story.name,
          story.slug,
          story.logoUrl,
          story.tag,
          story.heroValue,
          story.heroLabel,
          story.body,
          story.linkLabel,
          story.linkHref,
          index,
        ],
      );
      outcomeStories += inserted.rowCount ?? 0;

      const stats = await client.query(
        `
        INSERT INTO hreasy_outcome_stats (story_id, value, label, display_order, status)
        SELECT $1, u.value, u.label, u.position, 'ACTIVE'
          FROM unnest($2::text[], $3::text[], $4::int[]) AS u(value, label, position)
        `,
        [
          inserted.rows[0].id,
          story.stats.map((s) => s.value),
          story.stats.map((s) => s.label),
          story.stats.map((_, position) => position),
        ],
      );
      outcomeStats += stats.rowCount ?? 0;
    }
  }

  const existingFaqs = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM hreasy_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO hreasy_faq_entries (question, answer, display_order, status)
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
    'SELECT COUNT(*) AS count FROM hreasy_cta_section',
  );
  if (Number(existingCta.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO hreasy_cta_section
        (singleton, image_url, primary_label, primary_href, primary_icon,
         secondary_label, secondary_href, secondary_icon)
      VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7)
      `,
      [
        CTA_SECTION.imageUrl,
        CTA_SECTION.primaryLabel,
        CTA_SECTION.primaryHref,
        CTA_SECTION.primaryIcon,
        CTA_SECTION.secondaryLabel,
        CTA_SECTION.secondaryHref,
        CTA_SECTION.secondaryIcon,
      ],
    );
    ctaSection = result.rowCount ?? 0;
  }

  const existingTrust = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM hreasy_cta_trust_items',
  );
  if (Number(existingTrust.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO hreasy_cta_trust_items (icon, line_one, line_two, display_order, status)
      SELECT u.icon, u.line_one, u.line_two, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(icon, line_one, line_two, position)
      `,
      [
        CTA_TRUST_ITEMS.map((t) => t.icon),
        CTA_TRUST_ITEMS.map((t) => t.lineOne),
        CTA_TRUST_ITEMS.map((t) => t.lineTwo),
        CTA_TRUST_ITEMS.map((_, index) => index),
      ],
    );
    ctaTrustItems = result.rowCount ?? 0;
  }

  const existingTiles = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM hreasy_proof_tiles',
  );
  if (Number(existingTiles.rows[0].count) === 0) {
    const keys = Object.keys(PROOF_TILES);
    const inserted = await client.query<{ id: string; kind: string; name: string | null }>(
      `
      INSERT INTO hreasy_proof_tiles
        (kind, name, image_url, value, label, client, headline, line)
      SELECT u.kind, u.name, u.image_url, u.value, u.label, u.client, u.headline, u.line
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                    $6::text[], $7::text[], $8::text[])
          AS u(kind, name, image_url, value, label, client, headline, line)
      RETURNING id, kind, name
      `,
      [
        keys.map((k) => PROOF_TILES[k].kind ?? null),
        keys.map((k) => PROOF_TILES[k].name ?? null),
        keys.map((k) => PROOF_TILES[k].imageUrl ?? null),
        keys.map((k) => PROOF_TILES[k].value ?? null),
        keys.map((k) => PROOF_TILES[k].label ?? null),
        keys.map((k) => PROOF_TILES[k].client ?? null),
        keys.map((k) => PROOF_TILES[k].headline ?? null),
        keys.map((k) => PROOF_TILES[k].line ?? null),
      ],
    );
    proofTiles = inserted.rowCount ?? 0;

    /*
     * unnest preserves input order, so the returned rows line up with `keys`
     * one for one - which is what lets the arrangement below name a card by
     * its short key rather than repeating its content.
     */
    const tileIdByKey = new Map(keys.map((key, index) => [key, inserted.rows[index].id]));

    const cellResult = await client.query(
      `
      INSERT INTO hreasy_proof_cells
        (width, shape, tile_a_id, tile_b_id, tile_c_id, display_order, status)
      SELECT u.width, u.shape, u.a, u.b, u.c, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::uuid[], $4::uuid[], $5::uuid[], $6::int[])
          AS u(width, shape, a, b, c, position)
      `,
      [
        PROOF_CELLS.map((c) => c.width),
        PROOF_CELLS.map((c) => c.shape),
        PROOF_CELLS.map((c) => tileIdByKey.get(c.tiles[0]) as string),
        PROOF_CELLS.map((c) => tileIdByKey.get(c.tiles[1]) ?? null),
        PROOF_CELLS.map((c) => tileIdByKey.get(c.tiles[2]) ?? null),
        PROOF_CELLS.map((_, index) => index),
      ],
    );
    proofCells = cellResult.rowCount ?? 0;
  }

  return {
    heroSlides,
    capabilityModules,
    lifecycleCards,
    packageTiers,
    packageFeatures,
    alternativesColumns,
    alternativesRows,
    alternativesCells,
    outcomeStories,
    outcomeStats,
    faqEntries,
    ctaSection,
    ctaTrustItems,
    proofTiles,
    proofCells,
  };
}
