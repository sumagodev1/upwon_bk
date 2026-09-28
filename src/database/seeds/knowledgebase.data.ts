// src/database/seeds/knowledgebase.data.ts

/**
 * The /knowledgebase content the website previously held as static data, so
 * the pages render identically the moment they start reading from the API,
 * and the admin panel shows today's content from its first run. Sources, on
 * the website:
 *
 *   hero        HERO_SLIDES in src/pages/Knowledgebase/KnowledgebasePage.jsx -
 *               the one slide's eyebrow, headline, subhead and backdrop (its
 *               two buttons, and where they go, stay in the page's code)
 *   categories  KB_CATEGORIES in src/data/knowledgebase.js - the slug kept, and
 *               the lucide component becomes its name
 *   articles    KB_ARTICLES in src/data/knowledgebase.js - every article,
 *               bodies and FAQs verbatim
 *
 * Every string below is verbatim, curly quotes and dashes included: a seed
 * that "tidied" the copy would show up as a diff on the live page the first
 * time it is run. The articles were converted mechanically from
 * data/knowledgebase.js, not retyped. The keys are renamed to the columns they
 * fill (headline -> heading, subhead -> subtext, bg -> imageUrl, category ->
 * categorySlug, an FAQ's q / a -> question / answer), a quote block with no
 * attribution gets the explicit `cite: null` the body's shape carries, and
 * updatedOn is the article's dateModified (its datePublished when it has
 * none) - the one date the site prints. Nothing else changes.
 *
 * Not seeded, because nothing stores them: a category's or an article's
 * search description and keywords, an article's datePublished, and its
 * hand-picked `related` list - the API derives related guides instead (see
 * articlesRepository.findPublishedRelatedCards). Nor the hero's accent colour,
 * which stays in the page's code, or a phone crop (mobile_image_file_id) - the
 * page has none, so the seeded slide serves its one picture at every width
 * until somebody uploads one.
 *
 * imageUrl fills kb_hero_slides.image_url, which is legacy / seed-only: the
 * admin API takes a picture as an upload and never writes a URL into it, and
 * this picture - the Unsplash photograph the hub has always used - has no
 * uploaded file behind it, so the seed is the only place it comes from. The
 * slide's first upload replaces it.
 *
 * Kept apart from seed.ts because the article bodies alone run to hundreds of
 * lines, which would bury the seed logic they feed.
 */

export interface SeedKbHeroSlide {
  eyebrow: string;
  heading: string;
  subtext: string;
  /** The seeded backdrop (image_url - legacy / seed-only, see above). */
  imageUrl: string;
}

export interface SeedKbCategory {
  slug: string;
  name: string;
  description: string;
  /** A name from KB_CATEGORY_ICON_NAMES (modules/knowledgebase/utils/icons.ts). */
  icon: string;
}

/** The four block shapes data/knowledgebase.js uses - the blog body's. */
export type SeedKbBodyBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string; cite: string | null };

export interface SeedKbFaq {
  question: string;
  answer: string;
}

export interface SeedKbArticle {
  slug: string;
  /** The slug of one of KB_CATEGORIES - resolved to its id on insert. */
  categorySlug: string;
  title: string;
  excerpt: string;
  readTime: string;
  /** 'YYYY-MM-DD'. */
  updatedOn: string;
  body: SeedKbBodyBlock[];
  faqs: SeedKbFaq[];
}

/**
 * The hub's one hero slide. The headline is plain text - HeroSlider splits it
 * on an em-dash, and this one has none - so there is no markup to add. The
 * backdrop is HERO_BG, the Unsplash URL the page has always used; its two
 * buttons are not seeded, because they are fixed in KnowledgebasePage.jsx.
 */
export const KB_HERO_SLIDES: SeedKbHeroSlide[] = [
  {
    eyebrow: 'KNOWLEDGEBASE',
    heading: 'Operations Guides for Food & FMCG Teams.',
    subtext:
      'Practical, vendor-neutral guides on inventory, compliance and distribution — written by the team that implements UpWon.',
    imageUrl:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=60',
  },
];

/** The three cards, in the order the hub draws them. */
export const KB_CATEGORIES: SeedKbCategory[] = [
  {
    slug: 'inventory-management',
    name: 'Inventory Management',
    description:
      'Real-time stock control, FEFO/FIFO, expiry and multi-warehouse visibility for perishable food and FMCG inventory.',
    icon: 'Boxes',
  },
  {
    slug: 'compliance',
    name: 'Compliance & Food Safety',
    description:
      'FSSAI, GST, e-invoicing and batch-traceability workflows that keep food manufacturers audit-ready.',
    icon: 'ShieldCheck',
  },
  {
    slug: 'distribution',
    name: 'Distribution & Sales',
    description:
      'Beat planning, secondary-sales capture, distributor stock visibility and scheme control for FMCG distribution.',
    icon: 'Truck',
  },
];

