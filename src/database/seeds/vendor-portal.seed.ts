// src/database/seeds/vendor-portal.seed.ts

import { PoolClient } from 'pg';

/**
 * The Vendor Portal (VMS) product page, exactly as it renders today: the five
 * hero slides, the proof bento, the seven capability cards, the three
 * outcome tabs, the six FAQ questions and the closing band.
 *
 * The copy that heads five of those is seeded alongside the other pages' in
 * seed.ts, under ('vms', 'proof'), ('vms', 'capabilities'), ('vms',
 * 'outcomes'), ('vms', 'faq') and ('vms', 'cta'). The hero has none, because
 * its slides carry their own.
 *
 * The rest of the live page - the vendor-type map, the operational-reality
 * strip, the approach flow, the connected-by-design panel, the implementation
 * band and the security section - is still the copy the site ships, and
 * arrives here as each section's tables are built.
 */

const CTA = { label: 'Talk to a Procurement Specialist', href: '/contact' };
const SECONDARY = { label: 'Watch 2-Min Product Tour', href: '/products/vendor-management' };

interface SeedSlide {
  eyebrow: string;
  headline: string;
  subhead: string;
  imageUrl: string;
}

/**
 * Every slide ships the same two buttons, but they are stored per slide
 * because the schema keeps them there - which is also what lets one of them
 * differ later.
 */
const HERO_SLIDES: SeedSlide[] = [
  {
    eyebrow: 'UPWON VENDOR MANAGEMENT',
    headline: 'Not Just L1 — Know Which Vendor Actually Delivers Quality.',
    subhead:
      'Go beyond comparing the lowest quote. Track vendor quality, delivery performance, and reliability to make smarter procurement decisions.',
    imageUrl: '/images/vms_deliver_quality.webp',
  },
  {
    eyebrow: 'UPWON VENDOR PORTAL',
    headline: 'Don’t Chase Vendors — Let Them Manage Their Own Updates.',
    subhead:
      'Vendors can log in, submit quotes, respond to RFQs, and update their own status from one connected portal—reducing manual follow-ups for your procurement team.',
    imageUrl: '/images/vms_one_dashboard.webp',
  },
  {
    eyebrow: 'UPWON VENDOR PERFORMANCE',
    headline: 'All Vendor Performance — On One Dashboard.',
    subhead:
      'Get a complete view of vendor activity, delivery performance, quality trends, and procurement insights without switching between spreadsheets and disconnected systems.',
    imageUrl: '/images/vms_one_dashboard.webp',
  },
  {
    eyebrow: 'UPWON QUALITY SCORING',
    headline: 'Vendor Quality Scored Against Every Delivery, Automatically.',
    subhead:
      'Build a clearer picture of supplier performance by tracking delivery quality over time, helping your team identify which vendors consistently meet your standards.',
    imageUrl: '/images/vms_quality_score.webp',
  },
  {
    eyebrow: 'UPWON RFQ MANAGEMENT',
    headline: 'Every RFQ, Every Quote, Every Vendor Response — In One Place.',
    subhead:
      'Stop searching through multiple email threads. Manage RFQs, vendor quotations, responses, and procurement communication from one connected workspace.',
    imageUrl: '/images/vms_quote.webp',
  },
];

/**
 * The proof bento, in layout order.
 *
 * The spans are the layout: 5 + 7 fills the first row of twelve columns, then
 * 5 + 3 + 4 fills the second. Reordering these rearranges the grid, which is
 * why the order is the one thing an editor should be careful with here.
 */
