// src/database/seeds/pos.seed.ts

import { PoolClient } from 'pg';

/**
 * The POS product page, exactly as it renders today: the five hero slides, the
 * proof strip, the category map, the product video, the three growth-path
 * tiers, the security band, the six FAQ questions and the closing band.
 *
 * The copy that heads each of those is seeded alongside the other pages' in
 * seed.ts, under ('pos', 'proof'), ('pos', 'recognition'), ('pos', 'video'),
 * ('pos', 'packages'), ('pos', 'establishers'), ('pos', 'faq') and
 * ('pos', 'cta').
 */

const CTA = { label: 'Talk to a Retail Specialist', href: '/demo' };
const SECONDARY = { label: 'Watch 2-Min Product Tour', href: '/resources' };
const MICRO_TRUST = '250+ outlets, 6,000+ orders a day, running on this system today.';

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
    eyebrow: 'Retail Sales Engine',
    headline: 'Your Retail Sales — Growth Engine.',
    subhead:
      'Swiggy, Zomato, CRM, WhatsApp and loyalty — advanced features that turn every counter into a growth engine.',
    imageUrl: '/images/pos_hero1.webp',
  },
  {
    eyebrow: 'Control from Anywhere',
    headline: 'Walk Away from the Counter — Not from the Business.',
    subhead:
      'A secure working environment, role-based access and a detailed DSR — full control even when you are away from the till.',
    imageUrl: '/images/pos_hero2.webp',
  },
  {
    eyebrow: 'One Screen',
    headline: 'One Screen for Your Counter — Your Kitchen and Your Stock.',
    subhead: 'One centralised screen. Absolute control from anywhere, everywhere.',
    imageUrl: '/images/pos_hero3.webp',
  },
  {
    eyebrow: 'Protected Profit',
    headline: 'Accurate Stock — Protected Profit.',
    subhead:
      'POS-level recipe management makes it possible — every sale deducts the real ingredients behind it.',
    imageUrl: '/images/pos_hero4.webp',
  },
  {
    eyebrow: 'Peak-Hour Speed',
    headline: 'Bill in Seconds — Even at Peak Hour.',
    subhead:
      'Online and offline billing with auto-sync — the queue never stops, even when the internet does.',
    imageUrl: '/images/pos_hero5.webp',
  },
];

/**
 * Concrete, counter-level questions a retail or F&B owner actually asks - not
 * enterprise-style due diligence, which is the editorial point of this list.
 */
const FAQ_ENTRIES = [
  {
    question: 'What hardware do I need?',
    answer:
      'Very little. UpWon POS runs on a standard Android tablet or a Windows/Android billing machine you may already own. Add a thermal printer, cash drawer and barcode scanner if you want them — we support common brands like Epson, Zebra, Honeywell and iMin. No proprietary hardware to buy, and no lock-in.',
  },
  {
    question: 'Does it work if my internet goes down?',
    answer:
      'Yes. Billing keeps running in offline mode, so your counter never stops during a network drop. Sales, stock deduction and reports sync automatically the moment your connection is back — nothing is lost and no one has to re-enter anything.',
  },
  {
    question: 'Can I connect Zomato and Swiggy orders directly?',
    answer:
      'Yes. Online orders from Zomato and Swiggy flow into the same screen as your counter sales, so your team bills, tracks stock and reads food cost from one place — not three. No separate tablets to watch, no manual re-punching of aggregator orders.',
  },
  {
    question: 'Can I start with just POS and add more later?',
    answer:
      'That is exactly how it is designed. Start with Core POS today and move up to PRO or PLUS — or into full UpWon ERP and FMS — without re-platforming or re-entering a single record. Your data and history carry forward as you grow.',
  },
  {
    question: 'Is it GST-compliant out of the box?',
    answer:
      'Yes. GST rules, HSN-wise reporting and e-invoicing are built in, not bolted on. Invoices are compliant by default, so you are not doing manual work at month-end to stay on the right side of tax.',
  },
  {
    question: 'How long does setup actually take?',
    answer:
      'Most counters go live in days, not months. We handle setup, catalogue and recipe configuration, staff training and go-live with you — then stay on for ongoing support. For a single outlet it is typically a matter of a short, guided onboarding rather than a long IT project.',
  },
];

