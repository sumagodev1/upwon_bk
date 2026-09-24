// src/database/seeds/fms.seed.ts

import { PoolClient } from 'pg';

/**
 * The FMS product page, exactly as it renders today: the four hero slides, the
 * six FAQ questions and the closing band.
 *
 * The copy that heads the FAQ and the band is seeded alongside the other pages'
 * in seed.ts, under ('fms', 'faq') and ('fms', 'cta').
 */

const CTA = { label: 'Talk to a Franchise Specialist', href: '/demo' };
const SECONDARY = { label: 'Watch 2-Min Product Tour', href: '/resources' };
const MICRO_TRUST =
  'Monginis scaled from 35 to 200+ outlets on this system — same back-office team.';

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
    eyebrow: 'Built to Scale',
    headline: 'Your Product Is Built to Scale — Now Build the System That Scales With It.',
    subhead:
      'The recipe works. Make the operating system work just as hard — across every outlet you open.',
    imageUrl: '/images/fms_hero1.webp',
  },
  {
    eyebrow: 'Consistency at Scale',
    headline: 'Your 200th Outlet Will Run as Smooth as Your 5th — With UPWON FMS.',
    subhead:
      'Same recipes, same standards, same numbers — whether it is outlet #5 or outlet #200.',
    imageUrl: '/images/fms_hero2.webp',
  },
  {
    eyebrow: 'Frictionless Expansion',
    headline: 'Open Outlets — Not Problems.',
    subhead:
      'Standardise onboarding, supply and reporting so every new outlet opens clean — not chaotic.',
    imageUrl: '/images/fms_hero3.webp',
  },
  {
    eyebrow: 'Cost Control',
    headline: 'Control — As If You Are Standing in Every Shop.',
    subhead: 'Royalty calculated automatically, from real production cost — not an Excel guess.',
    imageUrl: '/images/fms_hero4.webp',
  },
];

/**
 * The objections franchisors actually raise, which is why they are worded the
 * way they are rather than as generic FAQ boilerplate.
 */
const FAQ_ENTRIES = [
  {
    question: 'We already pay for a POS — why do we need this too?',
    answer:
      'A POS rings up sales at one counter. UpWon FMS is the franchise operating system around it — royalty and brand-fee capture, outlet-level P&L, replenishment from your central kitchen, SOP and brand-standard scoring, and network-wide visibility. The POS becomes one connected piece of that picture, not the whole thing. If your POS already works, we connect to it rather than rip it out.',
  },
  {
    question: 'Will our outlets face any billing disruption during rollout?',
    answer:
      'No. Rollout is phased outlet by outlet, and each outlet keeps billing on its current setup until its go-live is confirmed. We run the new flow in parallel, reconcile the numbers, then switch over — so there is no day where an outlet cannot take an order or raise a bill.',
  },
  {
    question:
      'Our franchisees have very different comfort levels with technology — will onboarding work for all of them?',
    answer:
      'Yes. Outlet and field staff get a guided, mostly tap-based app that works offline and syncs when there is network. We onboard region by region with hands-on training, in-app help and a hyper-care period after each launch — so a tech-shy franchisee and a tech-savvy one both reach the same place.',
  },
  {
    question: 'Is our royalty and franchisee financial data secure?',
    answer:
      'Royalty and franchisee financials sit behind role-based access, encrypted in transit and at rest, with a full audit trail of who viewed or changed what. Each franchisee sees only their own numbers; head office sees the network. Nobody sees data they are not entitled to.',
  },
  {
    question: 'Can we start with just POS and add royalty/compliance later?',
    answer:
      'Yes — that is the intended path. Many networks start with POS and outlet visibility, then switch on royalty, compliance scoring and central-kitchen replenishment when they are ready. Because everything shares one data model, adding a module later is a configuration step, not a re-implementation.',
  },
  {
    question: 'How fast can you adapt as our franchise model evolves?',
    answer:
      'Most changes are configuration, not custom code — new royalty structures, fee slabs, outlet formats (COCO / FOFO / COFO / FOCO), regions and SOP checklists are settings you adjust as you grow. When something genuinely new comes up, our team turns it around without a ground-up rebuild.',
  },
];

/*
 * The artwork paths are percent-encoded as the component wrote them - both
 * files have spaces in their names, and re-spelling them here would seed URLs
 * that 404.
 */
const CTA_SECTION = {
  desktopImageUrl: '/images/CTA%20FMS.webp',
  mobileImageUrl: '/images/cta%20mb%20fms.webp',
  primaryLabel: 'Talk to a Franchise Specialist',
  primaryHref: '/demo',
  secondaryLabel: 'See How This Fits Your Outlet Network',
  secondaryHref: '/contact',
  footnote: 'No obligation. 30 minutes about your franchise network, not a sales pitch.',
};

export async function seedFmsPage(client: PoolClient): Promise<{
  heroSlides: number;
  faqEntries: number;
  ctaSection: number;
}> {
  let heroSlides = 0;
  let faqEntries = 0;
  let ctaSection = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM fms_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO fms_hero_slides
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
    'SELECT COUNT(*) AS count FROM fms_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO fms_faq_entries (question, answer, display_order, status)
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
    'SELECT COUNT(*) AS count FROM fms_cta_section',
  );
  if (Number(existingCta.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO fms_cta_section
        (singleton, desktop_image_url, mobile_image_url,
         primary_label, primary_href, secondary_label, secondary_href, footnote)
      VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7)
      `,
      [
        CTA_SECTION.desktopImageUrl,
        CTA_SECTION.mobileImageUrl,
        CTA_SECTION.primaryLabel,
        CTA_SECTION.primaryHref,
        CTA_SECTION.secondaryLabel,
        CTA_SECTION.secondaryHref,
        CTA_SECTION.footnote,
      ],
    );
    ctaSection = result.rowCount ?? 0;
  }

  return { heroSlides, faqEntries, ctaSection };
}
