// src/database/seeds/wms.seed.ts

import { PoolClient } from 'pg';

/**
 * The WMS product page, exactly as it renders today: the five hero slides,
 * the proof row, the seven warehouse-type cards, the seven capability bands,
 * the six FAQ questions and the closing band with its trust strip.
 *
 * The copy that heads each of those is seeded alongside the other pages' in
 * seed.ts, under ('wms', 'proof'), ('wms', 'recognition'),
 * ('wms', 'capabilities'), ('wms', 'faq') and ('wms', 'cta').
 *
 * The rest of the page - the category depth - is still the copy the site
 * ships, and arrives here as each section's tables are built.
 */

const CTA = { label: 'Talk to a Warehouse Specialist', href: '/demo' };
const SECONDARY = { label: 'Watch 2-Min Product Tour', href: '/resources' };
const MICRO_TRUST =
  '99.4% stock accuracy and zero expiry-related dispatch errors after go-live.';

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
    eyebrow: 'More Powerful, More Advanced',
    headline: 'UpWon WMS — More Powerful & More Advanced',
    subhead:
      'A food-grade WMS engineered around batch and shelf life — FEFO, cold-chain zones and lot traceability, not a fashion-warehouse tool bent to fit.',
    imageUrl: '/images/more_advance.webp',
  },
  {
    eyebrow: 'Optimum Space Utilization',
    headline: 'Optimum Space Utilization — More Profits',
    subhead:
      'Suggested-bin put-away and zone logic pack every rack tighter — more stock in the same footprint, more margin per square foot.',
    imageUrl: '/images/more_profit.webp',
  },
  {
    eyebrow: 'Employee Work Tracking',
    headline: 'Employee Work Tracking — More Productivity',
    subhead:
      'Task-level visibility on every picker and put-away move — measure throughput, cut idle time and lift output per shift.',
    imageUrl: '/images/more_productivity.webp',
  },
  {
    eyebrow: 'Expiry Intelligence',
    headline: "Know Exactly What's About to Expire — Before It Does.",
    subhead:
      'FEFO enforced automatically — oldest stock moves first, every time — with expiry alerts before product turns into a write-off.',
    imageUrl: '/images/before_it_does.webp',
  },
  {
    eyebrow: 'Batch & Shelf Life',
    headline: 'Built Around Batch and Shelf Life — Not Just SKU Counts.',
    subhead:
      'Every batch traceable from raw material to dispatch, cold-chain zones monitored — not just labelled.',
    imageUrl: '/images/sku_counts.webp',
  },
];

/**
 * The questions a warehouse or plant head asks before committing - rollout,
 * integration, hardware and FEFO enforcement, which is the editorial point of
 * the list.
 */
const FAQ_ENTRIES = [
  {
    question: 'Does this handle multiple temperature zones in one warehouse?',
    answer:
      'Yes. UPWON WMS can manage inventory across ambient, chilled, frozen and other defined storage zones within the same warehouse. Stock movements, storage locations and operational rules can be configured around each zone so teams always know where inventory belongs.',
  },
  {
    question: 'Can we roll this out warehouse by warehouse instead of all at once?',
    answer:
      'Absolutely. You can begin with one warehouse or plant, stabilise the processes and workflows, and then expand to additional locations in phases. This reduces operational risk and allows your team to build confidence before a wider rollout.',
  },
  {
    question: "Does it integrate with our existing ERP if we're not on UPWON ERP?",
    answer:
      'Yes. UPWON WMS is designed to connect with existing ERP and business systems through configurable integrations and APIs. You do not need to replace your current ERP to improve warehouse operations — the WMS can exchange the required inventory, order and movement data with your existing systems.',
  },
  {
    question: 'What hardware do we need for barcode or RFID operations?',
    answer:
      'The exact setup depends on your workflow, but most barcode operations require compatible handheld scanners, mobile devices or fixed scanning points along with label printers where needed. For RFID, compatible RFID readers and tags are required. We help define the hardware setup based on your warehouse process and tracking requirements.',
  },
  {
    question: 'How is FEFO actually enforced — automatically, or as a suggestion?',
    answer:
      'FEFO rules can be configured into the operational workflow so the system identifies the stock with the earliest eligible expiry for allocation and picking. Depending on your process controls, the recommended stock can be enforced through validation rather than treated as only a manual suggestion, helping reduce expiry-related errors.',
  },
  {
    question: 'Can we go live in one plant first and expand later?',
    answer:
      'Yes. A single-plant go-live is a practical way to validate master data, integrations, scanning workflows and team adoption in a live environment. Once the process is stable, the same foundation can be extended to additional plants, warehouses and depots without starting the implementation again.',
  },
];

