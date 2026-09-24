// src/database/seeds/sfa-dms.seed.ts

import { PoolClient } from 'pg';

/**
 * The SFA-DMS product page, exactly as it renders today: the six hero slides,
 * the six FAQ questions and the closing band.
 *
 * The copy that heads the FAQ and the band is seeded alongside the other pages'
 * in seed.ts, under ('sfa-dms', 'faq') and ('sfa-dms', 'cta').
 */

const CTA = { label: 'Talk to an Industry Specialist', href: '/demo' };
const SECONDARY = { label: 'Watch 2-Min Product Tour', href: '/resources' };
const MICRO_TRUST = 'SFA-DMS trusted by FMCG brands and distributors across India.';

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
    eyebrow: 'AI-Powered SFA-DMS Suite',
    headline:
      'UPWON SFA–DMS Suite (AI-Powered) — Take Your Business Into Every Pincode of the Region.',
    subhead:
      'Field-force automation and distributor management on one AI-driven platform — expand reach into every town without losing control.',
    imageUrl: '/images/sfa_dms_hero1.webp',
  },
  {
    eyebrow: 'Real-Time Orders',
    headline: "See Every Order the Moment It's Booked — Not the Next Morning.",
    subhead:
      "Every rep's order flows to your dashboard live, so you plan dispatch and stock on today's demand — not yesterday's.",
    imageUrl: '/images/sfa_dms_hero2.webp',
  },
  {
    eyebrow: 'True Sell-Out Visibility',
    headline: 'Know Which Distributor Is Actually Selling — Not Just Stocking.',
    subhead:
      'Track secondary sales at the outlet and see real off-take, instead of primary billing that only hides dead stock.',
    imageUrl: '/images/sfa_dms_hero3.webp',
  },
  {
    eyebrow: 'Scheme Control',
    headline: 'Stop Scheme Leakage — Before It Eats Your Margin.',
    subhead:
      'Schemes that calculate and claim themselves — no inflated claims, no disputes, no silent margin bleed.',
    imageUrl: '/images/sfa_dms_hero4.webp',
  },
  {
    eyebrow: 'Beat Discipline',
    headline: 'One Beat Plan, Every Rep, Every Day — No Blind Spots.',
    subhead:
      'PJP compliance tracked live, so no outlet is skipped and every route runs exactly to plan.',
    imageUrl: '/images/sfa_dms_hero5.webp',
  },
  {
    eyebrow: 'Field to Dashboard, Live',
    headline: 'From the Field to Your Dashboard, in Real Time — Not Real Late.',
    subhead:
      "Sales, stock and collections update as they happen, so you act on today's ground reality — not week-old reports.",
    imageUrl: '/images/sfa_dms_hero6.webp',
  },
];

const FAQ_ENTRIES: Array<{ question: string; answer: string }> = [
  {
    question: 'What exactly is UpWon SFA-DMS, and who is it built for?',
    answer:
      'UpWon SFA-DMS is a sales-force-automation and distributor-management platform for Indian food & FMCG brands and distributors — beat planning, order booking, secondary-sales capture, schemes and claims, and distributor stock/credit visibility on one system. It is built for brands and distributors running roughly 50–800 field reps, not single-distributor setups or heavy global MNC rollouts.',
  },
  {
    question: 'Can we roll it out to our field team before our full distributor network?',
    answer:
      'Yes. SFA (your field team) and DMS (distributor operations) can be adopted in sequence — region by region or beat by beat. Start by empowering your field reps, then extend to distributors when you are ready. It is not a forced, simultaneous rollout across every distributor on day one.',
  },
  {
    question: 'Does it work offline in low-connectivity markets?',
    answer:
      'Yes. The field app captures orders, visits and collections offline and syncs automatically once the rep is back on network — so beats in low-connectivity rural and semi-urban markets are never blocked by signal.',
  },
  {
    question: 'Is it GST-compliant for distributor billing?',
    answer:
      'Yes. Distributor billing, invoicing and e-invoicing are built to India’s GST requirements natively, so secondary billing stays compliant without bolt-on tools.',
  },
  {
    question: 'Can it integrate with our existing ERP if we’re not moving to UpWon ERP?',
    answer:
      'Yes. UpWon SFA-DMS connects to your existing ERP through standard integrations, so you get field and distributor visibility even before — or without — moving to UpWon ERP. The deepest value comes when SFA, DMS and ERP share one data model, but that is a choice, not a prerequisite.',
  },
  {
    question: 'What support do we get after go-live?',
    answer:
      'You stay connected to the team that actually builds the product — direct implementation and support access, not layers of SI partners and tickets. Support continues as an ongoing partnership after launch, including field-team refreshers as your network grows.',
  },
];

