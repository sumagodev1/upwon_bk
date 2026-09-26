// src/database/seeds/insider-page.data.ts

/**
 * The Insider (newsletter) page content the website previously held as static
 * data, so /newsletter renders identically the moment it starts reading from
 * the API. Sources, on the website:
 *
 *   hero      src/pages/Newsletter/sections/InsiderHeroSection/InsiderHeroSection.jsx
 *   issues    src/data/newsletter.js - every issue and story, bodies verbatim
 *   feature   the LONG-FORM CALLOUT block in src/pages/Newsletter/NewsletterPage.jsx
 *
 * Kept apart from seed.ts because the story bodies alone run to well over a
 * hundred lines, which would bury the seed logic they feed.
 */

export interface SeedInsiderHeroSlide {
  heading: string;
  subtext: string;
  imageUrl: string;
}

export interface SeedInsiderStory {
  slug: string;
  eyebrow: string;
  ctaLabel: string;
  title: string;
  blurb: string;
  imageUrl: string;
  readTime: string | null;
  body: string[];
}

export interface SeedInsiderIssue {
  slug: string;
  label: string;
  issueNumber: number;
  isCurrent: boolean;
  stories: SeedInsiderStory[];
}

export interface SeedInsiderFeatureSection {
  badge: string;
  eyebrow: string;
  heading: string;
  body: string;
  bullets: string[];
  imageUrl: string;
}

/**
 * The one slide the Insider hero carried. Plain text: HeroSlider splits the
 * headline on its em-dash, so there is no accent markup to add.
 */
export const INSIDER_HERO_SLIDES: SeedInsiderHeroSlide[] = [
  {
    heading: 'The UpWon Operations Insider — Monthly Intelligence for Food & FMCG Operators.',
    subtext:
      "Product updates, industry shifts, compliance changes, and what's actually working on the ground. One email a month, written for the people who run the plant, the counter and the route.",
    imageUrl:
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1600&q=60',
  },
];

/**
 * The long-form callout. The heading uses the home page heading markup: the
 * **accent** is the span the page rendered with gradient-text-orange.
 */
export const INSIDER_FEATURE_SECTION: SeedInsiderFeatureSection = {
  badge: 'Long-form',
  eyebrow: 'IN-DEPTH FEATURE',
  heading: 'Inside How Monginis Runs 200+ Outlets on **One Platform.**',
  body:
    'The full story behind a 5.7× outlet expansion without growing the back-office team — how the team mapped 18 plant SOPs in 5 days, rolled out plant-by-plant in 4 weeks, and crossed ₹20 L in daily transactions with zero P1 incidents.',
  bullets: [
    'Why hub-spoke order consolidation beat their old phone-tree process',
    'How royalty calculation went from spreadsheet to automatic',
    'The 4-phase rollout schedule that hit Day 30 go-live cleanly',
  ],
  imageUrl:
    'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&w=2000&q=80',
};

/**
 * Every issue in data/newsletter.js, newest first. March 2026 is current and
 * carries its stories; the past issues are archive entries with none yet.
 */
