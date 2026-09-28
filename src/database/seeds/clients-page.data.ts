// src/database/seeds/clients-page.data.ts

/**
 * The Clients page content the website previously held as static data, so
 * /clients renders identically the moment it starts reading from the API.
 * Sources, on the website:
 *
 *   hero   src/pages/ClientsHub/sections/ClientsHeroSection/ClientsHeroSection.jsx
 *   cases  the featured cases block in src/pages/ClientsHub/ClientsHubPage.jsx,
 *          fed by ALL_CASES in src/data/caseStudy.js
 *   story  src/pages/CaseStudy/CaseStudyPage.jsx at /clients/:slug, fed by the same
 *          ALL_CASES and CASE_DELIVERABLES in src/data/industryExtras.js
 *   roster the roster heading in ClientsHubPage.jsx, and CLIENT_LOGOS in
 *          src/components/shared/TrustStrip/TrustStrip.jsx
 *   network STATES and the header in
 *          src/pages/ClientsHub/sections/DeploymentMap/DeploymentMap.jsx
 *   testimonials TESTIMONIALS in
 *          src/components/shared/TestimonialsMarquee/TestimonialsMarquee.jsx
 */

export interface SeedClientsHeroSlide {
  heading: string;
  subtext: string;
  imageUrl: string;
}

/**
 * The one slide the Clients hero carried. Plain text: HeroSlider splits the
 * headline on its em-dash, so there is no accent markup to add.
 */
export const CLIENTS_HERO_SLIDES: SeedClientsHeroSlide[] = [
  {
    heading:
      'The ERP 50+ Food & FMCG Enterprises Chose — Over Everything Else They Tried.',
    subtext:
      'Bakery chains, dairy brands, beverage manufacturers, FMCG distributors and QSR networks run their day on UpWon. Not pilots or proofs of concept — live operations, across 10 states and counting.',
    imageUrl:
      'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1600&q=60',
  },
];

export interface SeedClientsCaseCard {
  category: string;
  brand: string;
  location: string;
  scale: string;
  headline: string;
  outcomes: Array<{ value: string; label: string }>;
  storyUrl: string;
}

/**
 * The featured cases section's copy, from the heading block in
 * src/pages/ClientsHub/ClientsHubPage.jsx. The **accent** is the span the page
 * rendered with gradient-text-orange.
 */
export const CLIENTS_CASES_SECTION_COPY = {
  eyebrow: 'RESULTS THAT SPEAK FOR THEMSELVES',
  heading: 'What Growth Actually Looks Like **on UpWon.**',
  subtext:
    'Three businesses, named and on the record — what each one was wrestling with, and what changed once their operations came together on one platform.',
};

/**
 * The three cards, from ALL_CASES in src/data/caseStudy.js - the first three
 * outcomes of each, which is all the card ever showed.
 */
export const CLIENTS_CASE_CARDS: SeedClientsCaseCard[] = [
  {
    category: 'Bakery & Confectionery',
    brand: 'Monginis',
    location: 'Sambhajinagar',
    scale: '16 Plants · 200+ Outlets · 5,000+ Orders/Day',
    headline: '35 outlets to 200+. Same back-office team. Zero chaos.',
    outcomes: [
      { value: '35 → 200+', label: 'Scaled without adding headcount' },
      { value: '1 → 3', label: 'Plants expanded, same platform' },
      { value: '₹20 L+', label: 'Daily transactions, fully automated' },
    ],
    storyUrl: '/clients/monginis',
  },
  {
    category: 'Sweets & Namkeen',
    brand: 'Kaka Halwai',
    location: 'Pune',
    scale: '25+ Outlets · 700+ Orders/Day · 5,000+ Invoices/Day',
    headline: '130 years of legacy. 18% less wastage in just 60 days',
    outcomes: [
      { value: '18%', label: 'Wastage reduction in 60 days.' },
      { value: '48%', label: 'Faster billing' },
      { value: '3 plants', label: 'Full supply chain integrated' },
    ],
    storyUrl: '/clients/kaka-halwai',
  },
  {
    category: 'QSR & Franchise F&B',
    brand: 'U2 Cake & Burger',
    location: 'Mumbai',
    scale: '250+ Outlets · 6,000+ Orders/Day · ₹23 L Daily Txns',
    headline: '₹23L in daily transactions. 250+ outlets. One screen.',
    outcomes: [
      { value: '₹23 L', label: 'Daily transactions on platform' },
      { value: '6,000+', label: 'Orders processed per day' },
      { value: '250+', label: 'Outlets unified' },
    ],
    storyUrl: '/clients/u2-cake',
  },
];