const CTA_SECTION = {
  backgroundImageUrl: '/images/sfa_dms_cta.webp',
  dashboardImageUrl: '/images/sfa_dms_dashboard.webp',
  dashboardAlt: 'UpWon SFA-DMS distribution dashboard',
  buttonLabel: 'Talk to a Distribution Specialist',
  buttonHref: '/demo',
};

/*
 * The proof section: the card on the left, the customer logos inside it, and
 * the two-by-two grid of numbers on the right.
 *
 * The logo paths are percent-encoded exactly as the component wrote them -
 * one of the files has a space in its name, and re-spelling it here would
 * seed a URL that 404s.
 */
const PROOF_PANEL = {
  heading: 'Already live in the field.',
  bodyText:
    'Not a pilot and not a promise — real food & FMCG brands run their daily beats, order booking and distribution on UpWon SFA-DMS across India, every single day.',
  linkLabel: 'See our clients',
  linkHref: '/clients',
  logosLabel: 'Trusted by',
};

const PROOF_LOGOS = [
  { imageUrl: '/images/testimonial/gokul.webp', alt: 'Gokul' },
  { imageUrl: '/images/testimonial/kaka%20halwai.webp', alt: 'Kaka Halwai' },
  { imageUrl: '/images/testimonial/mongignis.webp', alt: 'Monginis' },
  { imageUrl: '/images/testimonial/ofc.webp', alt: 'OFC' },
  { imageUrl: '/images/testimonial/u2cake.webp', alt: 'U2 Cake' },
  { imageUrl: '/images/testimonial/winni.webp', alt: 'Winni' },
];

const PROOF_STATS = [
  { value: '5,000+', label: 'Distribution users' },
  { value: '40%', label: 'Faster order processing' },
  { value: '40%', label: 'Higher distributor fill rates (GT & MT)' },
  { value: '50+', label: 'Brands live' },
];

/*
 * The product video the section plays today.
 *
 * A URL rather than an upload: the file is already served from the site, and
 * seeding it as an upload would mean copying ten megabytes into the database
 * to point at the same bytes the browser already has cached.
 */
const VIDEO_URL = '/video/video_test.mp4';

/*
 * The adoption path, exactly as the three cards read today.
 *
 * 'FieldRep' is the composite icon the SFA card draws - a person with a map
 * pin - which lucide has no single export for, so the site assembles it. It is
 * an allowlisted name like any other from an editor's side.
 *
 * The tint behind each icon is not stored: it is the accent colour at ten
 * percent alpha, computed on the site, so the two cannot drift apart.
 */
const PACKAGE_CARDS = [
  {
    icon: 'FieldRep',
    stageLabel: 'Stage 1',
    title: 'SFA',
    subtitle: 'For Your Field Team',
    description: 'Empower your field team to sell smarter and cover more.',
    accentColor: '#22A45D',
    featuresLabel: 'Key features',
    features: [
      'Beat & PJP route planning',
      'Order booking & call reporting',
      'Real-time secondary sales capture',
      'Van sales & pre-sales',
      'Cash collection tracking',
      'Attendance & GPS-tagged visits',
      'Target vs achievement MIS',
      'Works offline, syncs on network',
    ],
  },
  {
    icon: 'Warehouse',
    stageLabel: 'Stage 2',
    title: 'DMS',
    subtitle: 'For Distributor Control',
    description:
      'Bring distributor operations into view and manage with confidence.',
    accentColor: '#0F9E96',
    featuresLabel: 'Everything in SFA, plus',
    features: [
      'Distributor stock & inventory visibility',
      'Distributor billing & GST e-invoicing',
      'Scheme & claim automation',
      'Credit & outstanding tracking',
      'Secondary-sales settlement',
      'Primary order management',
      'Distributor performance dashboards',
    ],
  },
  {
    icon: 'Share2',
    stageLabel: 'Complete',
    title: 'SFA + DMS Suite',
    subtitle: 'The Complete Connected Solution',
    description:
      'One connected system from field to distributor — and into your ERP.',
    accentColor: '#7C5CFC',
    featuresLabel: 'Everything in DMS, plus',
    features: [
      'Shared data model with UpWon ERP',
      'Production → inventory → distribution visibility',
      'Modern Trade module & planogram compliance',
      'Advanced analytics & AI insights',
      'Multi-region, multi-beat rollout',
      'Priority implementation & support',
    ],
  },
];

