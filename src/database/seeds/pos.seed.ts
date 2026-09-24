// src/database/seeds/pos.seed.ts

import { PoolClient } from 'pg';

/**
 * The POS product page, exactly as it renders today: the five hero slides, the
 * six FAQ questions and the closing band.
 *
 * The copy that heads the FAQ and the band is seeded alongside the other pages'
 * in seed.ts, under ('pos', 'faq') and ('pos', 'cta').
 */

const CTA = { label: 'Talk to a Retail Specialist', href: '/demo' };
const SECONDARY = { label: 'Watch 2-Min Product Tour', href: '/resources' };
const MICRO_TRUST = '250+ outlets, 6,000+ orders a day, running on this system today.';

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
    eyebrow: 'Retail Sales Engine',
    headline: 'Your Retail Sales — Growth Engine.',
    subhead:
      'Swiggy, Zomato, CRM, WhatsApp and loyalty — advanced features that turn every counter into a growth engine.',
    imageUrl: '/images/pos_hero1.webp',
  },
  {
    eyebrow: 'Control from Anywhere',
    headline: 'Walk Away from the Counter — Not from the Business.',
    subhead:
      'A secure working environment, role-based access and a detailed DSR — full control even when you are away from the till.',
    imageUrl: '/images/pos_hero2.webp',
  },
  {
    eyebrow: 'One Screen',
    headline: 'One Screen for Your Counter — Your Kitchen and Your Stock.',
    subhead: 'One centralised screen. Absolute control from anywhere, everywhere.',
    imageUrl: '/images/pos_hero3.webp',
  },
  {
    eyebrow: 'Protected Profit',
    headline: 'Accurate Stock — Protected Profit.',
    subhead:
      'POS-level recipe management makes it possible — every sale deducts the real ingredients behind it.',
    imageUrl: '/images/pos_hero4.webp',
  },
  {
    eyebrow: 'Peak-Hour Speed',
    headline: 'Bill in Seconds — Even at Peak Hour.',
    subhead:
      'Online and offline billing with auto-sync — the queue never stops, even when the internet does.',
    imageUrl: '/images/pos_hero5.webp',
  },
];

/**
 * Concrete, counter-level questions a retail or F&B owner actually asks - not
 * enterprise-style due diligence, which is the editorial point of this list.
 */
const FAQ_ENTRIES = [
  {
    question: 'What hardware do I need?',
    answer:
      'Very little. UpWon POS runs on a standard Android tablet or a Windows/Android billing machine you may already own. Add a thermal printer, cash drawer and barcode scanner if you want them — we support common brands like Epson, Zebra, Honeywell and iMin. No proprietary hardware to buy, and no lock-in.',
  },
  {
    question: 'Does it work if my internet goes down?',
    answer:
      'Yes. Billing keeps running in offline mode, so your counter never stops during a network drop. Sales, stock deduction and reports sync automatically the moment your connection is back — nothing is lost and no one has to re-enter anything.',
  },
  {
    question: 'Can I connect Zomato and Swiggy orders directly?',
    answer:
      'Yes. Online orders from Zomato and Swiggy flow into the same screen as your counter sales, so your team bills, tracks stock and reads food cost from one place — not three. No separate tablets to watch, no manual re-punching of aggregator orders.',
  },
  {
    question: 'Can I start with just POS and add more later?',
    answer:
      'That is exactly how it is designed. Start with Core POS today and move up to PRO or PLUS — or into full UpWon ERP and FMS — without re-platforming or re-entering a single record. Your data and history carry forward as you grow.',
  },
  {
    question: 'Is it GST-compliant out of the box?',
    answer:
      'Yes. GST rules, HSN-wise reporting and e-invoicing are built in, not bolted on. Invoices are compliant by default, so you are not doing manual work at month-end to stay on the right side of tax.',
  },
  {
    question: 'How long does setup actually take?',
    answer:
      'Most counters go live in days, not months. We handle setup, catalogue and recipe configuration, staff training and go-live with you — then stay on for ongoing support. For a single outlet it is typically a matter of a short, guided onboarding rather than a long IT project.',
  },
];

/**
 * The closing band, including the handwritten note the background arrow points
 * at. The newline in the note is what draws it on two lines, the same grammar
 * the headings use.
 */
const CTA_SECTION = {
  desktopImageUrl: '/images/cta_pos_desktop.webp',
  mobileImageUrl: '/images/cta_pos_mobile.webp',
  primaryLabel: 'Talk to a Retail Specialist',
  primaryHref: '/demo',
  secondaryLabel: 'See How This Fits Your Counter',
  secondaryHref: '/contact',
  footnote: 'No obligation. 30 minutes about your business, not a sales pitch.',
  note: 'Your Counter.\nOur Focus.',
};

export async function seedPosPage(client: PoolClient): Promise<{
  heroSlides: number;
  faqEntries: number;
  ctaSection: number;
}> {
  let heroSlides = 0;
  let faqEntries = 0;
  let ctaSection = 0;

  const existingSlides = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM pos_hero_slides',
  );
  if (Number(existingSlides.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_hero_slides
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
    'SELECT COUNT(*) AS count FROM pos_faq_entries',
  );
  if (Number(existingFaqs.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_faq_entries (question, answer, display_order, status)
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
    'SELECT COUNT(*) AS count FROM pos_cta_section',
  );
  if (Number(existingCta.rows[0].count) === 0) {
    const result = await client.query(
      `
      INSERT INTO pos_cta_section
        (singleton, desktop_image_url, mobile_image_url,
         primary_label, primary_href, secondary_label, secondary_href, footnote, note)
      VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        CTA_SECTION.desktopImageUrl,
        CTA_SECTION.mobileImageUrl,
        CTA_SECTION.primaryLabel,
        CTA_SECTION.primaryHref,
        CTA_SECTION.secondaryLabel,
        CTA_SECTION.secondaryHref,
        CTA_SECTION.footnote,
        CTA_SECTION.note,
      ],
    );
    ctaSection = result.rowCount ?? 0;
  }

  return { heroSlides, faqEntries, ctaSection };
}