/**
 * The roster band's copy, from the heading block in
 * src/pages/ClientsHub/ClientsHubPage.jsx.
 */
export const CLIENTS_ROSTER_SECTION_COPY = {
  eyebrow: 'THE UPWON ROSTER',
  heading: 'Trusted by India’s Leading **Food & FMCG Brands.**',
  subtext:
    'Bakery chains, dairy brands, sweet houses, beverage makers, QSR networks and FMCG distributors — running live across 10 states and counting.',
};

/**
 * The marquee's logos, from CLIENT_LOGOS in
 * src/components/shared/TrustStrip/TrustStrip.jsx. Site-relative paths: the
 * files are the website's own, so they are stored as URLs until an admin
 * replaces one with an upload.
 */
export const CLIENTS_ROSTER_LOGOS: Array<{ name: string; imageUrl: string }> = [
  { name: 'Monginis', imageUrl: '/images/testimonial/mongignis.webp' },
  { name: 'Kaka Halwai', imageUrl: '/images/testimonial/kaka%20halwai.webp' },
  { name: 'U2 Cake', imageUrl: '/images/testimonial/u2cake.webp' },
  { name: 'Winni', imageUrl: '/images/testimonial/winni.webp' },
  { name: 'Gokul', imageUrl: '/images/testimonial/gokul.webp' },
  { name: 'OFC', imageUrl: '/images/testimonial/ofc.webp' },
];

/**
 * The network band's copy, from the header of
 * src/pages/ClientsHub/sections/DeploymentMap/DeploymentMap.jsx.
 */
export const CLIENTS_NETWORK_SECTION_COPY = {
  eyebrow: 'Operational Network',
  heading: 'From Sambhajinagar to **Kolkata**.',
  subtext:
    'Running today across India’s food & FMCG belt — from west-coast bakery chains to eastern dairy networks.',
};

/**
 * The states and cities, from STATES in DeploymentMap.jsx. Mumbai stays first:
 * the map's network lines fan out from the first city of the first state.
 */
export const CLIENTS_NETWORK_STATES: Array<{
  state: string;
  zone: 'North' | 'South' | 'East' | 'West' | 'Central' | 'North-East';
  cities: Array<{ name: string; lat: number; lng: number }>;
}> = [
  {
    state: 'Maharashtra',
    zone: 'West',
    cities: [
      { name: 'Mumbai', lat: 19.07, lng: 72.87 },
      { name: 'Pune', lat: 18.52, lng: 73.85 },
      { name: 'Nagpur', lat: 21.14, lng: 79.08 },
      { name: 'Sambhajinagar', lat: 19.87, lng: 75.34 },
      { name: 'Kolhapur', lat: 16.7, lng: 74.24 },
    ],
  },
  {
    state: 'Gujarat',
    zone: 'West',
    cities: [
      { name: 'Ahmedabad', lat: 23.02, lng: 72.57 },
      { name: 'Surat', lat: 21.17, lng: 72.83 },
      { name: 'Baroda', lat: 22.31, lng: 73.18 },
    ],
  },
  { state: 'Delhi', zone: 'North', cities: [{ name: 'Delhi', lat: 28.61, lng: 77.21 }] },
  { state: 'Uttar Pradesh', zone: 'North', cities: [{ name: 'Lucknow', lat: 26.85, lng: 80.95 }] },
  { state: 'Bihar', zone: 'East', cities: [{ name: 'Patna', lat: 25.59, lng: 85.14 }] },
  { state: 'West Bengal', zone: 'East', cities: [{ name: 'Kolkata', lat: 22.57, lng: 88.36 }] },
  { state: 'Telangana', zone: 'South', cities: [{ name: 'Hyderabad', lat: 17.39, lng: 78.49 }] },
  { state: 'Odisha', zone: 'East', cities: [{ name: 'Bhubaneshwar', lat: 20.3, lng: 85.82 }] },
  { state: 'Jharkhand', zone: 'East', cities: [{ name: 'Ranchi', lat: 23.34, lng: 85.31 }] },
];

/**
 * The testimonials band's copy, from the TestimonialsMarquee props in
 * src/pages/ClientsHub/ClientsHubPage.jsx.
 */
export const CLIENTS_TESTIMONIALS_SECTION_COPY = {
  eyebrow: 'VOICES FROM THE NETWORK',
  heading: 'Real Teams. **Real Outcomes.**',
  subtext:
    'What operations, finance and franchise leaders say about running their business on one connected platform.',
};

const UNSPLASH = 'https://images.unsplash.com/photo-';
const AVATAR = '?auto=format&fit=crop&w=200&q=70';

