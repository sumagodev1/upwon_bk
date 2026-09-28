// src/database/seeds/why-upwon.seed.ts

import { PoolClient } from 'pg';

/**
 * The Why UpWon page, exactly as it renders today: the hero from the website's
 * WhyUpwonHeroSection, the industry trust row from WhyUpwonIndustryTrust, and
 * the customer trust & testimonials section from WhyUpwonCustomerTrust - whose
 * quotes the site takes from its published case studies - the product proof
 * section from WhyUpwonProductProof, the proof & results section from
 * WhyUpwonResults, and the closing band from WhyUpwonCtaSection.
 */

/**
 * The hero's slides.
 *
 * One today, which is what the page shipped with. It became a list in 082 -
 * before that the copy lived in page_section_copy under ('why-upwon', 'hero')
 * and the artwork in a singleton table, which made this the one hero an
 * editor could not add a second slide to. The second half of the headline is
 * the orange accent.
 */
const HERO_SLIDES = [
  {
    eyebrow: 'WHY UPWON',
    headline: 'Why Growing Manufacturers **Choose UpWon.**',
    subhead:
      'Manufacturing businesses need more than disconnected software and manual processes. UpWon brings your critical workflows, teams, and business data together in one connected platform.',
    desktopImageUrl: '/images/why_hero_desktop.webp',
    mobileImageUrl: '/images/why_hero_mobile.webp',
    imageAlt:
      'The UpWon dashboard on a laptop, surrounded by floating tiles for real-time data, connected teams, automated workflows and complete visibility',
    primaryLabel: 'Explore UpWon',
    primaryHref: '/what-is-upwon',
    secondaryLabel: 'See How It Works',
    secondaryHref: '/demo',
  },
];

/** The copy over the industry trust row. */
const INDUSTRIES_COPY = {
  eyebrow: 'BUILT FOR GROWING BUSINESSES',
  heading: 'Designed to Support Complex **Manufacturing Operations.**',
  subtext:
    'UpWon can support connected workflows across a wide range of engineering and manufacturing environments.',
};

/**
 * The industries, in the order the row shows them. Several engineering
 * categories share one page, which is deliberate.
 */
const INDUSTRIES = [
  {
    label: 'Engineering Components Manufacturing',
    imageUrl: '/images/why_comp_manfacturing.webp',
    href: '/industries/engineering-manufacturing',
  },
  {
    label: 'Industrial Equipment Manufacturing',
    imageUrl: '/images/why_ind_equ_manfacturing.webp',
    href: '/industries/engineering-manufacturing',
  },
  {
    label: 'Machine & Machinery Manufacturing',
    imageUrl: '/images/why_machine_and_machinary.webp',
    href: '/industries/engineering-manufacturing',
  },
  {
    label: 'Automotive Components',
    imageUrl: '/images/why_automotive_components.webp',
    href: '/industries/engineering-manufacturing',
  },
  {
    label: 'Electrical & Electronics Manufacturing',
    imageUrl: '/images/why_electrical_manfacturing.webp',
    href: '/industries/engineering-manufacturing',
  },
  {
    label: 'Beverage & Food Manufacturing',
    imageUrl: '/images/why_beverage_manfacturing.webp',
    href: '/industries/beverage',
  },
  {
    label: 'Consumer Product Manufacturing',
    imageUrl: '/images/why_consumer_product_manfacturing.webp',
    href: '/industries/non-food-fmcg',
  },
];

/** The copy beside the testimonial card. */
const TESTIMONIALS_COPY = {
  eyebrow: 'CUSTOMER TRUST & TESTIMONIALS',
  heading: 'Built Around the Way Modern Businesses **Work.**',
  subtext:
    'From growing manufacturers to multi-plant enterprises, businesses trust UpWon to simplify operations, improve visibility, and run from one connected system.',
};