/**
 * The closing band, including the handwritten note the background arrow points
 * at. The newline in the note is what draws it on two lines, the same grammar
 * the headings use.
 */
const CTA_SECTION = {
  desktopImageUrl: '/images/cta_pos_desktop.webp',
  mobileImageUrl: '/images/cta_pos_mobile.webp',
  primaryLabel: 'Talk to a Retail Specialist',
  primaryHref: '/demo',
  secondaryLabel: 'See How This Fits Your Counter',
  secondaryHref: '/contact',
  footnote: 'No obligation. 30 minutes about your business, not a sales pitch.',
  note: 'Your Counter.\nOur Focus.',
};

/**
 * The brand wall, in the order the two scrolling rows read it.
 *
 * The same six marks the SFA-DMS and FMS strips use today, kept as its own
 * list because this one is claiming something different about them - that they
 * run UpWon at the counter, not that they run distribution or a franchise
 * network.
 *
 * The Kaka Halwai file has a space in its name, so the URL carries it
 * percent-encoded exactly as the component did.
 */
const PROOF_LOGOS = [
  { alt: 'Monginis', imageUrl: '/images/testimonial/mongignis.webp' },
  { alt: 'Kaka Halwai', imageUrl: '/images/testimonial/kaka%20halwai.webp' },
  { alt: 'U2 Cake', imageUrl: '/images/testimonial/u2cake.webp' },
  { alt: 'Gokul', imageUrl: '/images/testimonial/gokul.webp' },
  { alt: 'OFC', imageUrl: '/images/testimonial/ofc.webp' },
  { alt: 'Winni', imageUrl: '/images/testimonial/winni.webp' },
];

/**
 * The four figures, with their sources inside the label - which is where this
 * strip puts them, having no second line to hold them.
 */
const PROOF_STATS = [
  { icon: 'ShoppingBag', value: '6,000+', label: 'orders processed daily (U2 Cake)' },
  { icon: 'Wallet', value: '₹23L+', label: 'daily transaction value' },
  { icon: 'Timer', value: '48%', label: 'faster billing (Kaka Halwai)' },
  { icon: 'Store', value: '250+', label: 'outlets running live' },
];

/**
 * The category map's cards, in the order the grid reads them.
 *
 * Ten today, ending on "Other Businesses" - the catch-all that stops a visitor
 * whose counter is not named above from concluding the page is not for them.
 * It is last on purpose, so leave it at the end of any reorder.
 */
const RECOGNITION_CATEGORIES = [
  {
    icon: 'Croissant',
    title: 'Bakery & Confectionery',
    description: 'Manage fresh batches, combos and counter sales seamlessly.',
  },
  {
    icon: 'Candy',
    title: 'Sweets & Namkeen',
    description: 'Track weight-based items, pricing tiers and festive sales.',
  },
  {
    icon: 'Sandwich',
    title: 'QSR & Cafés',
    description: 'KOT speed and delivery-aggregator orders on one screen.',
  },
  {
    icon: 'IceCreamCone',
    title: 'Ice Cream & Dessert Parlours',
    description: 'Handle flavours, toppings, combos and seasonal offers.',
  },
  {
    icon: 'ShoppingBag',
    title: 'General Food Retail',
    description: 'Streamline billing, stock and loyalty at the counter.',
  },
  {
    icon: 'UtensilsCrossed',
    title: 'Dine-In Restaurants',
    description: 'Table billing, split bills and smooth dine-in operations.',
  },
  {
    icon: 'ChefHat',
    title: 'Cloud Kitchens & Takeaway',
    description: 'Manage online orders, packaging and quick counter pickups.',
  },
  {
    icon: 'CupSoda',
    title: 'Beverage & Juice Bars',
    description: 'Add-ons, variations and fast billing at busy hours.',
  },
  {
    icon: 'Store',
    title: 'Food Kiosks & Food Courts',
    description: 'Compact setups with powerful billing and stock control.',
  },
  {
    icon: 'Sparkles',
    title: 'Other Businesses',
    description: 'A flexible solution for any counter that needs speed and control.',
  },
];