/** Every card ships the same button, but it is stored per card so one can differ. */
const PACKAGE_BUTTON = { label: 'Talk to a specialist', href: '/demo' };

/*
 * The trust establishers, exactly as the two panels read today.
 *
 * The artwork path is percent-encoded as the component wrote it - the file has
 * spaces in its name, and re-spelling it here would seed a URL that 404s.
 *
 * The right panel's icon tint is not stored: it is ecosystemColor at ten
 * percent alpha, computed on the site, so the two cannot drift apart.
 */
const COMPLIANCE_PANELS = {
  complianceLabel: 'Built-in Compliance',
  complianceIcon: 'ShieldCheck',
  backgroundImageUrl: '/images/built%20card%20image.webp',
  ecosystemLabel: 'Connected Ecosystem',
  ecosystemIcon: 'Link2',
  ecosystemColor: '#1D6FE0',
};

const COMPLIANCE_BADGES = [
  { icon: 'ShieldCheck', title: 'FSSAI-native', subtext: 'End-to-end compliance you trust' },
  { icon: 'FileText', title: 'GST & e-invoice ready', subtext: 'Native, not a plug-in' },
  { icon: 'Award', title: 'ISO-aligned', subtext: 'Working toward ISO 27001' },
  { icon: 'UserRound', title: 'CMMI Level 3', subtext: 'Structured for process rigour' },
];

/*
 * The comparison grid, exactly as the table reads today.
 *
 * Stored in the shared comparison tables under ('sfa-dms', 'alternatives') -
 * the same five records the ERP page's grid uses, with RATING cells instead of
 * prose. The one category exists because a row must belong to one; the design
 * has no bands, and no screen surfaces it.
 *
 * PUBLICATION FLAG carried over from the component: the competitor names and
 * the scores are a positioning proposal, and the point of moving them here is
 * that sign-off can now change them without a deploy.
 */
const ALTERNATIVES_COLUMNS = [
  { name: 'UpWon', highlight: true },
  { name: 'Bizom', highlight: false },
  { name: 'FieldAssist', highlight: false },
  { name: 'Ivy Mobility', highlight: false },
];

/** Scores in column order, so a row reads the way the table does. */
const ALTERNATIVES_ROWS = [
  { parameter: 'Shares one data model with your ERP', scores: [5, 1, 1, 2] },
  { parameter: 'Food & FMCG batch, expiry & FEFO built in', scores: [5, 2, 2, 1] },
  { parameter: 'GT + MT distribution (India model)', scores: [5, 4, 4, 3] },
  { parameter: 'Secondary sales — no exports, no reconciliation', scores: [5, 3, 3, 2] },
  { parameter: 'Distributor claims & scheme settlement', scores: [5, 3, 3, 3] },
  { parameter: 'Mobile-first field app (works offline)', scores: [5, 4, 4, 4] },
  { parameter: 'Route / beat planning & optimization', scores: [5, 4, 3, 3] },
  { parameter: 'Retailer e-ordering app', scores: [5, 3, 3, 2] },
  { parameter: 'Van sales / direct store delivery', scores: [4, 3, 2, 2] },
  { parameter: 'AI / demand forecasting', scores: [4, 2, 2, 1] },
  { parameter: 'One connected system, field to finance', scores: [5, 1, 1, 1] },
];

/** The closing line: a badge per column, in one of the three tones. */
const ALTERNATIVES_SUMMARY = {
  parameter: 'Total Cost of Ownership (3 yr)',
  cells: [
    { label: 'BEST', tone: 'BEST' },
    { label: 'MEDIUM', tone: 'NEUTRAL' },
    { label: 'MEDIUM', tone: 'NEUTRAL' },
    { label: 'LOW-MED', tone: 'GOOD' },
  ],
};