/** The small lines around the lists. */
const TESTIMONIALS_PANEL = {
  leadLine: 'Trusted by Forward-Thinking Businesses',
  buttonLabel: 'See Customer Stories',
  buttonHref: '/clients',
  wallLabel: 'Trusted by leading brands',
};

/** The quotes the card turns over, as the case studies give them. */
const TESTIMONIALS = [
  {
    quote:
      'UpWon did not just replace software. It rebuilt how we run a bakery business at scale — one operational spine, one source of truth, one set of SOPs.',
    author: 'Operations Leadership',
    role: 'Monginis',
    brand: 'Monginis',
    category: 'Bakery & Confectionery',
    location: 'Sambhajinagar',
    logoUrl: '/images/testimonial/mongignis.webp',
  },
  {
    quote:
      'We have been running this business for 130 years. UpWon is the first system that finally speaks our language — sweet by sweet, counter by counter, plant by plant.',
    author: 'Plant Operations Head',
    role: 'Kaka Halwai',
    brand: 'Kaka Halwai',
    category: 'Sweets & Namkeen',
    location: 'Pune',
    logoUrl: '/images/testimonial/kaka%20halwai.webp',
  },
  {
    quote:
      'We needed a system that could scale to 250 outlets without breaking — and that could integrate with Swiggy and Zomato natively. UpWon was the only platform that delivered both.',
    author: 'Franchise Operations',
    role: 'U2 Cake & Burger',
    brand: 'U2 Cake & Burger',
    category: 'QSR & Franchise F&B',
    location: 'Mumbai',
    logoUrl: '/images/testimonial/u2cake.webp',
  },
];

/** The client wall, in the order it scrolls. */
const CLIENT_LOGOS = [
  { alt: 'Winni', imageUrl: '/images/testimonial/winni.webp' },
  { alt: 'U2 Cake', imageUrl: '/images/testimonial/u2cake.webp' },
  { alt: 'OFC', imageUrl: '/images/testimonial/ofc.webp' },
  { alt: 'Monginis', imageUrl: '/images/testimonial/mongignis.webp' },
  { alt: 'Kaka Halwai', imageUrl: '/images/testimonial/kaka%20halwai.webp' },
  { alt: 'Gokul', imageUrl: '/images/testimonial/gokul.webp' },
];

/** The copy over the product proof artwork. */
const PROOF_COPY = {
  eyebrow: 'BUILT FOR VISIBILITY',
  heading: 'See Everything. **Control Everything.**',
  subtext:
    'UpWon gives your teams a connected view of the information and workflows that matter most. From daily operations to high-level business decisions, the platform helps bring critical information into one place.',
};

/** The dashboard artwork the callouts are pinned to. */
const PROOF_PANEL = {
  imageUrl: '/images/why_product_proof.webp',
  imageAlt:
    'The UpWon dashboard showing sales, purchase, customer and product figures alongside performance charts and recent activity',
};

/**
 * The four callouts, in corner order: top left, top right, bottom left, bottom
 * right. Their corners and icon colours follow this order on the site.
 */
const PROOF_CALLOUTS = [
  {
    title: 'Complete Business Visibility',
    description: 'Get a clearer view of important business activity from one platform.',
    icon: 'BarChart3',
  },
  {
    title: 'Connected Workflows',
    description:
      'Follow processes across teams and departments without switching between disconnected systems.',
    icon: 'Workflow',
  },
  {
    title: 'Actionable Insights',
    description: 'Turn operational information into insights that support better decisions.',
    icon: 'Lightbulb',
  },
  {
    title: 'Centralized Control',
    description:
      'Manage important workflows and business information from one connected environment.',
    icon: 'Settings',
  },
];

/** The copy over the result cards. The line break holds the heading to two lines. */
const RESULTS_COPY = {
  eyebrow: 'BUILT FOR BETTER OPERATIONS',
  heading: 'Less Complexity. More Control.\n**Better Outcomes.**',
  subtext:
    'By connecting workflows and improving visibility, businesses can reduce unnecessary manual work and make decisions with greater confidence.',
};