/*
 * The clip the page ships. The same file the SFA-DMS and FMS pages show today
 * - it is the one film the site has - but stored on its own row, so re-cutting
 * one page's video leaves the others alone.
 */
const VIDEO_URL = '/video/video_test.mp4';


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

/**
 * The growth-path line under the cards.
 *
 * The orange half is marked the way headings mark theirs, because that is how
 * the page draws it - the API parses it into footnoteLines on the way out.
 */
const GROWTH_FOOTNOTE =
  'Start with Core today. Move to Plus \u2014 or into full UpWon ERP \u2014 **without re-entering a single record.**';

/** Every card ships the same button today, stored per tier so one can differ. */
const TIER_BUTTON = { label: 'Talk to us', href: '/demo' };

const GROWTH_TIERS: SeedTier[] = [
  {
    slug: 'core',
    name: 'Core',
    lead: 'Essential counter billing',
    tagline: 'Single outlet or up to 10 counters',
    scope: 'Up to 10 counters',
    inheritsLabel: 'Includes',
    buttonLabel: TIER_BUTTON.label,
    buttonHref: TIER_BUTTON.href,
    isPopular: false,
    features: [
      'Cloud POS \u2014 touch, barcode & weighing',
      'Multi-tender billing \u2014 cash, card, UPI, wallet',
      'GST-compliant invoicing',
      'Item & category management',
      'Daily sales & Z-reports',
      'Offline-first reliability',
    ],
  },
  {
    slug: 'pro',
    name: 'Pro',
    lead: 'Kitchen, loyalty & delivery',
    tagline: '10\u2013100 counters across outlets',
    scope: 'Up to 100 counters',
    inheritsLabel: 'Everything in Core, plus',
    buttonLabel: TIER_BUTTON.label,
    buttonHref: TIER_BUTTON.href,
    isPopular: true,
    features: [
      'KOT & Kitchen Display',
      'Table & order management',
      'Loyalty & repeat-customer tracking',
      'Discounts, offers & combos',
      'Delivery aggregator integration (Zomato, Swiggy, ONDC)',
      'Multi-counter, multi-outlet billing',
    ],
  },
  {
    slug: 'plus',
    name: 'Plus',
    lead: 'Inventory, analytics & upgrade path',
    tagline: '100+ counters or chain-wide POS',
    scope: 'Unlimited',
    inheritsLabel: 'Everything in Pro, plus',
    buttonLabel: TIER_BUTTON.label,
    buttonHref: TIER_BUTTON.href,
    isPopular: false,
    features: [
      'Recipe-level inventory deduction',
      'Purchase & vendor management',
      'Multi-outlet dashboard & analytics',
      'Central kitchen & stock transfers',
      'Role-based access & audit trail',
      'Direct upgrade path into UpWon ERP & FMS',
    ],
  },
];

/**
 * The security band's fixed furniture.
 *
 * The two panel labels were hardcoded in the component; the caption under the
 * sphere carries an orange half, marked the way the headings mark theirs.
 */
const SECURITY_SECTION = {
  panelOneLabel: 'Compliant by Design',
  panelTwoLabel: 'Connected to What You Already Use',
  shieldImageUrl: '/images/Compliant%20by%20design.webp',
  sphereFootnote: 'Seamless integrations. **Stronger operations.**',
  dataIcon: 'UserRound',
  dataHeading: 'Your Data. Your Business.',
  dataBody:
    'Sales and customer data belongs to your business. We never sell, share or use your data for anything else.',
  dataLeftImageUrl: '/images/sec_comp.webp',
  dataRightImageUrl: '/images/layer.webp',
};

/**
 * The compliance badges, in the order the two columns read them: the first
 * half goes left of the shield, the rest to its right.
 */