/**
 * The proof row - three cards, each flipping through its own three stat
 * images every few seconds.
 *
 * The label is the admin-side name for the column and is never rendered; the
 * alt text is, to a screen reader, because every figure on this row is inside
 * the artwork.
 */
const PROOF_CARDS: Array<{
  label: string;
  slides: Array<{ imageUrl: string; alt: string }>;
}> = [
  {
    label: 'Put-away',
    slides: [
      {
        imageUrl: '/images/put_away.webp',
        alt: '70% faster put-away via the suggested-bin engine.',
      },
      {
        imageUrl: '/images/dock_to_stock.webp',
        alt: 'Dock-to-stock in minutes rather than hours.',
      },
      { imageUrl: '/images/wastage.webp', alt: 'Lower wastage across perishable stock.' },
    ],
  },
  {
    label: 'Expiry errors',
    slides: [
      {
        imageUrl: '/images/fullfillment.webp',
        alt: 'Higher order fulfilment accuracy after barcode rollout.',
      },
      {
        imageUrl: '/images/expiry_errors.webp',
        alt: 'Zero expiry-related dispatch errors after FEFO enforcement.',
      },
      {
        imageUrl: '/images/tracability.webp',
        alt: 'Full batch traceability from raw material to dispatch.',
      },
    ],
  },
  {
    label: 'Multi-site',
    slides: [
      {
        imageUrl: '/images/stock_accuracy.webp',
        alt: '99.4% stock accuracy after the barcode rollout.',
      },
      {
        imageUrl: '/images/multi_site.webp',
        alt: 'Live multi-plant, multi-depot inventory in real time.',
      },
      {
        imageUrl: '/images/shelf_life.webp',
        alt: 'Shelf-life visibility across every batch in stock.',
      },
    ],
  },
];

/**
 * The warehouse-type map - seven cards, four across and then three, each an
 * illustration over the kind of warehouse it stands for and a line about it.
 *
 * The illustration is stored as a site-relative path, the same way the hero
 * slides and proof slides ship theirs; an administrator replacing one uploads
 * a file instead and the path is swapped for a file id.
 */
const RECOGNITION_CARDS: Array<{
  title: string;
  description: string;
  imageUrl: string;
}> = [
  {
    title: 'Cold Storage & Dairy',
    description: 'End-to-end visibility for temperature-controlled inventory and compliance.',
    imageUrl: '/images/cold_storage.webp',
  },
  {
    title: 'Bakery & Confectionery FG Warehousing',
    description: 'Track batches, shelf-life and FEFO for finished goods seamlessly.',
    imageUrl: '/images/bakeryandconf.webp',
  },
  {
    title: 'Raw Material & Stores',
    description: 'Streamline GRN, inward, stock control and material availability.',
    imageUrl: '/images/raw_material.webp',
  },
  {
    title: 'Multi-Plant Distribution Warehousing',
    description: 'Centralized inventory visibility across plants and regional DCs.',
    imageUrl: '/images/multi_plant_distribution.webp',
  },
  {
    title: 'WIP / In-Process Storage',
    description: 'Track, manage and move WIP across stages with precision.',
    imageUrl: '/images/wip_process_storage.webp',
  },
  {
    title: 'Bonded / Import-Export Warehouse',
    description: 'Ensure compliance with customs, bonded flows and documentation.',
    imageUrl: '/images/import_export.webp',
  },
  {
    title: 'Co-Packer / 3PL-Managed Warehouse',
    description: 'Operate efficiently with client-wise segregation and SLA tracking.',
    imageUrl: '/images/co_packer.webp',
  },
];

/**
 * The capability stack - seven bands from the receiving dock to the dispatch
 * bay, each a heading and a paragraph beside that capability's artwork, the
 * sides alternating down the page.
 *
 * No alt text seeded: the site falls back to the band's title, which is what
 * the shipped component does today, and the heading and paragraph beside the
 * picture already say what the capability is.
 */