/** What the three visuals say, and the hub artwork. */
const RESULTS_PANEL = {
  imageUrl: '/images/why_conn_workflow.webp',
  imageAlt:
    'Purchase, inventory, people, reports, finance and settings all connected to UpWon at the centre',
  checklistItems: ['Purchase Orders', 'Invoice Processing', 'Data Entry'],
  checklistStatus: 'Automated',
  trendTitle: 'Business Insights',
  trendBadge: 'Last 30 days',
  trendNote: 'Faster decisions',
  trendNoteSub: 'Better outcomes',
};

/**
 * The three cards, in order: the checklist, the trend chart, the hub. The
 * figures are the brief's suggested results, not verified customer data.
 */
const RESULTS = [
  {
    stat: '30%',
    title: 'Less Manual Work',
    description: 'Reduce repetitive processes and spend more time focusing on meaningful work.',
    icon: 'FileCheck2',
  },
  {
    stat: '2× Faster',
    title: 'Decision Making',
    description:
      'Access connected information and insights without waiting for data from multiple systems.',
    icon: 'BarChart3',
  },
  {
    stat: '100%',
    title: 'Connected Workflows',
    description: 'Create a more connected environment across critical business operations.',
    icon: 'Share2',
  },
];

/** The closing band's copy. It has no eyebrow. */
const CTA_COPY = {
  heading: 'Ready to Connect Your **Business Operations?**',
  subtext:
    'Discover how UpWon can help bring your workflows, teams, and business information together in one connected platform.',
};

/** The closing band: its two crops and two buttons. */
const CTA_BAND = {
  desktopImageUrl: '/images/why_cta_desktop.webp',
  mobileImageUrl: '/images/why_cta_mobile.webp',
  primaryLabel: 'Explore UpWon',
  primaryHref: '/what-is-upwon',
  secondaryLabel: 'Talk to Our Team',
  secondaryHref: '/contact',
};