const SECURITY_BADGES = [
  {
    icon: 'FileCheck',
    title: 'GST & e-invoice ready',
    subtext: 'Native GST invoicing & e-invoicing.',
  },
  {
    icon: 'ShieldCheck',
    title: 'ISO-aligned',
    subtext: 'Aligned with global security practices (ISO 27001).',
  },
  {
    icon: 'CreditCard',
    title: 'Secure payment handling',
    subtext: 'PCI-compliant secure transactions and settlements.',
  },
  {
    icon: 'Award',
    title: 'CMM Level 3',
    subtext: 'Documented process rigour & continuous improvement.',
  },
];

/**
 * The marks pinned to the sphere.
 *
 * Fifteen of the home page's sixteen: this list leaves out the attendance
 * device, because the sphere sits under a claim about what a counter connects
 * to. Its own rows rather than the home page's, so that stays true.
 */
const SECURITY_LOGO_BASE = '/images/platform_integration_client/';
const SECURITY_LOGOS = [
  { alt: 'PhonePe', file: 'PhonePe.webp' },
  { alt: 'Tally', file: 'Tally.webp' },
  { alt: 'SAP', file: 'SAP.webp' },
  { alt: 'Oracle', file: 'Oracle.webp' },
  { alt: 'Microsoft Dynamics 365', file: 'Dynamics.webp' },
  { alt: 'TCS iON', file: 'Tcsion.webp' },
  { alt: 'EPSON', file: 'EPSON.webp' },
  { alt: 'Zomato', file: 'zomato.webp' },
  { alt: 'Swiggy', file: 'swiggy.webp' },
  { alt: 'ONDC', file: 'ondc.webp' },
  { alt: 'Dunzo', file: 'unzo.webp' },
  { alt: 'Paytm', file: 'paytm.webp' },
  { alt: 'UPI', file: 'upi.webp' },
  { alt: 'Google Pay', file: 'Gpay.webp' },
  { alt: 'BharatPe', file: 'BharatPe.webp' },
];

/** The short row at the foot of the data strip. */
const SECURITY_ASSURANCES = [
  { icon: 'Lock', label: 'You own it.' },
  { icon: 'ShieldCheck', label: 'You control it.' },
  { icon: 'Eye', label: 'You decide.' },
];

/**
 * The comparison grid.
 *
 * A rating section: every capability row carries stars rather than prose. The
 * one exception is the closing cost row, which is a SUMMARY row - the shared
 * schema lets a cell hold a rating or text but never both, so a text row
 * inside a rating grid is a supported shape rather than a workaround.
 */
const ALTERNATIVES_COLUMNS = [
  { name: 'UpWon POS', highlight: true },
  { name: 'Petpooja', highlight: false },
  { name: 'Restroworks', highlight: false },
  { name: 'GoFrugal', highlight: false },
];

/** Stars out of five. Zero draws the em dash the grid uses for "not native". */
const ALTERNATIVES_ROWS = [
  { parameter: 'Recipe-level inventory accuracy', ratings: [5, 2, 2, 1] },
  { parameter: 'True food cost & margin', ratings: [5, 2, 3, 1] },
  { parameter: 'FSSAI compliance (native)', ratings: [5, 3, 3, 2] },
  { parameter: 'GST & e-invoicing (native)', ratings: [5, 4, 4, 4] },
  { parameter: 'Offline-first billing', ratings: [5, 4, 3, 4] },
  { parameter: 'Kitchen (KOT / KDS)', ratings: [5, 5, 5, 3] },
  { parameter: 'Delivery aggregator integration', ratings: [5, 5, 4, 3] },
  { parameter: 'Loyalty & CRM', ratings: [4, 4, 4, 3] },
  { parameter: 'Multi-outlet / chain control', ratings: [5, 3, 4, 4] },
  { parameter: 'Upgrade path into full ERP', ratings: [5, 1, 0, 2] },
  { parameter: 'Mobile-first / cloud', ratings: [5, 4, 4, 3] },
];

/** The closing row, in words rather than stars. */
const ALTERNATIVES_SUMMARY = {
  parameter: 'Total Cost of Ownership (3 yr)',
  cells: ['BEST', 'LOW', 'MEDIUM', 'LOW-MED'],
};