/**
 * The quotes, from TESTIMONIALS in
 * src/components/shared/TestimonialsMarquee/TestimonialsMarquee.jsx. The
 * marquee only ever showed the first half of that list, so the second half is
 * seeded INACTIVE: the live page is unchanged, and an admin can switch any of
 * them on.
 */
export const CLIENTS_TESTIMONIALS: Array<{
  quote: string;
  author: string;
  company: string;
  avatarUrl: string;
  fallbackColor: string;
  status: 'ACTIVE' | 'INACTIVE';
}> = [
  {
    quote:
      'UpWon did not just replace software. It rebuilt how we run a bakery business at scale.',
    author: 'Operations Leadership',
    company: 'Monginis',
    avatarUrl: `${UNSPLASH}1560250097-0b93528c311a${AVATAR}`,
    fallbackColor: '#E85A2A',
    status: 'ACTIVE',
  },
  {
    quote:
      'We have been running this business for 130 years. UpWon is the first system that finally speaks our language.',
    author: 'Plant Operations Head',
    company: 'Kaka Halwai',
    avatarUrl: `${UNSPLASH}1507003211169-0a1dd7228f2d${AVATAR}`,
    fallbackColor: '#C8820A',
    status: 'ACTIVE',
  },
  {
    quote: 'We needed a system that could scale to 250 outlets without breaking — UpWon delivered.',
    author: 'Franchise Operations',
    company: 'U2 Cake & Burger',
    avatarUrl: `${UNSPLASH}1573497019940-1c28c88b4f3e${AVATAR}`,
    fallbackColor: '#E91E63',
    status: 'ACTIVE',
  },
  {
    quote: "Our 16-plant footprint runs on one operational spine. The CFO sees today's P&L today.",
    author: 'Finance Director',
    company: 'Monginis',
    avatarUrl: `${UNSPLASH}1519085360753-af0119f7cbe7${AVATAR}`,
    fallbackColor: '#E85A2A',
    status: 'ACTIVE',
  },
  {
    quote: 'FEFO enforced automatically. Expiry write-offs went to zero in our perishable lines.',
    author: 'Supply Chain Head',
    company: 'Vatsalya Dairy',
    avatarUrl: `${UNSPLASH}1472099645785-5658abf4ff4e${AVATAR}`,
    fallbackColor: '#1565C0',
    status: 'INACTIVE',
  },
  {
    quote: "Every rep's day is planned, tracked and measurable — not reported after the fact.",
    author: 'National Sales Manager',
    company: 'Regional FMCG brand',
    avatarUrl: `${UNSPLASH}1500648767791-00dcc994a43e${AVATAR}`,
    fallbackColor: '#006D77',
    status: 'INACTIVE',
  },
  {
    quote:
      'Counter staff went from 11-minute average bills to 5. Festival queues stopped breaking us.',
    author: 'Retail Operations',
    company: 'Kaka Halwai',
    avatarUrl: `${UNSPLASH}1580489944761-15a19d654956${AVATAR}`,
    fallbackColor: '#C8820A',
    status: 'INACTIVE',
  },
  {
    quote:
      'We went live in 32 days. No rip-and-replace. No surprise bills. Promised, delivered.',
    author: 'CIO',
    company: 'Mid-cap food manufacturer',
    avatarUrl: `${UNSPLASH}1506794778202-cad84cf45f1d${AVATAR}`,
    fallbackColor: '#2E7D32',
    status: 'INACTIVE',
  },
];

export interface SeedClientsCaseStory {
  /** Which seeded card this story belongs to. */
  brand: string;
  slug: string;
  duration: string | null;
  challengeOneLine: string | null;
  challengeSummary: string | null;
  /** All of them - the card keeps showing the first three. */
  outcomes: Array<{ value: string; label: string }>;
  challenges: Array<{ title: string; desc: string }>;
  whyUpwon: string | null;
  timeline: Array<{ week: string; title: string; detail: string }>;
  deliverables: string[];
  testimonialQuote: string | null;
  testimonialAuthor: string | null;
  testimonialRole: string | null;
}

/**
 * The full stories behind the three cards, from ALL_CASES in
 * src/data/caseStudy.js and CASE_DELIVERABLES in src/data/industryExtras.js on
 * the website - exported from those files rather than retyped.
 */