export const INSIDER_ISSUES: SeedInsiderIssue[] = [
  {
    slug: 'march-2026',
    label: 'March 2026',
    issueNumber: 4,
    isCurrent: true,
    stories: [
      {
        slug: 'vatsalya-dairy-onboarding',
        eyebrow: 'Who joined UpWon',
        ctaLabel: "Who's on board",
        title: 'Vatsalya Dairy goes live across 3 plants in 40 days',
        blurb:
          "India's largest dairy cooperative network adds a new processor — UpWon ERP + WMS deployed with native FEFO across cold-chain operations.",
        imageUrl:
          'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1600&q=80',
        readTime: '4 min read',
        body: [
          'Vatsalya Dairy — a 12-year-old dairy cooperative network with three processing plants across western Maharashtra — has gone live on UpWon in 40 days. The deployment covers ERP, WMS and the Mobile Apps suite, with native FEFO enforcement across every cold-chain SKU.',
          'The decision came after an 18-month evaluation that included SAP B1 (eliminated on cost and timeline), Tally + custom plugins (eliminated on batch traceability), and a generic cloud ERP (eliminated on lack of cold-chain logic). UpWon won on three concrete capabilities: native temperature-zone tracking inside WMS, FEFO enforced at dispatch (not just at picklist), and route-level secondary sales capture for their 2,400+ retail outlets.',
          "Implementation followed UpWon's standard 4-phase model — Discovery (week 1), Configuration (weeks 2-3), UAT + training (week 4), and Go-live with 90-day hyper-care. Master data migration covered 18,000+ SKU variants, 2,400 outlet codes, and 7 years of historical batches.",
          'First-month numbers: 100% of dispatches passed FEFO checks (vs ~73% pre-UpWon), expiry write-offs dropped 9.2% in the first 30 days, and outlet-level secondary sales reporting moved from monthly to daily.',
          "Vatsalya's Operations Director put it cleanly: 'We didn't want another system that we'd outgrow. We wanted one we could grow into.'",
        ],
      },
      {
        slug: 'fmcg-last-mile-cost',
        eyebrow: 'Industry Spotlight',
        ctaLabel: "What's trending",
        title: 'How FMCG distributors are cutting last-mile costs by 22%',
        blurb:
          'Beat-plan AI, secondary-sales capture and outlet-level GPS audit trails are quietly rewriting how Indian distribution works in 2026.',
        imageUrl:
          'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80',
        readTime: '6 min read',
        body: [
          'The last-mile cost stack for an Indian FMCG distributor has stayed brutally stubborn for two decades. Fuel, salesman salary, depot rent, route inefficiency — combined they typically eat 11-14% of distributor margin. In 2026, the best operators are dropping that to 8-9% — a 22% reduction in absolute cost.',
          "Three shifts are driving the move. First, beat-plan AI: assignment algorithms that match SKU range to outlet potential, not just geography. Second, real-time secondary-sales capture at the outlet — moving the visibility window from 30 days to same-day. Third, GPS audit trails on every rep, every outlet visit, turning 'beat compliance' from a paper report into a live dashboard.",
          'UpWon SFA-DMS customers running all three see consistent results within 90 days: 18-25% drop in fuel cost (eliminated phantom visits), 12-16% lift in productive outlet time (better route density), and 30-40% faster claim settlement (no missing paperwork).',
          "The catch: technology alone doesn't drive the gain. The distributors making the 22% cost cut are the ones who paired the tools with disciplined beat-plan review meetings — every Monday, every territory, every rep.",
          'Three questions worth asking your sales head this quarter: What percentage of planned beats are actually getting visited? How long is the lag between an outlet sale and HQ visibility? What does the fuel-bill-per-PJP ratio look like by rep?',
        ],
      },
      {
        slug: 'fssai-batch-tracking-2-0',
        eyebrow: "What's new",
        ctaLabel: 'See enhancements',
        title: 'FSSAI Batch Tracking 2.0 — now native, not bolt-on',
        blurb:
          'Auto-renewal alerts, batch-level recall workflow, allergen flagging across every BOM. Live for all UpWon ERP customers this month.',
        imageUrl:
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80',
        readTime: '3 min read',
        body: [
          'FSSAI Batch Tracking 2.0 is live across all UpWon ERP deployments. Every food manufacturer customer now has automatic batch-level traceability — no configuration required, no consultant ticket needed.',
          "What's new in v2.0: automatic FSSAI license renewal alerts at 90/60/30 day windows, batch-level recall workflow with one-click affected-stock identification, allergen flagging propagated through every BOM and finished good, and a compliance document vault that surfaces the right paperwork by batch ID.",
          "Why this matters in 2026: FSSAI inspections have shifted to risk-based audits, where inspectors arrive unannounced and demand batch traceability proof within minutes. Pre-UpWon, most plants need 24-48 hours and three people to assemble that paperwork. Post-UpWon, it's one query, one PDF, one click.",
          "Existing customers — no action needed. The feature is live and active by default. If you've previously customised your compliance module, your settings are preserved.",
          "Want a walkthrough? Book a 15-minute session with our compliance team — we'll show you the recall workflow on your own batch data.",
        ],
      },
      {
        slug: 'fefo-enforcement-2026',
        eyebrow: 'Feature highlight',
        ctaLabel: 'Explore feature',
        title: 'FEFO enforcement — why it matters more in 2026',
        blurb:
          "A flashback to UpWon's most quietly-loved feature. New regulatory pressure and shrinking shelf lives mean enforced FEFO is now table stakes.",
        imageUrl:
          'https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&w=1600&q=80',
        readTime: '5 min read',
        body: [
          "FEFO — First Expiry, First Out — sounds obvious enough that you'd assume every food ERP enforces it. Most don't. They report on it. They alert on it. They prepare picklists assuming it. But they don't strictly prevent a warehouse picker from grabbing a newer batch while older stock waits to expire on the shelf.",
          "UpWon's WMS enforces FEFO at the scanner level. If a picker scans an out-of-FEFO batch, the mobile app rejects the pick and shows the correct one. There's no override without a documented reason and a manager approval. The result: customers consistently see 80-95% drop in expiry write-offs within the first 90 days of go-live.",
          'Why this matters more in 2026: shelf lives are compressing. Cleaner-label products (fewer preservatives) carry 30-40% shorter shelf life than the previous generation. Cold-chain SKUs increasingly arrive at outlets with 60% of life used up. And new FSSAI guidelines on near-expiry product display have raised the cost of getting FEFO wrong.',
          "FEFO enforcement is one of those features that's invisible when it works and very visible when it doesn't. Kaka Halwai's 18% wastage reduction in 60 days is largely a FEFO story. Vatsalya Dairy's 9% expiry write-off drop in 30 days is too.",
          "If you're considering an ERP move in 2026 and the vendor talks about FEFO as a 'report' rather than an 'enforcement,' that's a red flag.",
        ],
      },
      {
        slug: 'kaka-halwai-18-percent',
        eyebrow: 'Customer win',
        ctaLabel: 'Get inspired',
        title: 'Kaka Halwai cut wastage by 18% and billing time by 48%',
        blurb:
          '130-year sweets brand unified 3 plants on UpWon — counter POS for weight-based pricing, FEFO across all SKUs, full ROI in 60 days.',
        imageUrl:
          'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=1600&q=80',
        readTime: '7 min read',
        body: [
          'Kaka Halwai — a 130-year-old Pune sweets brand operating 25+ outlets and three plants — went live on UpWon in 45 days. Within 60 days post-go-live, they had measurable, audit-defensible outcomes: 18% inventory wastage reduction and 48% reduction in counter billing time during festival rush.',
          "The 18% wastage cut came from FEFO enforcement across perishable mithai. Pre-UpWon, the team ran separate software on three plants and reconciled monthly. Expiry surprises showed up at month-end, by which point unsalable stock had already accumulated. With UpWon's batch-level FEFO, plant managers see ageing inventory daily, and the picklist itself forces older stock to dispatch first.",
          "The 48% billing speedup came from counter POS designed specifically for weight-based pricing. Indian sweets aren't sold in fixed SKUs — every counter transaction involves multiple items, multiple weights, multiple GST rates, and often custom packaging. UpWon's POS handles this on a touch interface optimised for hand-counter staff, not retail-cashier muscle memory.",
          'Implementation: 45 days end-to-end. Discovery week 1 (mapped 3 plant flows and 25 outlet workflows), configuration weeks 2-4 (ERP + FMS across all 3 plants, counter POS deployed), UAT + train-the-trainer weeks 5-6, go-live with phased plant rollout. Zero P1 incidents.',
          "Plant Operations Head: 'We've been running this business for 130 years. UpWon is the first system that finally speaks our language — sweet by sweet, counter by counter, plant by plant.'",
          'Read the full case study to see the rollout schedule, the FEFO enforcement architecture, and the counter-POS UX choices that made the difference.',
        ],
      },
      {
        slug: '5-kpis-food-manufacturers',
        eyebrow: 'Operations playbook',
        ctaLabel: 'Read the playbook',
        title: '5 KPIs every food manufacturer should track daily',
        blurb:
          'Throughput, yield, wastage, on-time dispatch, batch traceability — the five numbers the best plant heads in India check at 7am every morning.',
        imageUrl:
          'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80',
        readTime: '8 min read',
        body: [
          "The plant heads running India's best food manufacturers all check the same five numbers at 7am every morning — before tea, before email, before standup. The five KPIs aren't glamorous, but they're load-bearing.",
          "1. Throughput vs plan. Yesterday's output divided by yesterday's plan. Anything below 95% triggers a same-day review. The number itself is less important than the variance — a 98% number with consistent 4-point variance is healthier than a 100% number with 12-point variance.",
          "2. Yield. Output as a percentage of input. The benchmark depends on category (90%+ for biscuits, 85%+ for chocolates, 70-75% for cut fruit). The right move isn't to chase a higher yield — it's to track variance over the previous 30 days and investigate any drop greater than 1.5%.",
          '3. Wastage. Three sub-numbers: raw material wastage, process wastage, finished-goods expiry. Each has different root causes. Most plants only track total — and miss that the same total can hide very different operational stories.',
          "4. On-time dispatch percentage. Of yesterday's planned dispatches, how many left the dock on time. This is the number sales teams care about, and the gap between manufacturing reality and sales perception. Track it side-by-side with throughput and yield to spot bottlenecks.",
          "5. Batch traceability readiness. A weekly check: pick 10 random finished-goods batches and see if you can trace them back to raw material lot, vendor, and production shift in under 5 minutes. If the answer is no — even on one batch — that's an FSSAI inspection waiting to happen.",
          "These five give a plant head the daily pulse. They're not the complete dashboard — they're the early-warning panel.",
        ],
      },
    ],
  },
  {
    slug: 'february-2026',
    label: 'February 2026',
    issueNumber: 3,
    isCurrent: false,

    stories: [],
  },
  {
    slug: 'january-2026',
    label: 'January 2026',
    issueNumber: 2,
    isCurrent: false,

    stories: [],
  },
  {
    slug: 'december-2025',
    label: 'December 2025',
    issueNumber: 1,
    isCurrent: false,

    stories: [],
  },
];