const PROOF_TILES: Array<{
  kind: 'METRIC' | 'IMAGE';
  colSpan: number;
  icon?: string;
  value?: string;
  direction?: 'up' | 'down';
  title?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
}> = [
  {
    kind: 'METRIC',
    colSpan: 5,
    icon: 'UserRoundPlus',
    value: '40%',
    direction: 'up',
    title: 'Faster Vendor Onboarding',
    description:
      'Bring vendor information online faster with a structured, centralized workflow. Collect, organize, validate, and manage vendor details, documents, compliance records, and approvals in one place—reducing manual work, improving accuracy, and keeping every vendor record up to date.',
  },
  {
    kind: 'IMAGE',
    colSpan: 7,
    imageUrl: '/images/vms_proof_number1.webp',
    imageAlt: 'Vendor management operational proof',
  },
  {
    kind: 'IMAGE',
    colSpan: 5,
    imageUrl: '/images/vms_proof_number2.webp',
    imageAlt: 'Vendor approval and procurement workflow',
  },
  {
    kind: 'METRIC',
    colSpan: 3,
    icon: 'Clock3',
    value: '32%',
    direction: 'down',
    title: 'Reduced Processing Time',
    description:
      'Fewer manual follow-ups and faster approvals across procurement workflows.',
  },
  {
    kind: 'METRIC',
    colSpan: 4,
    icon: 'ShieldCheck',
    value: '28%',
    direction: 'up',
    title: 'Better Compliance Visibility',
    description:
      'Centralized vendor records, documents and compliance for complete visibility.',
  },
];

/**
 * The capability carousel. The numbers the cards show - 01 to 07 - are their
 * position, so they are not stored; this order is what produces them.
 */
const CAPABILITY_CARDS = [
  {
    title: 'RFQ Management & Comparative Analysis',
    description:
      'Compare supplier quotes side by side and choose the best value with complete transparency.',
    imageUrl: '/images/vms_rfq_management.webp',
    imageAlt: 'RFQ Management and Comparative Analysis',
  },
  {
    title: 'Rate Contracts',
    description:
      'Negotiate, finalize and lock in terms. Track contract validity and rate revisions over time.',
    imageUrl: '/images/vms_rate_contracts.webp',
    imageAlt: 'Rate Contracts',
  },
  {
    title: 'Individual Vendor Login',
    description:
      'Vendors manage their profile, documents, POs and QC reports from their dedicated portal.',
    imageUrl: '/images/vms_vendor_login.webp',
    imageAlt: 'Individual Vendor Login',
  },
  {
    title: 'PO Status Tracking',
    description:
      'Real-time visibility for both buyers and vendors. No more status-check phone calls.',
    imageUrl: '/images/vms_status_logging.webp',
    imageAlt: 'PO Status Tracking',
  },
  {
    title: 'QC Process',
    description:
      'Quality inspections linked directly to orders and vendors with digital records and outcomes.',
    imageUrl: '/images/vms_qc_process.webp',
    imageAlt: 'QC Process',
  },
  {
    title: 'Vendor Performance Matrix',
    description:
      'Vendors are scored across key metrics—quality, delivery, responsiveness and more.',
    imageUrl: '/images/vms_performance_matrix.webp',
    imageAlt: 'Vendor Performance Matrix',
  },
  {
    title: 'Payment Management',
    description:
      'Vendors see their own payment status and history without chasing your team.',
    imageUrl: '/images/vms_payment_management.webp',
    imageAlt: 'Payment Management',
  },
];

/**
 * The outcome showcase's three tabs.
 *
 * No video is seeded. All three share one placeholder clip today - a file
 * borrowed from the POS page - and seeding that would record a stand-in as
 * though it were this page's content. Absent means the site keeps playing its
 * own until a real film is uploaded through the panel.
 */
const OUTCOME_VIDEOS = [
  {
    label: 'VMS',
    badge: 'UpWon VMS',
    duration: '2:15',
    title: 'Connected vendor management',
    description:
      'See how UpWon brings vendors, procurement, and business workflows together in one connected system.',
    buttonLabel: 'Read case study',
    buttonHref: '/resources',
  },
  {
    label: 'Vendor Self-Service',
    badge: 'Vendor Self-Service',
    duration: '1:42',
    title: 'Faster vendor collaboration',
    description:
      'Give vendors a simple self-service experience while keeping every interaction visible to your team.',
    buttonLabel: 'Read case study',
    buttonHref: '/resources',
  },
  {
    label: 'Procurement Intelligence',
    badge: 'Procurement Intelligence',
    duration: '2:08',
    title: 'Smarter procurement decisions',
    description:
      'Turn vendor and procurement data into clearer insights, stronger decisions, and better business visibility.',
    buttonLabel: 'Read case study',
    buttonHref: '/resources',
  },
];