export const CLIENTS_CASE_STORIES: SeedClientsCaseStory[] = [
  {
    "brand": "Monginis",
    "slug": "monginis",
    "duration": "30-day go-live · multi-year scale partnership",
    "challengeOneLine": "Excel-based manual processing across 16 plants and growing franchise network.",
    "challengeSummary": "Excel-based manual processing, order consolidation issues, restricted ordering windows, and retail sales invisible to HQ — at a scale where every operational gap compounded into margin leakage.",
    "outcomes": [
      {
        "value": "35 → 200+",
        "label": "Scaled without adding headcount"
      },
      {
        "value": "1 → 3",
        "label": "Plants expanded, same platform"
      },
      {
        "value": "₹20 L+",
        "label": "Daily transactions, fully automated"
      },
      {
        "value": "16",
        "label": "Plants unified on one operational spine"
      },
      {
        "value": "5,000+",
        "label": "Orders processed per day"
      },
      {
        "value": "Zero",
        "label": "P1 incidents during go-live"
      }
    ],
    "challenges": [
      {
        "title": "Excel-based Manual Processing",
        "desc": "Order consolidation done on spreadsheets across plants, distributors and outlets — slow, error-prone, brittle."
      },
      {
        "title": "Restricted Ordering Windows",
        "desc": "Franchise outlets could only place orders within tight windows, limiting growth and creating end-of-day chaos."
      },
      {
        "title": "Retail Sales Invisibility",
        "desc": "No visibility into outlet-level sales, expiry, or sell-through. Replenishment ran on intuition, not data."
      },
      {
        "title": "Inconsistent Outlet Operations",
        "desc": "SOPs varied outlet-to-outlet. Audit scoring was reactive rather than preventive."
      },
      {
        "title": "Margin Leakage at Scale",
        "desc": "Expiry write-offs, manual errors and order drops compounded silently every month at 200+ outlets."
      }
    ],
    "whyUpwon": "Before UpWon, the team evaluated several global ERPs. SAP Business One was overkill on cost and timeline. Tally was incapable of franchise operations. Generic Odoo lacked food vertical depth. UpWon was chosen because it shipped with bakery-specific workflows, hub-spoke franchise model, and an India-native delivery commitment.",
    "timeline": [
      {
        "week": "Week 1",
        "title": "Discovery",
        "detail": "Walked plants and outlets. Mapped SOPs across production, dispatch and franchise."
      },
      {
        "week": "Week 2-3",
        "title": "Configuration",
        "detail": "Modules wired across 16 plants. Master data migrated, integrations built."
      },
      {
        "week": "Week 4",
        "title": "UAT & Training",
        "detail": "Operations leaders ran scenario UAT. Franchise audits trained on SOP playbooks."
      },
      {
        "week": "Day 30",
        "title": "Go-Live",
        "detail": "Plant-by-plant wave rollout with on-site SPOC support. Zero P1 incidents."
      },
      {
        "week": "Month 4+",
        "title": "Scale",
        "detail": "Rolled across 200+ outlets, 3 factories. Daily transactions crossed ₹20L."
      }
    ],
    "deliverables": [
      "Core ERP with batch tracking across 16 plants",
      "FEFO-based dispatch planning across hub-spoke network",
      "Cloud POS deployed at 200+ outlet locations",
      "Royalty engine auto-calculating monthly statements",
      "Franchise audit app on tablet across all outlets",
      "BizPulse mobile dashboard for owners and CXOs"
    ],
    "testimonialQuote": "UpWon did not just replace software. It rebuilt how we run a bakery business at scale — one operational spine, one source of truth, one set of SOPs.",
    "testimonialAuthor": "Operations Leadership",
    "testimonialRole": "Monginis"
  },
  {
    "brand": "Kaka Halwai",
    "slug": "kaka-halwai",
    "duration": "45-day go-live · 60-day full ROI",
    "challengeOneLine": "Multi-software stack across 3 plants with no batch traceability.",
    "challengeSummary": "Three plants running on three different software systems. Perishable goods management was manual. Recipe consistency drift. Billing time average 11 minutes per customer.",
    "outcomes": [
      {
        "value": "18%",
        "label": "Wastage reduction in 60 days."
      },
      {
        "value": "48%",
        "label": "Faster billing"
      },
      {
        "value": "3 plants",
        "label": "Full supply chain integrated"
      },
      {
        "value": "5,000+",
        "label": "Invoices/day handled"
      },
      {
        "value": "700+",
        "label": "Orders/day processed"
      },
      {
        "value": "60 days",
        "label": "Full ROI realised"
      }
    ],
    "challenges": [
      {
        "title": "Multiple software systems",
        "desc": "Three plants on three platforms with manual reconciliation between them."
      },
      {
        "title": "Perishable goods management",
        "desc": "FEFO not enforced. Expiry write-offs visible only at month-end."
      },
      {
        "title": "Recipe consistency drift",
        "desc": "130-year recipes managed in personal notebooks. Drift went unnoticed."
      },
      {
        "title": "Counter POS chaos",
        "desc": "Festival rush + multi-SKU + weight-based pricing = billing bottleneck."
      }
    ],
    "whyUpwon": "The decision came down to UpWon's FEFO logic and counter POS specifically designed for sweets billing. SAP B1 was eliminated on cost and time. Tally was eliminated because counter billing was unworkable.",
    "timeline": [
      {
        "week": "Week 1",
        "title": "Discovery",
        "detail": "3 plant audits, 25 outlet workflows mapped."
      },
      {
        "week": "Week 2-4",
        "title": "Configuration",
        "detail": "ERP + FMS across all 3 plants. POS deployed."
      },
      {
        "week": "Week 5-6",
        "title": "UAT & Training",
        "detail": "Counter and plant staff trained."
      },
      {
        "week": "Day 45",
        "title": "Go-Live",
        "detail": "Phased plant rollout completed."
      }
    ],
    "deliverables": [
      "Core ERP with batch tracking and live yield monitoring across 3 plants",
      "FEFO-based dispatch planning — expiry write-offs eliminated",
      "Outlet billing and transfer management for all 25 outlets",
      "Procurement module with auto-reorder triggers",
      "Same-day financial close — accounts reconciled by EOD",
      "Mobile BizPulse dashboard for management — live data by 7am"
    ],
    "testimonialQuote": "We have been running this business for 130 years. UpWon is the first system that finally speaks our language — sweet by sweet, counter by counter, plant by plant.",
    "testimonialAuthor": "Plant Operations Head",
    "testimonialRole": "Kaka Halwai"
  },
  {
    "brand": "U2 Cake & Burger",
    "slug": "u2-cake",
    "duration": "30-day go-live · scale-ready architecture",
    "challengeOneLine": "High order drop rate, poor inventory visibility, tedious manual billing.",
    "challengeSummary": "Manual order consolidation across 250+ outlets. High order drop rate during peak. Poor inventory visibility across hub-spoke. Tedious billing operations. Blind spots in business at scale.",
    "outcomes": [
      {
        "value": "₹23 L",
        "label": "Daily transactions on platform"
      },
      {
        "value": "6,000+",
        "label": "Orders processed per day"
      },
      {
        "value": "250+",
        "label": "Outlets unified"
      },
      {
        "value": "Live",
        "label": "Swiggy / Zomato / ONDC integrations"
      },
      {
        "value": "Cloud",
        "label": "POS deployed at every counter"
      },
      {
        "value": "Zero",
        "label": "Proportional staff growth at scale"
      }
    ],
    "challenges": [
      {
        "title": "Manual order consolidation",
        "desc": "Each outlet placed orders independently — duplicated, dropped, mismatched."
      },
      {
        "title": "Order drop rate",
        "desc": "High drop rate during peak windows because orders couldn't be processed fast enough."
      },
      {
        "title": "Inventory blind spots",
        "desc": "Hub-spoke inventory tracking was reactive — gaps surfaced as outlet stockouts."
      },
      {
        "title": "Tedious billing",
        "desc": "Manual billing slowed counters during peak. Customer experience suffered."
      }
    ],
    "whyUpwon": "UpWon FMS was the only platform that could handle 250+ outlets with native Swiggy/Zomato integration and cloud POS — without enterprise-grade pricing or 18-month timeline.",
    "timeline": [
      {
        "week": "Week 1",
        "title": "Discovery",
        "detail": "Outlet audits, aggregator integration design."
      },
      {
        "week": "Week 2-3",
        "title": "Configuration",
        "detail": "FMS + POS + connectors built."
      },
      {
        "week": "Week 4",
        "title": "UAT & Training",
        "detail": "Outlet managers trained on FMS and POS."
      },
      {
        "week": "Day 30",
        "title": "Go-Live",
        "detail": "Wave rollout with on-site SPOC support."
      }
    ],
    "deliverables": [
      "FMS & POS deployed across 250+ outlets",
      "Native Swiggy / Zomato / ONDC aggregator integration",
      "Hub-spoke order processing for high-volume operation",
      "Cloud POS with KDS for every outlet",
      "Real-time outlet sales aggregation at HQ",
      "On-call SPOC during wave rollout — zero P1 incidents"
    ],
    "testimonialQuote": "We needed a system that could scale to 250 outlets without breaking — and that could integrate with Swiggy and Zomato natively. UpWon was the only platform that delivered both.",
    "testimonialAuthor": "Franchise Operations",
    "testimonialRole": "U2 Cake & Burger"
  },
];
