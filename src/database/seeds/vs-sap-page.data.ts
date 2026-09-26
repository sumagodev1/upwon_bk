// src/database/seeds/vs-sap-page.data.ts

/**
 * The /compare/upwon-vs-sap content the website previously held as static data,
 * so the page renders identically the moment it starts reading from the API,
 * and the admin panel shows today's content from its first run. Sources, on the
 * website:
 *
 *   hero          HERO_SLIDES in src/pages/VsSap/VsSapPage.jsx - the one
 *                 slide's eyebrow, headline, subhead and backdrop (its two
 *                 buttons, and where they go, stay in the page's code)
 *   answer        the "The straight answer" band in the same file - the
 *                 SectionIntro's eyebrow and title, the two cards' titles,
 *                 WINS and WHEN_SAP, and the italic line under the second card
 *   comparison    the shared ComparisonMatrix component
 *                 (src/components/shared/ComparisonMatrix/ComparisonMatrix.jsx)
 *                 as this page draws it - its SectionHeading copy, and the TCO
 *                 row's labels for the upwon, sap and netsuite columns
 *   capabilities  COMPETITORS in src/data/metrics.js - every row's capability
 *                 and its upwon, sap and netsuite ratings, in order
 *
 * Every string below is verbatim, dashes included: a seed that "tidied" the
 * copy would show up as a diff on the live page the first time it is run. The
 * keys are renamed to the columns they fill (headline -> heading, subhead ->
 * subtext, bg -> imageUrl, WINS -> upwonPoints, WHEN_SAP -> sapPoints), and
 * nothing else changes. The answer heading's accent is written in the heading
 * markup: the JSX draws 'No Spin.' in the orange span, so it is '**No Spin.**'.
 *
 * imageUrl fills vs_sap_hero_slides.image_url, which is legacy / seed-only: the
 * admin API takes a picture as an upload and never writes a URL into it, and
 * this picture - the site's shared hero artwork - has no uploaded file behind
 * it, so the seed is the only place it comes from. The slide's first upload
 * replaces it.
 *
 * Not seeded: the hero's accent colour, the table's column headers and the TCO
 * cells' colours, which stay in the site's code, and a phone crop
 * (mobile_image_file_id) - the page has none, so the seeded slide serves its
 * one picture at every width until somebody uploads one.
 */

export interface SeedVsSapHeroSlide {
  eyebrow: string;
  heading: string;
  subtext: string;
  /** The seeded backdrop (image_url - legacy / seed-only, see above). */
  imageUrl: string;
}

export interface SeedVsSapAnswerSection {
  eyebrow: string;
  heading: string;
  upwonTitle: string;
  upwonPoints: string[];
  sapTitle: string;
  sapPoints: string[];
  closingLine: string;
}

export interface SeedVsSapComparisonSection {
  eyebrow: string;
  heading: string;
  subtext: string;
  tcoUpwon: string;
  tcoSap: string;
  tcoNetsuite: string;
}

export interface SeedVsSapCapability {
  capability: string;
  upwon: number;
  sap: number;
  netsuite: number;
}

export const VS_SAP_HERO_SLIDES: SeedVsSapHeroSlide[] = [
  {
    eyebrow: 'HONEST COMPARISON',
    heading: 'UpWon vs SAP Business One — Where Each One Wins.',
    subtext:
      "The straight comparison most vendors won't give you. Built for Food & FMCG operators making a real evaluation decision.",
    imageUrl: '/images/hero%20bg.webp',
  },
];

export const VS_SAP_ANSWER_SECTION: SeedVsSapAnswerSection = {
  eyebrow: 'The straight answer',
  heading: 'When UpWon Wins. When SAP Wins. **No Spin.**',
  upwonTitle: 'Why food & FMCG operators choose UpWon',
  upwonPoints: [
    'Does 80% of what SAP B1 does for food manufacturers — at 20% of the cost',
    '5-year implementation becomes 30-45 day go-live',
    'No hidden consulting fees — domain depth reduces customisation to near-zero',
    'Indian regulatory compliance native — SAP requires costly Indianisation',
    'Sub-vertical editions for bakery, dairy, spices — unique to UpWon',
    'CEO can call the product team — SAP B1 clients cannot',
  ],
  sapTitle: 'When SAP B1 is the right choice',
  sapPoints: [
    'Global multi-currency operations across 20+ countries',
    'Manufacturing at scale beyond food/FMCG (heavy industry, automotive)',
    'A dedicated 10+ person IT team to maintain the deployment',
    'Budget approved at Fortune 500 levels with 18-month rollout patience',
  ],
  closingLine: 'For 95% of Indian food & FMCG manufacturers, UpWon is the better fit.',
};

export const VS_SAP_COMPARISON_SECTION: SeedVsSapComparisonSection = {
  eyebrow: 'Capability comparison',
  heading: 'UpWon vs the market — capability by capability.',
  subtext:
    'Star ratings reflect out-of-the-box capability, not what can be built with custom development.',
  tcoUpwon: 'BEST',
  tcoSap: 'HIGHEST',
  tcoNetsuite: 'VERY HIGH',
};

/** Every COMPETITORS row, in data/metrics.js's own order. */
export const VS_SAP_CAPABILITIES: SeedVsSapCapability[] = [
  { capability: 'Food vertical depth (native)', upwon: 5, sap: 3, netsuite: 3 },
  { capability: 'FSSAI compliance (native)', upwon: 5, sap: 0, netsuite: 0 },
  { capability: 'Indian statutory compliance', upwon: 5, sap: 2, netsuite: 2 },
  { capability: 'AI / demand forecasting', upwon: 4, sap: 3, netsuite: 3 },
  { capability: 'Implementation speed', upwon: 5, sap: 1, netsuite: 2 },
  { capability: 'SFA-DMS (India GT/MT model)', upwon: 5, sap: 0, netsuite: 0 },
  { capability: 'Franchise / outlet management', upwon: 5, sap: 0, netsuite: 0 },
  { capability: 'Indian pricing affordability', upwon: 5, sap: 1, netsuite: 1 },
  { capability: 'Enterprise scalability', upwon: 4, sap: 5, netsuite: 5 },
  { capability: 'Mobile-first SFA', upwon: 5, sap: 2, netsuite: 3 },
  { capability: 'Sub-vertical editions', upwon: 5, sap: 2, netsuite: 2 },
];