const CAPABILITY_MODULES: Array<{
  title: string;
  description: string;
  imageUrl: string;
}> = [
  {
    title: 'Picking & Packing',
    description:
      'Web and mobile-guided workflows for faster, more accurate order fulfilment. Guide every picker through the right steps, from item selection to final packing. Reduce errors, speed up dispatch, and keep every order moving efficiently.',
    imageUrl: '/images/picking_and_packing.webp',
  },
  {
    title: 'Inventory Visibility',
    description:
      'Real-time stock across every location, not a weekly count. See exactly what is available, where it is stored, and how inventory is moving. Make faster decisions with accurate, up-to-date visibility across your entire network.',
    imageUrl: '/images/inventry_visibility.webp',
  },
  {
    title: 'Shipping & Returns',
    description:
      'Optimised dispatch and return handling in one connected workflow. Streamline every shipment from order confirmation to final delivery and return receipt. Reduce delays, simplify reverse logistics, and keep every movement fully traceable.',
    imageUrl: '/images/shipping_and_returns.webp',
  },
  {
    title: 'Reporting & Analytics',
    description:
      'Warehouse performance and inventory trends, always current. Track key metrics, monitor stock movement, and uncover trends as they happen. Turn real-time operational data into clear insights for faster, smarter decisions.',
    imageUrl: '/images/reporting_and_analytics.webp',
  },
  {
    title: 'Multilocation Integration',
    description:
      'Stock synchronised across every plant and depot. Manage inventory, transfers, and movements across all locations from one connected system. Keep every site aligned with accurate stock data and complete operational visibility.',
    imageUrl: '/images/multilocation_integration.webp',
  },
  {
    title: 'Barcode & RFID',
    description:
      'Faster, more accurate tracking at every inventory movement. Capture stock movements instantly with barcode scanning and RFID-enabled workflows. Reduce manual errors, improve traceability, and maintain accurate inventory at every step.',
    imageUrl: '/images/barcode_rifid.webp',
  },
  {
    title: 'Scalability & Customisation',
    description:
      'The system adapts as your warehouse network grows. Configure workflows, processes, and features around the way your operations work. Scale seamlessly across new locations, users, and evolving business requirements.',
    imageUrl: '/images/scalability_cust.webp',
  },
];

/**
 * The customer-outcomes row - five cards, each a pictogram, the figure it
 * claims, what that figure measures and how the system gets there.
 *
 * The accent alternates orange and blue down the row. It reaches exactly one
 * element today, the rule that grows along the card's bottom edge on hover.
 */
const OUTCOME_CARDS: Array<{
  icon: string;
  stat: string;
  title: string;
  description: string;
  accent: string;
}> = [
  {
    icon: 'PackageOpen',
    stat: '15–20%',
    title: 'Less Wastage',
    description:
      'Better inventory control and FEFO execution help reduce expiry losses and write-offs.',
    accent: 'orange',
  },
  {
    icon: 'Target',
    stat: '20–35%',
    title: 'Better Fulfilment Accuracy',
    description:
      'Fewer picking errors and real-time stock visibility help improve order accuracy.',
    accent: 'blue',
  },
  {
    icon: 'Clock3',
    stat: '30–40%',
    title: 'Faster Order Processing',
    description:
      'Automated workflows and smart allocation help reduce overall order cycle time.',
    accent: 'orange',
  },
  {
    icon: 'ClipboardList',
    stat: '99%+',
    title: 'Inventory Visibility',
    description:
      'Real-time tracking across locations provides clear and accurate stock visibility.',
    accent: 'blue',
  },
  {
    icon: 'ChartNoAxesCombined',
    stat: '10–15%',
    title: 'Higher Space Utilization',
    description:
      'Intelligent slotting and warehouse optimization improve storage efficiency.',
    accent: 'orange',
  },
];

/**
 * The closing band. A photograph with a phone crop of its own, two buttons
 * each carrying an icon, and the four reassurances under them.
 */
const CTA_SECTION = {
  imageUrl: '/images/wms_CTA.webp',
  mobileImageUrl: '/images/wms_cta_mb.webp',
  primaryLabel: 'Talk to a Warehouse Specialist',
  primaryHref: '/demo',
  primaryIcon: 'CalendarDays',
  secondaryLabel: 'See How This Fits Your Warehouse',
  secondaryHref: '/contact',
  secondaryIcon: 'Package',
};

/** Each is an icon over two short lines, drawn one above the other. */
const CTA_TRUST_ITEMS = [
  { icon: 'Package', lineOne: 'Built for modern', lineTwo: 'warehouse operations' },
  { icon: 'ShieldCheck', lineOne: 'Accurate, traceable', lineTwo: 'inventory control' },
  { icon: 'Lock', lineOne: 'Your warehouse data', lineTwo: 'safe and secure' },
  { icon: 'Clock', lineOne: 'Real warehouse insights', lineTwo: 'in just 30 minutes' },
];

