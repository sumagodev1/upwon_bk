// src/database/seeds/about-page.data.ts

/**
 * The five About page sections with the copy the website renders today, so the
 * first migrate publishes the page's own words rather than a placeholder. Sources,
 * on the website:
 *
 *   src/pages/About/sections/AboutHeroSection/AboutHeroSection.jsx
 *   src/pages/About/AboutPage.jsx                 - the founder band, ~lines 185-240
 *   src/data/company.js                           - COMPANY.founder
 *   src/pages/About/sections/TeamAndValuesSection/TeamAndValuesSection.jsx
 *   src/pages/About/sections/AboutNumbersSection/AboutNumbersSection.jsx
 *   src/pages/About/sections/AboutCtaSection/AboutCtaSection.jsx
 *
 * Every string below is verbatim, em dashes, '&' and curly apostrophes included: a
 * seed that "tidied" the copy would show up as a diff on a live page the first
 * time it is run. Where the page composes a line out of several JSX nodes or
 * several fields, the note beside the value says exactly how.
 *
 * THE WORDS ARE UNCHANGED; THE HERO IS NOT PIXEL-FOR-PIXEL. Four of the five
 * sections do read identically once published - the founder note, the team copy,
 * the numbers copy and the CTA all render through the same markup either way. The
 * hero does not, because the section is one set of copy over a backdrop list and
 * the component it replaces is three slides:
 *
 *   the headline's treatment changes. Unpublished, HeroSlider splits a plain
 *   string on its em dash and renders the setup at 0.84em/medium and the payoff
 *   extrabold, inline, both white. Published, it renders through headingLines like
 *   every other CMS headline on the site: full size on line one, a hard break, and
 *   the accented half in gradient-text-orange. Same words, different ramp, one
 *   forced break, one colour;
 *
 *   slides two and three lose their copy AND their secondary buttons. The
 *   rotation becomes three photographs behind one fixed copy block, so 'Seven
 *   Integrated Platforms' and 'Bootstrapped, Customer-Funded and Nashik-Born' stop
 *   being shown, and with them the only links to /clients ('Meet Our Clients') and
 *   /careers ('Join Us') this hero carried.
 *
 * Both follow from the shape the hero was asked for and neither is a defect in
 * this file, but they are a visible change on the first migrate and this docstring
 * is not the place to imply otherwise. An about_hero_slides child list - one
 * eyebrow, heading, subtext, backdrop and optional secondary link per slide - is
 * what would keep all three, and it is a schema change, not a seed change.
 *
 * What changes shape:
 *
 *   headings   The page writes them as JSX - a text node and a
 *              <span className="gradient-text-orange"> around the closing
 *              phrase, sometimes with a <br /> between. That is exactly what the
 *              home page's heading markup (modules/home-page/utils/heading-markup)
 *              expresses as text: a newline is a line break, **like this** is the
 *              accent. The four sections that have a headline are stored that way.
 *
 *   the hero   The component holds THREE slides, each with its own headline,
 *              subhead, backdrop and secondary button, and rotates them. The
 *              section is one row with one set of copy and an ordered list of
 *              backdrops, so the copy seeded here is the first slide's - the one a
 *              visitor lands on, and the one the page's own comment calls the
 *              page's angle - and all three backdrops are kept, in their existing
 *              order, so the rotation continues. The second and third slides' copy
 *              and secondary links stop being shown once this is published; see the
 *              note above, which spells out exactly what a reader of /about sees
 *              change.
 *
 *   the team   Each card's grey line is composed from two fields of the page's
 *              hardcoded array, joined with ' · ' - so it is seeded as the one
 *              line it renders as. See 025_about_page_team.sql for why the column
 *              is one line rather than two fields.
 *
 * NO PHOTOGRAPHS are seeded for the founder or the six people: those slots are
 * NULL, which is what keeps today's initials monograms on the page. Seeding a
 * portrait would change /about on the first migrate, which is precisely what a
 * seed must not do. The CTA banner IS seeded with the path the site already
 * ships, because that artwork is the section rather than a placeholder standing in
 * for a person.
 *
 * The hero's three backdrops are seeded as the remote URLs the page already uses.
 * They are Unsplash rather than local files - the component says so and says to
 * swap in local webp when dedicated artwork exists - and an admin replacing one
 * uploads a file, at which point that entry switches to imageFileId. Both sources
 * are mutually exclusive per entry.
 *
 * No discovery calls are seeded. Every row in about_discovery_calls is a real
 * person who really asked for a call, and inventing a few would put fake names
 * and mobile numbers in front of an admin who has no way to tell them from the
 * real thing - the same reason careers.data.ts and partner-program.data.ts seed no
 * applications.
 *
 * The parts of /about that are NOT in this CMS are not here either: the timeline,
 * the Nashik pride band, the four operating principles under the team, the
 * client-logo strip under the numbers, the Byte Elephants facts and the
 * global-ambition block all stay static in the website's own code.
 */