export async function seedWhyUpwonPage(client: PoolClient): Promise<{
  heroCopy: number;
  heroSection: number;
  industriesCopy: number;
  industries: number;
  testimonialsCopy: number;
  testimonialsPanel: number;
  testimonials: number;
  clientLogos: number;
  proofCopy: number;
  proofPanel: number;
  proofCallouts: number;
  resultsCopy: number;
  resultsPanel: number;
  results: number;
  ctaCopy: number;
  ctaSection: number;
}> {
  /*
   * The hero has no section-copy row any more: since 082 each slide carries
   * its own eyebrow, headline and subhead, so `heroCopy` is always 0 and is
   * kept only so the summary's shape does not change.
   */
  const heroCopy = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM why_upwon_hero_slides',
  );
  let heroSection = 0;
  if (Number(existingSlides.rows[0].count) === 0) {
    const heroSlidesResult = await client.query(
      `
      INSERT INTO why_upwon_hero_slides
        (eyebrow, headline, subhead,
         desktop_image_url, mobile_image_url, image_alt,
         primary_label, primary_href, secondary_label, secondary_href,
         display_order, status)
      SELECT u.eyebrow, u.headline, u.subhead,
             u.desktop_image_url, u.mobile_image_url, u.image_alt,
             u.primary_label, u.primary_href, u.secondary_label, u.secondary_href,
             u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                    $6::text[], $7::text[], $8::text[], $9::text[], $10::text[],
                    $11::int[])
          AS u(eyebrow, headline, subhead, desktop_image_url, mobile_image_url,
               image_alt, primary_label, primary_href, secondary_label,
               secondary_href, position)
      `,
      [
        HERO_SLIDES.map((s) => s.eyebrow),
        HERO_SLIDES.map((s) => s.headline),
        HERO_SLIDES.map((s) => s.subhead),
        HERO_SLIDES.map((s) => s.desktopImageUrl),
        HERO_SLIDES.map((s) => s.mobileImageUrl),
        HERO_SLIDES.map((s) => s.imageAlt),
        HERO_SLIDES.map((s) => s.primaryLabel),
        HERO_SLIDES.map((s) => s.primaryHref),
        HERO_SLIDES.map((s) => s.secondaryLabel),
        HERO_SLIDES.map((s) => s.secondaryHref),
        HERO_SLIDES.map((_, index) => index),
      ],
    );
    heroSection = heroSlidesResult.rowCount ?? 0;
  }

  const industriesCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('why-upwon', 'industries', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [INDUSTRIES_COPY.eyebrow, INDUSTRIES_COPY.heading, INDUSTRIES_COPY.subtext],
  );
  const industriesCopy = industriesCopyResult.rowCount ?? 0;

  let industries = 0;
  const existingIndustries = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM why_upwon_industries',
  );
  if (Number(existingIndustries.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO why_upwon_industries (image_url, label, href, display_order, status)
      SELECT u.image_url, u.label, u.href, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(image_url, label, href, position)
      `,
      [
        INDUSTRIES.map((i) => i.imageUrl),
        INDUSTRIES.map((i) => i.label),
        INDUSTRIES.map((i) => i.href),
        INDUSTRIES.map((_, index) => index),
      ],
    );
    industries = result.rowCount ?? 0;
  }

  const testimonialsCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('why-upwon', 'testimonials', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [TESTIMONIALS_COPY.eyebrow, TESTIMONIALS_COPY.heading, TESTIMONIALS_COPY.subtext],
  );
  const testimonialsCopy = testimonialsCopyResult.rowCount ?? 0;

  const testimonialsPanelResult = await client.query(
    `
    INSERT INTO why_upwon_testimonials_panel
      (singleton, lead_line, button_label, button_href, wall_label)
    VALUES (TRUE, $1, $2, $3, $4)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [
      TESTIMONIALS_PANEL.leadLine,
      TESTIMONIALS_PANEL.buttonLabel,
      TESTIMONIALS_PANEL.buttonHref,
      TESTIMONIALS_PANEL.wallLabel,
    ],
  );
  const testimonialsPanel = testimonialsPanelResult.rowCount ?? 0;

  let testimonials = 0;
  const existingTestimonials = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM why_upwon_testimonials',
  );
  if (Number(existingTestimonials.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO why_upwon_testimonials
        (quote, author, role, brand, category, location, logo_url, display_order, status)
      SELECT u.quote, u.author, u.role, u.brand, u.category, u.location, u.logo_url,
             u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
                    $7::text[], $8::int[])
          AS u(quote, author, role, brand, category, location, logo_url, position)
      `,
      [
        TESTIMONIALS.map((t) => t.quote),
        TESTIMONIALS.map((t) => t.author),
        TESTIMONIALS.map((t) => t.role),
        TESTIMONIALS.map((t) => t.brand),
        TESTIMONIALS.map((t) => t.category),
        TESTIMONIALS.map((t) => t.location),
        TESTIMONIALS.map((t) => t.logoUrl),
        TESTIMONIALS.map((_, index) => index),
      ],
    );
    testimonials = result.rowCount ?? 0;
  }

  let clientLogos = 0;
  const existingLogos = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM why_upwon_client_logos',
  );
  if (Number(existingLogos.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO why_upwon_client_logos (image_url, alt, display_order, status)
      SELECT u.image_url, u.alt, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[]) AS u(image_url, alt, position)
      `,
      [
        CLIENT_LOGOS.map((l) => l.imageUrl),
        CLIENT_LOGOS.map((l) => l.alt),
        CLIENT_LOGOS.map((_, index) => index),
      ],
    );
    clientLogos = result.rowCount ?? 0;
  }

  const proofCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('why-upwon', 'proof', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [PROOF_COPY.eyebrow, PROOF_COPY.heading, PROOF_COPY.subtext],
  );
  const proofCopy = proofCopyResult.rowCount ?? 0;

  const proofPanelResult = await client.query(
    `
    INSERT INTO why_upwon_proof_panel (singleton, image_url, image_alt)
    VALUES (TRUE, $1, $2)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [PROOF_PANEL.imageUrl, PROOF_PANEL.imageAlt],
  );
  const proofPanel = proofPanelResult.rowCount ?? 0;

  let proofCallouts = 0;
  const existingCallouts = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM why_upwon_proof_callouts',
  );
  if (Number(existingCallouts.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO why_upwon_proof_callouts (title, description, icon, display_order, status)
      SELECT u.title, u.description, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
          AS u(title, description, icon, position)
      `,
      [
        PROOF_CALLOUTS.map((c) => c.title),
        PROOF_CALLOUTS.map((c) => c.description),
        PROOF_CALLOUTS.map((c) => c.icon),
        PROOF_CALLOUTS.map((_, index) => index),
      ],
    );
    proofCallouts = result.rowCount ?? 0;
  }

  const resultsCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('why-upwon', 'outcomes', $1, $2, $3)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [RESULTS_COPY.eyebrow, RESULTS_COPY.heading, RESULTS_COPY.subtext],
  );
  const resultsCopy = resultsCopyResult.rowCount ?? 0;

  const resultsPanelResult = await client.query(
    `
    INSERT INTO why_upwon_results_panel
      (singleton, image_url, image_alt, checklist_items, checklist_status,
       trend_title, trend_badge, trend_note, trend_note_sub)
    VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [
      RESULTS_PANEL.imageUrl,
      RESULTS_PANEL.imageAlt,
      RESULTS_PANEL.checklistItems,
      RESULTS_PANEL.checklistStatus,
      RESULTS_PANEL.trendTitle,
      RESULTS_PANEL.trendBadge,
      RESULTS_PANEL.trendNote,
      RESULTS_PANEL.trendNoteSub,
    ],
  );
  const resultsPanel = resultsPanelResult.rowCount ?? 0;

  let results = 0;
  const existingResults = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM why_upwon_results',
  );
  if (Number(existingResults.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO why_upwon_results (stat, title, description, icon, display_order, status)
      SELECT u.stat, u.title, u.description, u.icon, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
          AS u(stat, title, description, icon, position)
      `,
      [
        RESULTS.map((r) => r.stat),
        RESULTS.map((r) => r.title),
        RESULTS.map((r) => r.description),
        RESULTS.map((r) => r.icon),
        RESULTS.map((_, index) => index),
      ],
    );
    results = result.rowCount ?? 0;
  }

  const ctaCopyResult = await client.query(
    `
    INSERT INTO page_section_copy (page_key, section_key, eyebrow, heading, subtext)
    VALUES ('why-upwon', 'cta', NULL, $1, $2)
    ON CONFLICT (page_key, section_key) DO NOTHING
    `,
    [CTA_COPY.heading, CTA_COPY.subtext],
  );
  const ctaCopy = ctaCopyResult.rowCount ?? 0;

  const ctaSectionResult = await client.query(
    `
    INSERT INTO why_upwon_cta_section
      (singleton, desktop_image_url, mobile_image_url,
       primary_label, primary_href, secondary_label, secondary_href)
    VALUES (TRUE, $1, $2, $3, $4, $5, $6)
    ON CONFLICT (singleton) DO NOTHING
    `,
    [
      CTA_BAND.desktopImageUrl,
      CTA_BAND.mobileImageUrl,
      CTA_BAND.primaryLabel,
      CTA_BAND.primaryHref,
      CTA_BAND.secondaryLabel,
      CTA_BAND.secondaryHref,
    ],
  );
  const ctaSection = ctaSectionResult.rowCount ?? 0;

  return {
    heroCopy,
    heroSection,
    industriesCopy,
    industries,
    testimonialsCopy,
    testimonialsPanel,
    testimonials,
    clientLogos,
    proofCopy,
    proofPanel,
    proofCallouts,
    resultsCopy,
    resultsPanel,
    results,
    ctaCopy,
    ctaSection,
  };
}