export async function seedWmsPage(client: PoolClient): Promise<{
  heroSlides: number;
  proofCards: number;
  proofSlides: number;
  recognitionCards: number;
  capabilityModules: number;
  outcomeCards: number;
  faqEntries: number;
  ctaSection: number;
  ctaTrustItems: number;
}> {
  let heroSlides = 0;
  let proofCards = 0;
  let proofSlides = 0;
  let recognitionCards = 0;
  let capabilityModules = 0;
  let outcomeCards = 0;
  let faqEntries = 0;
  let ctaSection = 0;
  let ctaTrustItems = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM wms_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO wms_hero_slides
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

  const existingCards = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM wms_proof_cards',
  );
  if (Number(existingCards.rows[0].count) === 0) {
    for (const [index, card] of PROOF_CARDS.entries()) {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO wms_proof_cards (label, display_order, status)
        VALUES ($1, $2, 'ACTIVE')
        RETURNING id
        `,
        [card.label, index],
      );
      proofCards += inserted.rowCount ?? 0;

      const slides = await client.query(
        `
        INSERT INTO wms_proof_slides (card_id, image_url, alt, display_order, status)
        SELECT $1, u.image_url, u.alt, u.position, 'ACTIVE'
          FROM unnest($2::text[], $3::text[], $4::int[]) AS u(image_url, alt, position)
        `,
        [
          inserted.rows[0].id,
          card.slides.map((s) => s.imageUrl),
          card.slides.map((s) => s.alt),
          card.slides.map((_, position) => position),
        ],
      );
      proofSlides += slides.rowCount ?? 0;
    }
  }

  const existingRecognition = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM wms_recognition_cards',
  );
  if (Number(existingRecognition.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO wms_recognition_cards
        (title, description, image_url, display_order, status)
      SELECT u.title, u.description, u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(title, description, image_url, position)
      `,
      [
        RECOGNITION_CARDS.map((c) => c.title),
        RECOGNITION_CARDS.map((c) => c.description),
        RECOGNITION_CARDS.map((c) => c.imageUrl),
        RECOGNITION_CARDS.map((_, index) => index),
      ],
    );
    recognitionCards = result.rowCount ?? 0;
  }

  const existingCapabilities = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM wms_capability_modules',
  );
  if (Number(existingCapabilities.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO wms_capability_modules
        (title, description, image_url, display_order, status)
      SELECT u.title, u.description, u.image_url, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(title, description, image_url, position)
      `,
      [
        CAPABILITY_MODULES.map((m) => m.title),
        CAPABILITY_MODULES.map((m) => m.description),
        CAPABILITY_MODULES.map((m) => m.imageUrl),
        CAPABILITY_MODULES.map((_, index) => index),
      ],
    );
    capabilityModules = result.rowCount ?? 0;
  }

  const existingOutcomes = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM wms_outcome_cards',
  );
  if (Number(existingOutcomes.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO wms_outcome_cards
        (icon, stat, title, description, accent, display_order, status)
      SELECT u.icon, u.stat, u.title, u.description, u.accent, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::int[])
          AS u(icon, stat, title, description, accent, position)
      `,
      [
        OUTCOME_CARDS.map((c) => c.icon),
        OUTCOME_CARDS.map((c) => c.stat),
        OUTCOME_CARDS.map((c) => c.title),
        OUTCOME_CARDS.map((c) => c.description),
        OUTCOME_CARDS.map((c) => c.accent),
        OUTCOME_CARDS.map((_, index) => index),
      ],
    );
    outcomeCards = result.rowCount ?? 0;
  }

  const existingFaqs = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM wms_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO wms_faq_entries (question, answer, display_order, status)
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
    'SELECT COUNT(*) AS count FROM wms_cta_section',
  );
  if (Number(existingCta.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO wms_cta_section
        (singleton, image_url, mobile_image_url,
         primary_label, primary_href, primary_icon,
         secondary_label, secondary_href, secondary_icon)
      VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        CTA_SECTION.imageUrl,
        CTA_SECTION.mobileImageUrl,
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
    'SELECT COUNT(*) AS count FROM wms_cta_trust_items',
  );
  if (Number(existingTrust.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO wms_cta_trust_items (icon, line_one, line_two, display_order, status)
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

  return {
    heroSlides,
    proofCards,
    proofSlides,
    recognitionCards,
    capabilityModules,
    outcomeCards,
    faqEntries,
    ctaSection,
    ctaTrustItems,
  };
}