/**
 * Every article, in data/knowledgebase.js's own order. That order is not the
 * site's: a category page sorts by updatedOn, newest first, and so does every
 * read of the table.
 */
export const KB_ARTICLES: SeedKbArticle[] = [
  {
    slug: 'how-to-track-stock',
    categorySlug: 'inventory-management',
    title: 'How to Track Stock in Real Time Across Plants and Warehouses',
    excerpt:
      'Month-end stock surprises come from a single root cause: stock that is recorded after it moves, not as it moves. Here is how to close that gap.',
    readTime: '6 min read',
    updatedOn: '2026-02-04',
    body: [
      {
        type: 'p',
        text:
          'If you only learn your true stock position at month-end, you are not tracking inventory — you are reconstructing it. For perishable food and high-velocity FMCG, that lag is where wastage, stockouts and write-offs hide.',
      },
      { type: 'h2', text: 'Record stock as it moves, not after' },
      {
        type: 'p',
        text:
          'The fix is to capture every movement at the point it happens — goods receipt at the gate, putaway to a bin, picking, dispatch — on a scanner, so the system position always matches the physical position.',
      },
      {
        type: 'ul',
        items: [
          'Scan-based GRN at inward, tied to the purchase order',
          'Putaway confirmation to a specific bin or zone',
          'FEFO-enforced picking so the oldest batch leaves first',
          'Dispatch confirmation with batch + quantity',
        ],
      },
      { type: 'h2', text: 'Make it batch- and expiry-aware' },
      {
        type: 'p',
        text:
          'A quantity number alone is not enough for food. You need to know which batch, with which expiry, sits in which location — so near-expiry stock surfaces daily instead of as a month-end write-off.',
      },
      {
        type: 'quote',
        text:
          'You cannot manage what you can only see 30 days late. Live stock is the difference between deciding and reacting.',
        cite: null,
      },
      { type: 'h2', text: 'Roll it up across locations' },
      {
        type: 'p',
        text:
          'Once each plant and warehouse records movement live, a single multi-warehouse view shows total available-to-promise stock by SKU and batch — the foundation for accurate planning, procurement and dispatch.',
      },
    ],
    faqs: [
      {
        question: 'What is real-time stock tracking?',
        answer:
          'Recording every inventory movement (receipt, putaway, pick, dispatch) at the moment it happens — usually via a scanner — so the system stock position always matches the physical stock, instead of being reconciled at month-end.',
      },
      {
        question: 'How does batch-level tracking reduce wastage?',
        answer:
          'It surfaces near-expiry stock daily and enforces FEFO at picking, so older batches ship first and fewer units expire on the shelf.',
      },
    ],
  },
  {
    slug: 'what-is-fefo',
    categorySlug: 'inventory-management',
    title: 'What Is FEFO and Why It Matters for Food Inventory',
    excerpt:
      'FEFO sounds obvious, yet most food ERPs only report on it. Enforcement at the scanner is what actually stops expiry write-offs.',
    readTime: '5 min read',
    updatedOn: '2026-01-20',
    body: [
      {
        type: 'p',
        text:
          'FEFO — First Expiry, First Out — means the batch that expires soonest is dispatched first. It sounds obvious enough that you would assume every food ERP enforces it. Most do not. They report on it. They alert on it. They do not strictly prevent a picker from grabbing a newer batch while older stock waits to expire.',
      },
      { type: 'h2', text: 'FEFO vs FIFO' },
      {
        type: 'p',
        text:
          'FIFO (First In, First Out) ships the oldest received batch first. That works for non-perishables, but a batch received earlier can have a later expiry. For food, expiry date — not receipt date — is what matters, which is exactly what FEFO optimises for.',
      },
      { type: 'h2', text: 'Reporting FEFO vs enforcing FEFO' },
      {
        type: 'p',
        text:
          'The difference that moves numbers is enforcement at the scanner. If a picker scans an out-of-FEFO batch, the app should reject the pick and show the correct one — no override without a documented reason and a manager approval.',
      },
      {
        type: 'ul',
        items: [
          'Expiry alerts at 7 / 15 / 30-day windows',
          'Quarantine workflow for near-expiry stock',
          'Hard FEFO enforcement at picking, not just on the picklist',
        ],
      },
      {
        type: 'quote',
        text:
          'If a vendor talks about FEFO as a "report" rather than an "enforcement," that is a red flag.',
        cite: null,
      },
    ],
    faqs: [
      {
        question: 'What does FEFO stand for?',
        answer:
          'First Expiry, First Out — the inventory rule that the batch with the earliest expiry date is picked and dispatched first.',
      },
      {
        question: 'Is FEFO better than FIFO for food?',
        answer:
          'Yes. FIFO uses receipt order, but a batch received earlier can expire later. FEFO uses expiry order, which is what matters for perishable food, so it minimises write-offs.',
      },
    ],
  },
  {
    slug: 'fssai-compliance-checklist',
    categorySlug: 'compliance',
    title: 'FSSAI Compliance Checklist for Food Manufacturers',
    excerpt:
      'FSSAI inspections have shifted to unannounced, risk-based audits. This checklist is what audit-ready actually looks like.',
    readTime: '7 min read',
    updatedOn: '2026-02-10',
    body: [
      {
        type: 'p',
        text:
          'FSSAI inspections increasingly arrive unannounced and demand batch traceability proof within minutes. Audit-readiness is no longer a once-a-year exercise — it is a daily state. Here is the working checklist.',
      },
      { type: 'h2', text: 'Licensing & renewals' },
      {
        type: 'ul',
        items: [
          'Valid FSSAI license for every premises and activity',
          'Renewal alerts at 90 / 60 / 30-day windows',
          'Product approvals mapped to the licensed categories',
        ],
      },
      { type: 'h2', text: 'Traceability & recall' },
      {
        type: 'ul',
        items: [
          'Batch-level traceability from raw lot to finished good',
          'One-click identification of affected stock for recall',
          'Allergen flags propagated through every BOM',
        ],
      },
      { type: 'h2', text: 'Documentation' },
      {
        type: 'p',
        text:
          'The single biggest audit accelerator is a document vault that surfaces the right paperwork by batch ID — turning a 24-48 hour paper-chase into one query, one PDF, one click.',
      },
      {
        type: 'quote',
        text: 'Compliance should live in the system — not in a senior employee’s head.',
        cite: null,
      },
    ],
    faqs: [
      {
        question: 'How often must an FSSAI license be renewed?',
        answer:
          'FSSAI licenses are issued for 1 to 5 years and must be renewed before expiry. Set renewal alerts at 90, 60 and 30 days so a lapse never triggers a compliance gap or production stoppage.',
      },
      {
        question: 'What does batch traceability mean for FSSAI audits?',
        answer:
          'It is the ability to trace any finished-goods batch back to its raw-material lot, vendor and production shift — and forward to where it was dispatched — within minutes, which is what risk-based inspections now demand.',
      },
    ],
  },
  {
    slug: 'capture-secondary-sales',
    categorySlug: 'distribution',
    title: 'How to Capture Secondary Sales in Real Time',
    excerpt:
      'Primary sales tell you what you billed. Secondary sales tell you what actually sold. Closing that gap is the highest-leverage move in distribution.',
    readTime: '6 min read',
    updatedOn: '2026-02-08',
    body: [
      {
        type: 'p',
        text:
          'Primary sales — what you billed to distributors — is what most FMCG companies can see. Secondary sales — what distributors actually sold through to retailers — is what they win or lose on. The gap between the two is usually 30 days of blind guesswork.',
      },
      { type: 'h2', text: 'Capture at the outlet, on mobile' },
      {
        type: 'p',
        text:
          'The move is to capture retailer-level sales on a mobile app at the point of the visit, so the visibility window collapses from monthly to same-day.',
      },
      {
        type: 'ul',
        items: [
          'Beat plans assigning the right outlets to the right rep',
          'Order booking with live inventory and scheme application',
          'GPS-tagged outlet check-in for beat compliance',
          'Distributor stock visible SKU-wise, live',
        ],
      },
      { type: 'h2', text: 'Turn the data into discipline' },
      {
        type: 'p',
        text:
          'Real-time data only pays off when paired with disciplined review — weekly beat-plan meetings, every territory, every rep. Tools surface the gaps; the operating rhythm closes them.',
      },
      {
        type: 'quote',
        text: 'Secondary sales visible same day — not on the 10th of next month.',
        cite: null,
      },
    ],
    faqs: [
      {
        question: 'What is the difference between primary and secondary sales?',
        answer:
          'Primary sales are what a company bills to its distributors. Secondary sales are what those distributors sell through to retailers. Secondary sales reflect real market demand, which is why same-day visibility into them is so valuable.',
      },
      {
        question: 'How is secondary sales data captured?',
        answer:
          'Through a mobile sales-force app used at the outlet during the rep visit — order booking, retailer-level billing and GPS-tagged check-ins feed a live distribution dashboard.',
      },
    ],
  },
];