// ── hero ──────────────────────────────────────────────────────────────────

export interface SeedAboutHero {
  eyebrow: string;
  /** Home page heading markup: a newline is a line break, **like this** accents. */
  heading: string;
  subtext: string;
  /** The rotating backdrops, in the order the slider shows them. */
  backdrops: { imageUrl: string; imageFileId: null }[];
}

/** The base every backdrop URL in the component is built from. */
const UNSPLASH = 'https://images.unsplash.com/photo-';

export const ABOUT_HERO: SeedAboutHero = {
  // AboutHeroSection.jsx's EYEBROW constant, upper-cased there and stored as
  // typed - the pill's styling is the site's business, not this column's.
  eyebrow: 'ABOUT UPWON & BYTE ELEPHANTS TECHNOLOGIES',
  /*
   * Slide one's headline, in the site's heading markup: the newline is the break
   * before the payoff, and the ** is the accent every other CMS-authored headline
   * on the site uses for the same emphasis. The em dash is kept because it is in
   * the copy.
   *
   * This is the closest the markup gets to what the unpublished slider draws - it
   * splits the string on the em dash and leans on size and weight instead of a
   * break and a colour - and it is not the same picture. The docstring at the top
   * says what a reader sees change; the words are identical either way.
   */
  heading:
    'We Build Software That Understands Your Business —\n**Because We Have Lived In It.**',
  subtext:
    'UpWon is a bootstrapped Food & FMCG ERP built in Nashik by people who ran factory floors, delivery routes and franchise counters long before writing a line of code.',
  // BG_TEAM, BG_WORKSHOP, BG_PLANT, in the order heroSlides lists them.
  backdrops: [
    {
      imageUrl: `${UNSPLASH}1521737711867-e3b97375f902?auto=format&fit=crop&w=1600&q=60`,
      imageFileId: null,
    },
    {
      imageUrl: `${UNSPLASH}1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=60`,
      imageFileId: null,
    },
    {
      imageUrl: `${UNSPLASH}1517433367423-c7e5b0f35086?auto=format&fit=crop&w=1600&q=60`,
      imageFileId: null,
    },
  ],
};

// ── founder note ──────────────────────────────────────────────────────────

export interface SeedAboutFounderNote {
  founderName: string;
  founderRole: string;
  companyLine: string;
  quote: string;
  body: string;
}

export const ABOUT_FOUNDER_NOTE: SeedAboutFounderNote = {
  // COMPANY.founder.name / .role in src/data/company.js.
  founderName: 'Neil SR Mashalkar',
  founderRole: 'Founder & CEO',
  // Hardcoded on the card in AboutPage.jsx, under the role.
  companyLine: 'Founder of Byte Elephants Technologies',
  // COMPANY.founder.quote. The page draws the “ ” around it, so they are not
  // stored.
  quote:
    'Food businesses in India deserve software built for them — not retrofitted, not generic. Purpose-built.',
  // The paragraph under the quote, written across three source lines that HTML
  // collapses to single spaces - so it is stored as the one paragraph it renders
  // as.
  body: 'Nine years on factory floors, delivery trucks, franchise counters and 14-hour finance reconciliations went into every line of UpWon — written from the inside, not from a spec.',
};

// ── people ────────────────────────────────────────────────────────────────

export interface SeedAboutTeamSection {
  eyebrow: string;
  heading: string;
  subtext: string;
}

export const ABOUT_TEAM_SECTION: SeedAboutTeamSection = {
  eyebrow: 'People & principles',
  // <SectionIntro title> - one line, the closing phrase in the accent span.
  heading: 'The team behind UpWon — **and what we live by.**',
  subtext:
    'Six senior leads. Four operating principles. Each principle is a hiring filter, a product gate and a customer promise — not a poster.',
};