/**
 * The questions procurement and sourcing leads ask before adopting a vendor
 * platform - adoption, scope, integration, scoring and confidentiality, which
 * is the editorial point of the list.
 */
const FAQ_ENTRIES = [
  {
    question: 'Will our existing vendors actually use a self-service portal?',
    answer:
      'Yes. The portal is designed for vendors, not just procurement teams. Vendors get a simple workspace to manage their profile, submit documents, respond to RFQs, update pricing, track purchase orders and invoices, and respond to requests without needing extensive training. The experience is kept focused so suppliers can get started quickly.',
  },
  {
    question: 'Can we start with just our top 20 vendors?',
    answer:
      'Absolutely. You can start with a focused group of strategic or high-value vendors, prove the workflow, and expand from there. Existing vendor records, documents, contracts and transaction history can continue to build into the same system as you onboard more suppliers.',
  },
  {
    question: "Does this integrate with our existing ERP if we're not on UpWon ERP?",
    answer:
      'Yes. UpWon VMS can operate independently and connect with your existing ERP environment. Vendor, item, purchase order, pricing and transaction data can be connected through APIs and integration workflows, so you do not need to replace your ERP to start improving vendor management.',
  },
  {
    question: 'How does vendor quality scoring actually work — is it manual or automatic?',
    answer:
      'It can use both. Operational data such as delivery performance, rejection rates, quality issues, response times and purchase history can contribute to vendor performance scores automatically, while procurement teams can add structured assessments where human judgement is required. This creates a more consistent scorecard without removing buyer oversight.',
  },
  {
    question: 'Is our rate contract and pricing data visible to anyone outside our team?',
    answer:
      'No. Pricing, rate contracts, commercial terms and vendor information are protected through role-based access controls. Your procurement team decides who can view or manage sensitive commercial information, while vendors only see the information and transactions relevant to their relationship with your business.',
  },
  {
    question: 'What support do vendors get if they struggle with the portal?',
    answer:
      'Vendors get a guided digital experience with clear workflows and support resources to help them complete common tasks. Your procurement team also has visibility into onboarding progress and can identify vendors who need assistance, making adoption easier without turning every supplier question into a manual process.',
  },
];

/**
 * The closing band. A photograph with a phone crop of its own and two
 * buttons, both of which draw the same arrow - so unlike the WMS band there
 * are no icon names to store.
 */
const CTA_SECTION = {
  imageUrl: '/images/vms_final_cta.webp',
  mobileImageUrl: '/images/vms_cta_mobile.webp',
  primaryLabel: 'Talk to a Procurement Specialist',
  primaryHref: '#contact',
  secondaryLabel: 'See How This Fits Your Vendor Base',
  secondaryHref: '#vendor-base',
};