/**
 * The outcome marquee's cards.
 *
 * No figures on these, unlike the FMS page's - the quote is the whole card,
 * which is why this page has no stats table.
 */
const OUTCOME_STORIES = [
  {
    slug: 'u2-cake-visibility',
    name: 'U2 Cake',
    logoUrl: '/images/testimonial/u2cake.webp',
    photoUrl: '/images/fms_hero2.webp',
    quote:
      'Every order, every outlet, every minute \u2014 fully visible on one screen. 6,000+ orders a day now run through UpWon POS without a single manual stock count.',
    personName: 'U2 Cake Leadership Team',
    personCompany: 'Bakery Chain \u00b7 250+ Outlets',
    linkLabel: 'Read case study',
    linkHref: '/clients/u2-cake',
  },
  {
    slug: 'kaka-halwai-billing',
    name: 'Kaka Halwai',
    logoUrl: '/images/testimonial/kaka%20halwai.webp',
    photoUrl: '/images/fms_hero1.webp',
    quote:
      'Billing at the counter is 48% faster and our stock finally matches reality. Recipe-level deduction means we know our true food cost on every sale, instantly.',
    personName: 'Kaka Halwai Operations',
    personCompany: 'Namkeen & Sweets',
    linkLabel: 'Read case study',
    linkHref: '/clients/kaka-halwai',
  },
  {
    slug: 'u2-cake-margins',
    name: 'U2 Cake',
    logoUrl: '/images/testimonial/u2cake.webp',
    photoUrl: '/images/fms_hero3.webp',
    quote:
      '\u20b923 Lakh+ of daily business runs on one system \u2014 counter, kitchen and finance all reading the same numbers. Our margins are no longer a month-end guess.',
    personName: 'U2 Cake Finance Team',
    personCompany: 'Bakery Chain',
    linkLabel: 'Read case study',
    linkHref: '/clients/u2-cake',
  },
];