/*
 * The customer stories, exactly as the carousel reads today.
 *
 * PUBLICATION FLAG carried over from the component: the KBJ Foods story is
 * paraphrased from research rather than a sign-off-ready quote, and the other
 * three are placeholder content for layout. Confirm wording and consent before
 * launch - which is now an edit in the admin panel rather than a deploy.
 *
 * The accent behind each portrait is not stored: every card uses the section's
 * orange, which is the site's own brand colour rather than something authored
 * per story.
 */
const OUTCOME_BUTTONS = {
  primaryLabel: 'Get started',
  primaryHref: '/demo',
  secondaryLabel: 'View all stories',
  secondaryHref: '/clients',
};

const OUTCOME_CARDS = [
  {
    title: 'He found his weakest distributor in the data — not at year-end.',
    body: 'As SKU count and route coverage outran manual dispatch and pricing control, Pravesh read the numbers instead of waiting for the year-end review — identified an underperforming distributor territory and cut it by 50%. Distributor profitability rose within the year, and distributors began proactively calling head office, instead of the other way round.',
    personName: 'Pravesh Kumar',
    personRole: 'Sales & Distribution Head',
    company: 'KBJ Foods',
    photoUrl: '/images/parvesh_kumar.webp',
    linkHref: '/clients',
  },
  {
    title: 'Route coverage went up — without adding a single feet-on-street.',
    body: 'Beat plans that used to live in a supervisor\u2019s notebook now run in the app. Reps follow optimised routes, head office sees live coverage, and the same team services 30% more outlets a week — with no extra hiring.',
    personName: 'Anita Sharma',
    personRole: 'National Sales Manager',
    company: 'Sunrise Beverages',
    photoUrl: '/images/anita_sharma.webp',
    linkHref: '/clients',
  },
  {
    title: 'Secondary sales visibility, finally in real time.',
    body: 'Primary billing was always clear; what happened after the distributor was a black box. With order-to-outlet capture, secondary sales now update daily — so forecasting, schemes and stock decisions are made on real demand, not a month-old guess.',
    personName: 'Rahul Mehta',
    personRole: 'Distribution Lead',
    company: 'Metro Foods',
    photoUrl: '/images/rahul_mehata.webp',
    linkHref: '/clients',
  },
  {
    title: 'Scheme claims settled in days, not weeks.',
    body: 'Distributor claims used to bounce between email, Excel and finance for weeks. Now they are raised, validated against sales and approved inside one flow — settlement time dropped sharply and disputes fell with it.',
    personName: 'Vikram Rao',
    personRole: 'Channel Head',
    company: 'GreenLeaf FMCG',
    photoUrl: '/images/vikram_rao.webp',
    linkHref: '/clients',
  },
];