export async function seedVendorPortalPage(client: PoolClient): Promise<{
  heroSlides: number;
  proofTiles: number;
  capabilityCards: number;
  outcomeVideos: number;
  faqEntries: number;
  ctaSection: number;
}> {
  let heroSlides = 0;
  let proofTiles = 0;
  let capabilityCards = 0;
  let outcomeVideos = 0;
  let faqEntries = 0;
  let ctaSection = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM vms_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO vms_hero_slides
        (eyebrow, headline, subhead,
         cta_label, cta_href, secondary_label, secondary_href,
         image_url, display_order, status)
      SELECT u.eyebrow, u.headline, u.subhead, $5, $6, $7, $8,
             u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $9::int[])
          AS u(eyebrow, headline, subhead, image_url, position)
      `,
      [
        HERO_SLIDES.map((s) => s.eyebrow),
        HERO_SLIDES.map((s) => s.headline),
        HERO_SLIDES.map((s) => s.subhead),
        HERO_SLIDES.map((s) => s.imageUrl),
        CTA.label,
        CTA.href,
        SECONDARY.label,
        SECONDARY.href,
        HERO_SLIDES.map((_, index) => index),
      ],
    );
    heroSlides = result.rowCount ?? 0;
  }

  const existingTiles = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM vms_proof_tiles',
  );
  if (Number(existingTiles.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO vms_proof_tiles
        (kind, col_span, icon, value, direction, title, description,
         image_url, image_alt, display_order, status)
      SELECT u.kind, u.col_span, u.icon, u.value, u.direction, u.title, u.description,
             u.image_url, u.image_alt, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::int[], $3::text[], $4::text[], $5::text[],
                    $6::text[], $7::text[], $8::text[], $9::text[], $10::int[])
          AS u(kind, col_span, icon, value, direction, title, description,
               image_url, image_alt, position)
      `,
      [
        PROOF_TILES.map((t) => t.kind),
        PROOF_TILES.map((t) => t.colSpan),
        PROOF_TILES.map((t) => t.icon ?? null),
        PROOF_TILES.map((t) => t.value ?? null),
        PROOF_TILES.map((t) => t.direction ?? null),
        PROOF_TILES.map((t) => t.title ?? null),
        PROOF_TILES.map((t) => t.description ?? null),
        PROOF_TILES.map((t) => t.imageUrl ?? null),
        PROOF_TILES.map((t) => t.imageAlt ?? null),
        PROOF_TILES.map((_, index) => index),
      ],
    );
    proofTiles = result.rowCount ?? 0;
  }

  const existingCards = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM vms_capability_cards',
  );
  if (Number(existingCards.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO vms_capability_cards
        (title, description, image_url, image_alt, display_order, status)
      SELECT u.title, u.description, u.image_url, u.image_alt, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
          AS u(title, description, image_url, image_alt, position)
      `,
      [
        CAPABILITY_CARDS.map((c) => c.title),
        CAPABILITY_CARDS.map((c) => c.description),
        CAPABILITY_CARDS.map((c) => c.imageUrl),
        CAPABILITY_CARDS.map((c) => c.imageAlt),
        CAPABILITY_CARDS.map((_, index) => index),
      ],
    );
    capabilityCards = result.rowCount ?? 0;
  }

  const existingVideos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM vms_outcome_videos',
  );
  if (Number(existingVideos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO vms_outcome_videos
        (label, badge, duration, title, description,
         button_label, button_href, display_order, status)
      SELECT u.label, u.badge, u.duration, u.title, u.description,
             u.button_label, u.button_href, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                    $6::text[], $7::text[], $8::int[])
          AS u(label, badge, duration, title, description,
               button_label, button_href, position)
      `,
      [
        OUTCOME_VIDEOS.map((v) => v.label),
        OUTCOME_VIDEOS.map((v) => v.badge),
        OUTCOME_VIDEOS.map((v) => v.duration),
        OUTCOME_VIDEOS.map((v) => v.title),
        OUTCOME_VIDEOS.map((v) => v.description),
        OUTCOME_VIDEOS.map((v) => v.buttonLabel),
        OUTCOME_VIDEOS.map((v) => v.buttonHref),
        OUTCOME_VIDEOS.map((_, index) => index),
      ],
    );
    outcomeVideos = result.rowCount ?? 0;
  }

  const existingFaqs = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM vms_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO vms_faq_entries (question, answer, display_order, status)
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
    'SELECT COUNT(*) AS count FROM vms_cta_section',
  );
  if (Number(existingCta.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO vms_cta_section
        (singleton, image_url, mobile_image_url,
         primary_label, primary_href, secondary_label, secondary_href)
      VALUES (TRUE, $1, $2, $3, $4, $5, $6)
      `,
      [
        CTA_SECTION.imageUrl,
        CTA_SECTION.mobileImageUrl,
        CTA_SECTION.primaryLabel,
        CTA_SECTION.primaryHref,
        CTA_SECTION.secondaryLabel,
        CTA_SECTION.secondaryHref,
      ],
    );
    ctaSection = result.rowCount ?? 0;
  }

  return { heroSlides, proofTiles, capabilityCards, outcomeVideos, faqEntries, ctaSection };
}
