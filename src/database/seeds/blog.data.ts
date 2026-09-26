// src/database/seeds/blog.data.ts

/**
 * The /blog page content the website previously held as static data, so the
 * page renders identically the moment it starts reading from the API, and the
 * admin panel shows today's content from its first run. Sources, on the
 * website:
 *
 *   hero        HERO_SLIDES in src/pages/Blog/BlogPage.jsx - the one slide's
 *               eyebrow, headline, subhead and backdrop (its two buttons, and
 *               where they go, stay in the page's code)
 *   topics      the "Insights by Topic" <SectionIntro> in the same file; its
 *               orange <span> becomes the **accent** markup
 *   categories  CATEGORIES in src/data/blog.js - `id` becomes the slug, and
 *               the lucide component becomes its name
 *   posts       POSTS in src/data/blog.js - every post, bodies verbatim
 *
 * Every string below is verbatim, curly quotes and dashes included: a seed
 * that "tidied" the copy would show up as a diff on the live page the first
 * time it is run. The posts were converted mechanically from data/blog.js, not
 * retyped. The keys are renamed to the columns they fill (image -> imageUrl,
 * date -> publishedOn, category -> categorySlug), and nothing else changes.
 *
 * imageUrl fills blog_hero_slides.image_url and blog_posts.image_url, both
 * legacy / seed-only: the admin API takes a picture as an upload and never
 * writes a URL into either column, and these pictures - the site's shared hero
 * artwork and the posts' Unsplash photographs - have no uploaded file behind
 * them, so the seed is the only place they come from. A slide's or a post's
 * first upload replaces its seeded picture.
 *
 * Not seeded: the hero's accent colour, which stays in the page's code, and
 * any phone crop (mobile_image_file_id) - neither the page nor data/blog.js
 * has one, so every seeded row serves its one picture at every width until
 * somebody uploads one.
 *
 * Kept apart from seed.ts because the post bodies alone run to hundreds of
 * lines, which would bury the seed logic they feed.
 */

export interface SeedBlogHeroSlide {
  eyebrow: string;
  heading: string;
  subtext: string;
  /** The seeded backdrop (image_url - legacy / seed-only, see above). */
  imageUrl: string;
}

export interface SeedBlogTopicsSection {
  eyebrow: string;
  heading: string;
  subtext: string;
}

export interface SeedBlogCategory {
  slug: string;
  label: string;
  /** A name from BLOG_CATEGORY_ICON_NAMES (modules/blog/utils/icons.ts). */
  icon: string;
}

/** The four block shapes data/blog.js uses, exactly as it writes them. */
export type SeedBlogBodyBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string; cite: string | null };

export interface SeedBlogPost {
  slug: string;
  /** The slug of one of BLOG_CATEGORIES - resolved to its id on insert. */
  categorySlug: string;
  title: string;
  excerpt: string;
  /** The seeded picture (image_url - legacy / seed-only, see above). */
  imageUrl: string;
  readTime: string;
  /** 'YYYY-MM-DD'. */
  publishedOn: string;
  author: string;
  lead: string;
  body: SeedBlogBodyBlock[];
}

/**
 * The page's one hero slide. The headline is plain text - HeroSlider splits it
 * on an em-dash, and this one has none - so there is no markup to add. The
 * backdrop is HERO_BG_A, the site-relative path the page has always used; its
 * two buttons are not seeded, because they are fixed in BlogPage.jsx.
 */
export const BLOG_HERO_SLIDES: SeedBlogHeroSlide[] = [
  {
    eyebrow: 'THE UPWON BLOG',
    heading: 'Operator Playbooks for Food & FMCG.',
    subtext:
      'Two deep-reads a month across six lanes — the operational fixes that move real numbers. No vendor fluff.',
    imageUrl: '/images/hero%20bg.webp',
  },
];

/**
 * The intro above the chips. The page wrapped "You Operate In." in the orange
 * gradient span; in the heading markup that is the one **accent** run. The
 * eyebrow is stored as the page writes it - SectionIntro uppercases it on
 * screen.
 */
export const BLOG_TOPICS_SECTION: SeedBlogTopicsSection = {
  eyebrow: 'Insights by Topic',
  heading: 'Pick the Lane **You Operate In.**',
  subtext: 'Each category publishes operator playbooks built from real deployments.',
};