export async function seedSfaDmsPage(
  client: PoolClient,
): Promise<{
  heroSlides: number;
  faqEntries: number;
  ctaSection: number;
  proofPanel: number;
  proofLogos: number;
  proofStats: number;
  videoEntries: number;
  packageCards: number;
  packageFeatures: number;
  compliancePanels: number;
  complianceBadges: number;
  alternativesSection: number;
  alternativesColumns: number;
  alternativesRows: number;
  alternativesCells: number;
  outcomeButtons: number;
  outcomeCards: number;
}> {
  let heroSlides = 0;
  let faqEntries = 0;
  let ctaSection = 0;
  let proofPanel = 0;
  let proofLogos = 0;
  let proofStats = 0;
  let videoEntries = 0;
  let packageCards = 0;
  let packageFeatures = 0;
  let compliancePanels = 0;
  let complianceBadges = 0;
  let alternativesSection = 0;
  let alternativesColumns = 0;
  let alternativesRows = 0;
  let alternativesCells = 0;
  let outcomeButtons = 0;
  let outcomeCards = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM sfa_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_hero_slides
        (eyebrow, headline, subhead, micro_trust,
         cta_label, cta_href, secondary_label, secondary_href,
         image_url, display_order, status)
      SELECT u.eyebrow, u.headline, u.subhead, $5,
             $6, $7, $8, $9,
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
    'SELECT COUNT(*) AS count FROM sfa_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_faq_entries (question, answer, display_order, status)
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
    'SELECT COUNT(*) AS count FROM sfa_cta_section',
  );
  if (Number(existingCta.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_cta_section
        (singleton, background_image_url, dashboard_image_url, dashboard_alt,
         button_label, button_href)
      VALUES (TRUE, $1, $2, $3, $4, $5)
      `,
      [
        CTA_SECTION.backgroundImageUrl,
        CTA_SECTION.dashboardImageUrl,
        CTA_SECTION.dashboardAlt,
        CTA_SECTION.buttonLabel,
        CTA_SECTION.buttonHref,
      ],
    );
    ctaSection = result.rowCount ?? 0;
  }

  const existingPanel = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM sfa_proof_panel',
  );
  if (Number(existingPanel.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_proof_panel
        (singleton, heading, body_text, link_label, link_href, logos_label)
      VALUES (TRUE, $1, $2, $3, $4, $5)
      `,
      [
        PROOF_PANEL.heading,
        PROOF_PANEL.bodyText,
        PROOF_PANEL.linkLabel,
        PROOF_PANEL.linkHref,
        PROOF_PANEL.logosLabel,
      ],
    );
    proofPanel = result.rowCount ?? 0;
  }

  const existingLogos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM sfa_proof_logos',
  );
  if (Number(existingLogos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_proof_logos (image_url, alt, display_order, status)
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
    'SELECT COUNT(*) AS count FROM sfa_proof_stats',
  );
  if (Number(existingStats.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_proof_stats (value, label, display_order, status)
      SELECT u.value, u.label, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(value, label, position)
      `,
      [
        PROOF_STATS.map((s) => s.value),
        PROOF_STATS.map((s) => s.label),
        PROOF_STATS.map((_, index) => index),
      ],
    );
    proofStats = result.rowCount ?? 0;
  }

  const existingVideos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM sfa_video_entries',
  );
  if (Number(existingVideos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_video_entries (video_url, display_order, status)
      VALUES ($1, 0, 'ACTIVE')
      `,
      [VIDEO_URL],
    );
    videoEntries = result.rowCount ?? 0;
  }

  const existingCards = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM sfa_package_cards',
  );
  if (Number(existingCards.rows[0].count) === 0) {
    for (const [index, card] of PACKAGE_CARDS.entries()) {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO sfa_package_cards
          (icon, stage_label, title, subtitle, description, accent_color,
           button_label, button_href, features_label, display_order, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
        RETURNING id
        `,
        [
          card.icon,
          card.stageLabel,
          card.title,
          card.subtitle,
          card.description,
          card.accentColor,
          PACKAGE_BUTTON.label,
          PACKAGE_BUTTON.href,
          card.featuresLabel,
          index,
        ],
      );
      packageCards += inserted.rowCount ?? 0;

      const ticks = await client.query(
        `
        INSERT INTO sfa_package_features (card_id, label, display_order, status)
        SELECT $1, u.label, u.position, 'ACTIVE'
          FROM unnest($2::text[], $3::int[]) AS u(label, position)
        `,
        [
          inserted.rows[0].id,
          card.features,
          card.features.map((_, position) => position),
        ],
      );
      packageFeatures += ticks.rowCount ?? 0;
    }
  }

  const existingPanels = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM sfa_compliance_section',
  );
  if (Number(existingPanels.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_compliance_section
        (singleton, compliance_label, compliance_icon, background_image_url,
         ecosystem_label, ecosystem_icon, ecosystem_color)
      VALUES (TRUE, $1, $2, $3, $4, $5, $6)
      `,
      [
        COMPLIANCE_PANELS.complianceLabel,
        COMPLIANCE_PANELS.complianceIcon,
        COMPLIANCE_PANELS.backgroundImageUrl,
        COMPLIANCE_PANELS.ecosystemLabel,
        COMPLIANCE_PANELS.ecosystemIcon,
        COMPLIANCE_PANELS.ecosystemColor,
      ],
    );
    compliancePanels = result.rowCount ?? 0;
  }

  const existingBadges = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM sfa_compliance_badges',
  );
  if (Number(existingBadges.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_compliance_badges (icon, title, subtext, display_order, status)
      SELECT u.icon, u.title, u.subtext, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(icon, title, subtext, position)
      `,
      [
        COMPLIANCE_BADGES.map((b) => b.icon),
        COMPLIANCE_BADGES.map((b) => b.title),
        COMPLIANCE_BADGES.map((b) => b.subtext),
        COMPLIANCE_BADGES.map((_, index) => index),
      ],
    );
    complianceBadges = result.rowCount ?? 0;
  }

  const existingGrid = await client.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM comparison_sections
      WHERE page_key = 'sfa-dms' AND section_key = 'alternatives'`,
  );
  if (Number(existingGrid.rows[0].count) === 0) {
    const section = await client.query<{ id: string }>(
      `
      INSERT INTO comparison_sections
        (page_key, section_key, cell_type, leader_label, status)
      VALUES ('sfa-dms', 'alternatives', 'RATING', 'Capability', 'ACTIVE')
      RETURNING id
      `,
    );
    const sectionId = section.rows[0].id;
    alternativesSection = section.rowCount ?? 0;

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

    const category = await client.query<{ id: string }>(
      `
      INSERT INTO comparison_categories (section_id, name, display_order, status)
      VALUES ($1, 'Capabilities', 0, 'ACTIVE')
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
        INSERT INTO comparison_values (row_id, column_id, rating)
        SELECT $1, u.column_id, u.rating
          FROM unnest($2::uuid[], $3::smallint[]) AS u(column_id, rating)
        `,
        [inserted.rows[0].id, columnIds, row.scores],
      );
      alternativesCells += cells.rowCount ?? 0;
    }

    // Ordered past every capability, so the closing line stays last.
    const summaryRow = await client.query<{ id: string }>(
      `
      INSERT INTO comparison_rows
        (category_id, parameter, row_type, display_order, status)
      VALUES ($1, $2, 'SUMMARY', 9999, 'ACTIVE')
      RETURNING id
      `,
      [categoryId, ALTERNATIVES_SUMMARY.parameter],
    );
    alternativesRows += summaryRow.rowCount ?? 0;

    const summaryCells = await client.query(
      `
      INSERT INTO comparison_values (row_id, column_id, content, tone)
      SELECT $1, u.column_id, u.label, u.tone
        FROM unnest($2::uuid[], $3::text[], $4::text[]) AS u(column_id, label, tone)
      `,
      [
        summaryRow.rows[0].id,
        columnIds,
        ALTERNATIVES_SUMMARY.cells.map((c) => c.label),
        ALTERNATIVES_SUMMARY.cells.map((c) => c.tone),
      ],
    );
    alternativesCells += summaryCells.rowCount ?? 0;
  }

  const existingButtons = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM sfa_outcome_section',
  );
  if (Number(existingButtons.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_outcome_section
        (singleton, primary_label, primary_href, secondary_label, secondary_href)
      VALUES (TRUE, $1, $2, $3, $4)
      `,
      [
        OUTCOME_BUTTONS.primaryLabel,
        OUTCOME_BUTTONS.primaryHref,
        OUTCOME_BUTTONS.secondaryLabel,
        OUTCOME_BUTTONS.secondaryHref,
      ],
    );
    outcomeButtons = result.rowCount ?? 0;
  }

  const existingStories = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM sfa_outcome_cards',
  );
  if (Number(existingStories.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO sfa_outcome_cards
        (title, body, person_name, person_role, company, photo_url, link_href,
         display_order, status)
      SELECT u.title, u.body, u.person_name, u.person_role, u.company,
             u.photo_url, u.link_href, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                    $6::text[], $7::text[], $8::int[])
          AS u(title, body, person_name, person_role, company, photo_url,
               link_href, position)
      `,
      [
        OUTCOME_CARDS.map((c) => c.title),
        OUTCOME_CARDS.map((c) => c.body),
        OUTCOME_CARDS.map((c) => c.personName),
        OUTCOME_CARDS.map((c) => c.personRole),
        OUTCOME_CARDS.map((c) => c.company),
        OUTCOME_CARDS.map((c) => c.photoUrl),
        OUTCOME_CARDS.map((c) => c.linkHref),
        OUTCOME_CARDS.map((_, index) => index),
      ],
    );
    outcomeCards = result.rowCount ?? 0;
  }

  return {
    heroSlides,
    faqEntries,
    ctaSection,
    proofPanel,
    proofLogos,
    proofStats,
    videoEntries,
    packageCards,
    packageFeatures,
    compliancePanels,
    complianceBadges,
    alternativesSection,
    alternativesColumns,
    alternativesRows,
    alternativesCells,
    outcomeButtons,
    outcomeCards,
  };
}