export async function seedPosPage(client: PoolClient): Promise<{
  heroSlides: number;
  faqEntries: number;
  ctaSection: number;
  proofLogos: number;
  proofStats: number;
  recognitionCategories: number;
  videoEntries: number;
  growthSection: number;
  growthTiers: number;
  growthFeatures: number;
  securitySection: number;
  securityBadges: number;
  securityLogos: number;
  securityAssurances: number;
  alternativesColumns: number;
  alternativesRows: number;
  alternativesCells: number;
  outcomeStories: number;
}> {
  let heroSlides = 0;
  let faqEntries = 0;
  let ctaSection = 0;
  let proofLogos = 0;
  let proofStats = 0;
  let recognitionCategories = 0;
  let videoEntries = 0;
  let growthSection = 0;
  let growthTiers = 0;
  let growthFeatures = 0;
  let securitySection = 0;
  let securityBadges = 0;
  let securityLogos = 0;
  let securityAssurances = 0;
  let alternativesColumns = 0;
  let alternativesRows = 0;
  let alternativesCells = 0;
  let outcomeStories = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_hero_slides
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
    'SELECT COUNT(*) AS count FROM pos_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_faq_entries (question, answer, display_order, status)
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
    'SELECT COUNT(*) AS count FROM pos_cta_section',
  );
  if (Number(existingCta.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_cta_section
        (singleton, desktop_image_url, mobile_image_url,
         primary_label, primary_href, secondary_label, secondary_href, footnote, note)
      VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        CTA_SECTION.desktopImageUrl,
        CTA_SECTION.mobileImageUrl,
        CTA_SECTION.primaryLabel,
        CTA_SECTION.primaryHref,
        CTA_SECTION.secondaryLabel,
        CTA_SECTION.secondaryHref,
        CTA_SECTION.footnote,
        CTA_SECTION.note,
      ],
    );
    ctaSection = result.rowCount ?? 0;
  }

  const existingProofLogos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_proof_logos',
  );
  if (Number(existingProofLogos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_proof_logos (image_url, alt, display_order, status)
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

  const existingProofStats = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_proof_stats',
  );
  if (Number(existingProofStats.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_proof_stats (icon, value, label, display_order, status)
      SELECT u.icon, u.value, u.label, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(icon, value, label, position)
      `,
      [
        PROOF_STATS.map((s) => s.icon),
        PROOF_STATS.map((s) => s.value),
        PROOF_STATS.map((s) => s.label),
        PROOF_STATS.map((_, index) => index),
      ],
    );
    proofStats = result.rowCount ?? 0;
  }

  const existingCategories = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_recognition_categories',
  );
  if (Number(existingCategories.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_recognition_categories (icon, title, description, display_order, status)
      SELECT u.icon, u.title, u.description, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(icon, title, description, position)
      `,
      [
        RECOGNITION_CATEGORIES.map((c) => c.icon),
        RECOGNITION_CATEGORIES.map((c) => c.title),
        RECOGNITION_CATEGORIES.map((c) => c.description),
        RECOGNITION_CATEGORIES.map((_, index) => index),
      ],
    );
    recognitionCategories = result.rowCount ?? 0;
  }

  const existingVideos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_video_entries',
  );
  if (Number(existingVideos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_video_entries (video_url, display_order, status)
      VALUES ($1, 0, 'ACTIVE')
      `,
      [VIDEO_URL],
    );
    videoEntries = result.rowCount ?? 0;
  }

  const existingGrowthSection = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_growth_section',
  );
  if (Number(existingGrowthSection.rows[0].count) === 0) {
    const result = await client.query(
      'INSERT INTO pos_growth_section (singleton, footnote) VALUES (TRUE, $1)',
      [GROWTH_FOOTNOTE],
    );
    growthSection = result.rowCount ?? 0;
  }

  const existingTiers = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_growth_tiers',
  );
  if (Number(existingTiers.rows[0].count) === 0) {
    /*
     * The tiers go in as one statement so their ids come back with the rows,
     * which is what the tick insert keys on - three round trips become two.
     */
    const inserted = await client.query<{ id: string; slug: string }>(
      `
      INSERT INTO pos_growth_tiers
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
      INSERT INTO pos_growth_features (tier_id, label, display_order, status)
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

  const existingSecuritySection = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_security_section',
  );
  if (Number(existingSecuritySection.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_security_section
        (singleton, panel_one_label, panel_two_label, shield_image_url, sphere_footnote,
         data_icon, data_heading, data_body, data_left_image_url, data_right_image_url)
      VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        SECURITY_SECTION.panelOneLabel,
        SECURITY_SECTION.panelTwoLabel,
        SECURITY_SECTION.shieldImageUrl,
        SECURITY_SECTION.sphereFootnote,
        SECURITY_SECTION.dataIcon,
        SECURITY_SECTION.dataHeading,
        SECURITY_SECTION.dataBody,
        SECURITY_SECTION.dataLeftImageUrl,
        SECURITY_SECTION.dataRightImageUrl,
      ],
    );
    securitySection = result.rowCount ?? 0;
  }

  const existingSecurityBadges = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_security_badges',
  );
  if (Number(existingSecurityBadges.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_security_badges (icon, title, subtext, display_order, status)
      SELECT u.icon, u.title, u.subtext, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(icon, title, subtext, position)
      `,
      [
        SECURITY_BADGES.map((b) => b.icon),
        SECURITY_BADGES.map((b) => b.title),
        SECURITY_BADGES.map((b) => b.subtext),
        SECURITY_BADGES.map((_, index) => index),
      ],
    );
    securityBadges = result.rowCount ?? 0;
  }

  const existingSecurityLogos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_security_logos',
  );
  if (Number(existingSecurityLogos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_security_logos (image_url, alt, display_order, status)
      SELECT u.image_url, u.alt, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(image_url, alt, position)
      `,
      [
        SECURITY_LOGOS.map((l) => `${SECURITY_LOGO_BASE}${l.file}`),
        SECURITY_LOGOS.map((l) => l.alt),
        SECURITY_LOGOS.map((_, index) => index),
      ],
    );
    securityLogos = result.rowCount ?? 0;
  }

  const existingAssurances = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_security_assurances',
  );
  if (Number(existingAssurances.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_security_assurances (icon, label, display_order, status)
      SELECT u.icon, u.label, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(icon, label, position)
      `,
      [
        SECURITY_ASSURANCES.map((a) => a.icon),
        SECURITY_ASSURANCES.map((a) => a.label),
        SECURITY_ASSURANCES.map((_, index) => index),
      ],
    );
    securityAssurances = result.rowCount ?? 0;
  }

  const existingGrid = await client.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM comparison_sections
      WHERE page_key = 'pos' AND section_key = 'alternatives'`,
  );
  if (Number(existingGrid.rows[0].count) === 0) {
    const section = await client.query<{ id: string }>(
      `
      INSERT INTO comparison_sections
        (page_key, section_key, cell_type, leader_label, status)
      VALUES ('pos', 'alternatives', 'RATING', 'Capability', 'ACTIVE')
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
     * One band, never surfaced: this design is a flat list of capabilities,
     * but a row has to belong to a category.
     */
    const category = await client.query<{ id: string }>(
      `
      INSERT INTO comparison_categories (section_id, name, display_order, status)
      VALUES ($1, 'Capability', 0, 'ACTIVE')
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
          FROM unnest($2::uuid[], $3::int[]) AS u(column_id, rating)
        `,
        [inserted.rows[0].id, columnIds, row.ratings],
      );
      alternativesCells += cells.rowCount ?? 0;
    }

    // The cost row closes the grid, so it sits after every capability.
    const summary = await client.query<{ id: string }>(
      `
      INSERT INTO comparison_rows
        (category_id, parameter, row_type, display_order, status)
      VALUES ($1, $2, 'SUMMARY', $3, 'ACTIVE')
      RETURNING id
      `,
      [categoryId, ALTERNATIVES_SUMMARY.parameter, ALTERNATIVES_ROWS.length],
    );
    alternativesRows += summary.rowCount ?? 0;

    const summaryCells = await client.query(
      `
      INSERT INTO comparison_values (row_id, column_id, content)
      SELECT $1, u.column_id, u.content
        FROM unnest($2::uuid[], $3::text[]) AS u(column_id, content)
      `,
      [summary.rows[0].id, columnIds, ALTERNATIVES_SUMMARY.cells],
    );
    alternativesCells += summaryCells.rowCount ?? 0;
  }

  const existingStories = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_outcome_stories',
  );
  if (Number(existingStories.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_outcome_stories
        (name, slug, logo_url, photo_url, quote, person_name, person_company,
         link_label, link_href, display_order, status)
      SELECT u.name, u.slug, u.logo_url, u.photo_url, u.quote, u.person_name,
             u.person_company, u.link_label, u.link_href, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                    $6::text[], $7::text[], $8::text[], $9::text[], $10::int[])
          AS u(name, slug, logo_url, photo_url, quote, person_name,
               person_company, link_label, link_href, position)
      `,
      [
        OUTCOME_STORIES.map((s) => s.name),
        OUTCOME_STORIES.map((s) => s.slug),
        OUTCOME_STORIES.map((s) => s.logoUrl),
        OUTCOME_STORIES.map((s) => s.photoUrl),
        OUTCOME_STORIES.map((s) => s.quote),
        OUTCOME_STORIES.map((s) => s.personName),
        OUTCOME_STORIES.map((s) => s.personCompany),
        OUTCOME_STORIES.map((s) => s.linkLabel),
        OUTCOME_STORIES.map((s) => s.linkHref),
        OUTCOME_STORIES.map((_, index) => index),
      ],
    );
    outcomeStories = result.rowCount ?? 0;
  }

  return {
    heroSlides,
    faqEntries,
    ctaSection,
    proofLogos,
    proofStats,
    recognitionCategories,
    videoEntries,
    growthSection,
    growthTiers,
    growthFeatures,
    securitySection,
    securityBadges,
    securityLogos,
    securityAssurances,
    alternativesColumns,
    alternativesRows,
    alternativesCells,
    outcomeStories,
  };
}