export interface SeedAboutTeamMember {
  name: string;
  role: string;
  /** The card's grey line: the page's `based` and `domain`, joined with ' · '. */
  meta: string;
}

/**
 * The six cards the TEAM array renders, in its order.
 *
 * The first is the founder, whose name and role the array reads from
 * COMPANY.founder. The other five are the placeholder names the page ships -
 * realistic role titles standing in until the senior leadership is named, as the
 * component's own comment says - and they are seeded exactly as they read, because
 * the point of this seed is that the page does not change. Renaming them is the
 * first thing an admin will do in the People tab, which is the whole reason the
 * tab exists.
 *
 * Their bios, focus lists and LinkedIn URLs are NOT here: the cards do not render
 * them, only the detail popup does, and the user asked for the cards. The popup's
 * copy stays in the website's code.
 */
export const ABOUT_TEAM_MEMBERS: SeedAboutTeamMember[] = [
  {
    name: 'Neil SR Mashalkar',
    role: 'Founder & CEO',
    meta: 'Nashik · Vision · Domain · Customer',
  },
  {
    name: 'CTO / Co-founder',
    role: 'Chief Technology Officer',
    meta: 'Nashik · Platform · Architecture · Scale',
  },
  {
    name: 'Head of Engineering',
    role: 'VP Engineering',
    meta: 'Nashik / Bangalore · Delivery · Quality · DevEx',
  },
  {
    name: 'Head of Customer Success',
    role: 'VP Customer Success',
    meta: 'Pune · Onboarding · CSM · Renewals',
  },
  {
    name: 'Head of Product',
    role: 'VP Product',
    meta: 'Nashik · Product · Research · Roadmap',
  },
  {
    name: 'Head of Domain',
    role: 'Food & FMCG Practice Lead',
    meta: 'Nashik · Industry · Compliance · Solutions',
  },
];

// ── numbers ───────────────────────────────────────────────────────────────

export interface SeedAboutNumbersSection {
  eyebrow: string;
  heading: string;
  subtext: string;
}

export const ABOUT_NUMBERS_SECTION: SeedAboutNumbersSection = {
  eyebrow: 'UpWon in numbers',
  heading: 'The numbers behind the company — **honestly defensible.**',
  subtext:
    'We round small numbers, not big ones. Every stat below is something we can pull up in a customer review.',
};

export interface SeedAboutNumberStat {
  /** The big number as the card prints it: the digits and whatever follows them. */
  value: string;
  label: string;
  description: string;
}

/**
 * The four cards the STATS array renders, in its order.
 *
 * Each card's number and suffix are stored as the one string they are printed as
 * - see 026_about_page_numbers.sql for why.
 *
 * The second card's number is PLATFORM_MODULES.length in the component, which is
 * 7 today. Seeded as '7', because a column cannot hold "however many modules
 * there are" and the seed's job is to reproduce what the page shows. If the suite
 * ever gains an eighth platform, this card is edited in the Number tab like any
 * other copy - which is a change somebody should be making deliberately anyway,
 * since the description beside it lists all seven by name.
 */
export const ABOUT_NUMBER_STATS: SeedAboutNumberStat[] = [
  {
    value: '150+',
    label: 'Businesses Deployed',
    description: 'Across food, FMCG and franchise verticals',
  },
  {
    value: '7',
    label: 'Enterprise Platforms',
    description: 'ERP · SFA-DMS · FMS · POS · HRMS · WMS · Vendor Portal',
  },
  {
    value: '12+',
    label: 'Years Domain Expertise',
    description: "Inside India's food belt — 2016 to today",
  },
  {
    value: '98%',
    label: 'Customer Retention',
    description: 'Yearly. Verified across deployed accounts.',
  },
];

// ── closing CTA ───────────────────────────────────────────────────────────

export interface SeedAboutCta {
  heading: string;
  subtext: string;
  /** The wide banner the site already ships. The phone crop stays in its code. */
  imageUrl: string;
}

export const ABOUT_CTA: SeedAboutCta = {
  // The component's HEADING node, which echoes the line printed on the office
  // wall in the artwork itself.
  heading: 'Smarter Businesses. Stronger Industries. **Brighter Futures.**',
  subtext:
    'Nine years inside India’s food belt, seven integrated platforms and 50+ live deployments. See what that adds up to for your own operations.',
  imageUrl: '/images/about_cta_desktop.webp',
};