/** The six chips, in the order the page draws them. */
export const BLOG_CATEGORIES: SeedBlogCategory[] = [
  { slug: 'food-mfg', label: 'Food Manufacturing & ERP', icon: 'Factory' },
  { slug: 'fmcg-dist', label: 'FMCG Distribution', icon: 'Truck' },
  { slug: 'franchise', label: 'Franchise & QSR', icon: 'Store' },
  { slug: 'hr', label: 'HR & Compliance', icon: 'UserCog' },
  { slug: 'warehouse', label: 'Warehouse', icon: 'PackageCheck' },
  { slug: 'trends', label: 'Industry Trends', icon: 'TrendingUp' },
];

/**
 * Every post, in data/blog.js's own order. That order is not the page's: the
 * page sorts by publishedOn, newest first, and so does every read of the table.
 */
export const BLOG_POSTS: SeedBlogPost[] = [
  {
    slug: 'reduce-wastage-multi-plant-bakery',
    categorySlug: 'food-mfg',
    title: 'How to reduce wastage in a multi-plant bakery',
    excerpt:
      'The 5 sources of bakery wastage and the operational fixes that actually move the number — without slowing the line.',
    imageUrl:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1600&q=80',
    readTime: '6 min read',
    publishedOn: '2026-05-28',
    author: 'UpWon Operations Desk',
    lead:
      'Most bakery owners discover their wastage at month-end — as a number in the P&L, long after the dough, the shift and the batch that caused it are gone. The fix is not more discipline. It is visibility at the moment waste happens.',
    body: [
      { type: 'h2', text: 'The five sources of bakery wastage' },
      {
        type: 'p',
        text:
          'Across the 50+ food manufacturers we work with, bakery wastage almost always traces back to the same five sources — and each one has a different operational fix.',
      },
      {
        type: 'ul',
        items: [
          'Recipe drift — actual ingredient usage diverges from the costed BOM, batch to batch.',
          'Over-production — bakes planned on gut feel instead of confirmed outlet orders.',
          'Expiry write-offs — short-shelf-life stock that ages out before it sells.',
          'Yield loss — proofing, baking and finishing losses that no one measures per stage.',
          'Returns — unsold counter stock that comes back and quietly disappears.',
        ],
      },
      { type: 'h2', text: 'Fix #1 — close the recipe loop' },
      {
        type: 'p',
        text:
          'The single highest-leverage fix is to measure actual consumption against the costed recipe for every batch. When maida usage runs 6% over target on the morning shift but on-target in the evening, that is not a costing problem — it is a process problem you can now see and correct the same day.',
      },
      { type: 'h2', text: 'Fix #2 — bake to confirmed demand' },
      {
        type: 'p',
        text:
          'Outlet orders captured by 9pm should drive tomorrow’s production plan — not last year’s seasonal average. Operators who move from forecast-led to order-led production routinely cut over-production wastage by half in the first quarter.',
      },
      {
        type: 'p',
        text:
          'The pattern that ties all five fixes together: you cannot reduce what you cannot see at the moment it happens. Live batch-level tracking turns month-end surprises into same-shift corrections.',
      },
    ],
  },
  {
    slug: 'secondary-sales-visibility-beyond-sell-in',
    categorySlug: 'fmcg-dist',
    title: 'Secondary sales visibility — beyond distributor sell-in',
    excerpt:
      'Why FMCG companies that capture sell-out — not just sell-in — outgrow their peers by 1.4×.',
    imageUrl:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80',
    readTime: '8 min read',
    publishedOn: '2026-05-14',
    author: 'UpWon Distribution Team',
    lead:
      'Primary sales tell you what left your warehouse. Secondary sales tell you what is actually selling at the outlet. The gap between those two numbers is where most FMCG brands plan blind — and the brands that close it grow measurably faster.',
    body: [
      { type: 'h2', text: 'Sell-in is a vanity metric' },
      {
        type: 'p',
        text:
          'Loading a distributor with stock looks like growth on your primary dashboard. But if that stock sits in the distributor godown for 45 days, you have not grown — you have just moved inventory one step down the chain and lost visibility of it.',
      },
      { type: 'h2', text: 'What secondary visibility unlocks' },
      {
        type: 'ul',
        items: [
          'Real demand signal — plan primary dispatch on what outlets actually pull.',
          'Scheme ROI you can audit — see which promotions moved sell-out, not just sell-in.',
          'Earlier stock-out alerts — catch a fast-moving SKU before the outlet runs dry.',
          'Honest distributor performance — measured on sell-out, not order size.',
        ],
      },
      { type: 'h2', text: 'The 1.4× growth gap' },
      {
        type: 'p',
        text:
          'In our deployment data, distributors and brands that capture outlet-level secondary sales daily consistently outgrow sell-in-only peers. The mechanism is simple: faster, truer demand signal means less dead stock, fewer stock-outs on movers, and promotion spend that lands where it works.',
      },
      {
        type: 'quote',
        text:
          'We stopped rewarding distributors for the size of their order and started rewarding them for what their outlets actually sold. Everything changed.',
        cite: 'National Sales Head, FMCG brand',
      },
      {
        type: 'p',
        text:
          'The technology to capture sell-out — a salesman app that records every outlet order at the point of sale — is no longer the hard part. The hard part is the discipline to act on the signal every week.',
      },
    ],
  },
  {
    slug: 'scaling-franchise-network-200-outlets',
    categorySlug: 'franchise',
    title: 'Scaling a franchise network to 200+ outlets',
    excerpt:
      'The operational systems leading chains put in place before adding their 100th outlet.',
    imageUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
    readTime: '10 min read',
    publishedOn: '2026-04-30',
    author: 'UpWon Franchise Practice',
    lead:
      'Every franchise network hits a wall. For most it arrives somewhere between the 40th and 60th outlet — the point where adding stores stops feeling like growth and starts feeling like chaos. The chains that break through 200 outlets all did the same thing first: they fixed the system before they scaled the footprint.',
    body: [
      { type: 'h2', text: 'Why the wall appears' },
      {
        type: 'p',
        text:
          'At 10 outlets, a founder can hold the whole operation in their head. At 50, every new store needs three more back-office people just to keep the existing ones running. That is not scaling — that is multiplying overhead.',
      },
      { type: 'h2', text: 'The four systems that break the wall' },
      {
        type: 'ul',
        items: [
          'One HQ dashboard — every outlet’s sales, stock and royalty in real time, not by phone.',
          'Central recipe + supply control — the brand standard enforced from one place.',
          'Aggregator reconciliation — Swiggy, Zomato and ONDC settled automatically.',
          'Role-based outlet onboarding — a new store live in days, not months.',
        ],
      },
      { type: 'h2', text: 'Build the system at outlet 40, not 140' },
      {
        type: 'p',
        text:
          'The expensive mistake is waiting until the chaos is unbearable. Networks that put the HQ-to-outlet data spine in place while still small scale almost linearly afterwards — adding outlets without adding proportional headcount.',
      },
      {
        type: 'p',
        text:
          'One bakery-café chain we work with crossed 45 outlets with 100% order visibility from HQ — and added the next 40 without growing their central team at all.',
      },
    ],
  },
  {
    slug: 'fat-percent-management-at-scale-dairy',
    categorySlug: 'food-mfg',
    title: 'Fat % management at scale (dairy)',
    excerpt:
      'Procurement, processing and pricing — the dairy operator’s playbook for protecting margin on a moving input.',
    imageUrl:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1600&q=80',
    readTime: '7 min read',
    publishedOn: '2026-04-18',
    author: 'UpWon Operations Desk',
    lead:
      'In dairy, fat percentage is the number that decides your margin — and it changes every single day, at every collection point. Manage it by hand and you are always one step behind the milk.',
    body: [
      { type: 'h2', text: 'Fat % is a daily, not monthly, decision' },
      {
        type: 'p',
        text:
          'Procurement rate, processing yield and product pricing all hang off fat content. When that input moves daily but your costing updates monthly, every product you ship in between is priced on stale data.',
      },
      { type: 'h2', text: 'The three control points' },
      {
        type: 'ul',
        items: [
          'At collection — capture fat/SNF per farmer, per batch, and pay on actuals.',
          'In processing — track yield per fat band so standardisation loss is visible.',
          'At pricing — flow live input cost into product margin, automatically.',
        ],
      },
      {
        type: 'p',
        text:
          'Operators who connect these three control points on one data layer stop guessing at month-end and start managing margin in real time — closing books in days instead of weeks.',
      },
    ],
  },
  {
    slug: 'fssai-digital-mandate-what-you-need-to-know',
    categorySlug: 'hr',
    title: 'FSSAI digital mandate — what you need to know',
    excerpt:
      'Practical implications of the new digital compliance regime — and how to be audit-ready in minutes, not days.',
    imageUrl:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80',
    readTime: '5 min read',
    publishedOn: '2026-04-02',
    author: 'UpWon Compliance Team',
    lead:
      'FSSAI inspections have shifted to risk-based, often unannounced audits — where inspectors expect batch traceability proof within minutes. The plants that stay calm are the ones whose compliance lives in the system, not in a filing cabinet.',
    body: [
      { type: 'h2', text: 'What changed' },
      {
        type: 'p',
        text:
          'The digital mandate moves compliance from periodic paperwork to always-on, queryable records. Licence status, batch trace, allergen flags and recall readiness are now things you must be able to produce on demand — not assemble over two days.',
      },
      { type: 'h2', text: 'The four things to digitise first' },
      {
        type: 'ul',
        items: [
          'Licence renewals — automatic alerts at 90/60/30-day windows.',
          'Batch traceability — every finished good traceable to its source lots in one query.',
          'Allergen flagging — propagated through every BOM, not maintained by hand.',
          'Recall workflow — one-click identification of affected stock across outlets.',
        ],
      },
      {
        type: 'p',
        text:
          'Pre-digitisation, most plants need 24–48 hours and three people to assemble traceability proof. Post-digitisation, it is one query, one PDF, one click — which is exactly what a risk-based inspector now expects.',
      },
    ],
  },
  {
    slug: 'aggregator-reconciliation-without-the-headache',
    categorySlug: 'franchise',
    title: 'Aggregator reconciliation without the headache',
    excerpt:
      'Swiggy + Zomato + ONDC — closing books on time when a third of your orders arrive through someone else’s app.',
    imageUrl:
      'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1600&q=80',
    readTime: '6 min read',
    publishedOn: '2026-03-20',
    author: 'UpWon Franchise Practice',
    lead:
      'When a third of your orders flow through aggregators, month-end is a reconciliation nightmare: commissions, cancellations, payouts and taxes that never quite tie out to your POS. The fix is to reconcile continuously, not in a panic on the 5th.',
    body: [
      { type: 'h2', text: 'Why the books never tie out' },
      {
        type: 'p',
        text:
          'Each aggregator deducts commission, runs its own promo funding, handles cancellations differently, and pays out on its own cycle. Reconciling that against outlet POS by hand, across dozens of stores, is where finance teams lose their weekends.',
      },
      { type: 'h2', text: 'Reconcile at the order, not the statement' },
      {
        type: 'ul',
        items: [
          'Match every aggregator order to its POS ticket at capture, automatically.',
          'Flag commission and payout variances the day they occur, not at month-end.',
          'Roll outlet-level aggregator P&L into one HQ view.',
        ],
      },
      {
        type: 'p',
        text:
          'Networks that reconcile continuously close their books on time, every time — and recover commission and payout discrepancies they previously wrote off as “the cost of being on the platforms.”',
      },
    ],
  },
  {
    slug: 'fefo-vs-fifo-when-each-matters',
    categorySlug: 'warehouse',
    title: 'FEFO vs FIFO — when each one matters',
    excerpt:
      'Picking the right perishable-stock policy for cold-chain and ambient stores — and why getting it wrong shows up as write-offs.',
    imageUrl:
      'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1600&q=80',
    readTime: '5 min read',
    publishedOn: '2026-03-08',
    author: 'UpWon Warehouse Team',
    lead:
      'FIFO ships the oldest stock first. FEFO ships the soonest-to-expire stock first. For perishables they are not the same thing — and the difference between them is written in expiry write-offs.',
    body: [
      { type: 'h2', text: 'The crucial distinction' },
      {
        type: 'p',
        text:
          'Oldest-in is not always nearest-expiry. A batch received later can have an earlier expiry date because of how it was produced or stored. FIFO would ship the older batch and leave the soon-to-expire one to age out. FEFO ships by expiry — which is what perishables actually demand.',
      },
      { type: 'h2', text: 'When to use which' },
      {
        type: 'ul',
        items: [
          'FEFO — anything with a shelf life: dairy, bakery, fresh, cold-chain SKUs.',
          'FIFO — stable, long-life ambient goods where receipt order is a fair proxy.',
          'Enforce at dispatch, not just on the picklist — that is where FEFO actually bites.',
        ],
      },
      {
        type: 'p',
        text:
          'The common failure mode is FEFO “on paper” — a picklist suggests the right batch but nothing stops a different one from going out the door. Enforced at dispatch, FEFO routinely takes expiry write-offs close to zero.',
      },
    ],
  },
  {
    slug: 'why-mid-market-brands-are-leaving-tally',
    categorySlug: 'trends',
    title: 'Why mid-market Indian brands are leaving Tally',
    excerpt:
      'The growth-stage trigger points that force a platform decision — and what they switch to.',
    imageUrl:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80',
    readTime: '9 min read',
    publishedOn: '2026-02-22',
    author: 'UpWon Industry Desk',
    lead:
      'Tally is brilliant at what it was built for: accounting. The problem is that growing food and FMCG brands stop being accounting problems and start being operations problems — and that is the moment the spreadsheets-and-Tally stack quietly breaks.',
    body: [
      { type: 'h2', text: 'The trigger points' },
      {
        type: 'p',
        text:
          'Brands rarely leave Tally because of accounting. They leave because of everything Tally was never meant to do — and which they have been bolting on with Excel and WhatsApp.',
      },
      {
        type: 'ul',
        items: [
          'Batch and recipe costing that Excel can no longer hold.',
          'Secondary sales visibility across distributors and outlets.',
          'Multi-location stock that lives in three disconnected books.',
          'Compliance traceability that takes days to assemble.',
          'A salesman, warehouse and outlet workforce running on paper.',
        ],
      },
      { type: 'h2', text: 'What they switch to' },
      {
        type: 'p',
        text:
          'The pattern is not “Tally to SAP.” For most mid-market food and FMCG brands, SAP is too slow and too costly to justify. They move to a platform built for their industry — one data layer spanning ERP, distribution, warehouse, HR and finance — and keep Tally running for statutory accounting during cutover.',
      },
      {
        type: 'quote',
        text: 'We didn’t want another system we’d outgrow. We wanted one we could grow into.',
        cite: 'Operations Director, dairy cooperative',
      },
      {
        type: 'p',
        text:
          'The decision is rarely about features on a comparison sheet. It is about the day you realise your business has outgrown the tool that got you here.',
      },
    ],
  },
  {
    slug: 'multi-state-payroll-every-states-gotcha',
    categorySlug: 'hr',
    title: 'Multi-state payroll — every state’s gotcha',
    excerpt:
      'A field guide to factory + sales + HQ workforce compliance when your people span half a dozen states.',
    imageUrl:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80',
    readTime: '8 min read',
    publishedOn: '2026-02-10',
    author: 'UpWon Compliance Team',
    lead:
      'A factory in Maharashtra, a sales force across five states, and an HQ in Gujarat — three workforces, three sets of rules, and a payroll run that has to satisfy all of them on the same day. Multi-state payroll is where good HR teams quietly burn five days a month.',
    body: [
      { type: 'h2', text: 'Why one payroll policy never works' },
      {
        type: 'p',
        text:
          'Professional tax, minimum wages, labour welfare fund, leave rules and bonus thresholds all vary by state. A workforce spread across states means your single payroll run is really several payroll runs wearing a trench coat.',
      },
      { type: 'h2', text: 'The gotchas that catch teams out' },
      {
        type: 'ul',
        items: [
          'Professional tax slabs that differ — and change — state by state.',
          'State-specific minimum wage revisions that land mid-cycle.',
          'Labour welfare fund deductions with different frequencies.',
          'Factory vs field vs HQ staff on entirely different attendance logic.',
        ],
      },
      {
        type: 'p',
        text:
          'Teams that put state rules into the system — instead of into a senior person’s memory — collapse a five-day payroll cycle into hours, and stop discovering compliance gaps during an inspection.',
      },
    ],
  },
];
