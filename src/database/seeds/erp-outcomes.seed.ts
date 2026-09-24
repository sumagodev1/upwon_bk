// src/database/seeds/erp-outcomes.seed.ts

import { PoolClient } from 'pg';

/**
 * "What Changed After UPWON - In Their Own Words", as the ERP page renders it.
 *
 * Quotes are stored without their quotation marks: the card draws curly quotes
 * around whatever it is given, so keeping them here would show two sets.
 *
 * The `dark` flag the live file carries on each card is not seeded. The
 * component overrides it with `const dark = false` before using it, so every
 * card renders light and the flag decides nothing.
 */

interface SeedCard {
  industry: string;
  stat: string;
  statLabel: string;
  quote: string;
  authorRole: string;
  authorCompany: string;
  imageUrl: string;
}

const CARDS: SeedCard[] = [
  {
    industry: 'FMCG Distribution',
    stat: '3 routes',
    statLabel: 'under-performing territories identified and cut',
    quote:
      'For the first time we could see profitability by territory — and actually act on it.',
    authorRole: 'National Sales Head',
    authorCompany: 'Regional FMCG brand',
    imageUrl:
      'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=70',
  },
  {
    industry: 'Bakery & Confectionery',
    stat: 'Same-day',
    statLabel: 'credit notes — down from 5–6 days and 3 staff',
    quote: 'Credit notes that used to take days and three people now close the same day.',
    authorRole: 'Finance Director',
    authorCompany: 'Monginis',
    imageUrl:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=70',
  },
  {
    industry: 'Sweets & Namkeen',
    stat: '6 tools → 1',
    statLabel: 'disconnected systems consolidated onto one platform',
    quote: 'We replaced a stack of disconnected tools with one system the whole plant trusts.',
    authorRole: 'Plant Operations Head',
    authorCompany: 'Kaka Foods',
    imageUrl:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=900&q=70',
  },
  {
    industry: 'Food Manufacturing',
    stat: '18%',
    statLabel: 'wastage reduction within the first year',
    quote: 'Batch-level costing showed us exactly where the loss was — and how to stop it.',
    authorRole: 'Operations Director',
    authorCompany: 'Mid-cap food manufacturer',
    imageUrl:
      'https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?auto=format&fit=crop&w=900&q=70',
  },
];

/**
 * Seeds the carousel.
 *
 * Alt text is the company, matching what the live card passes to the image -
 * so a screen reader hears the same thing before and after the switch to the
 * database.
 */
export async function seedErpOutcomes(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM erp_outcome_cards',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO erp_outcome_cards
      (industry, stat, stat_label, quote, author_role, author_company,
       image_url, image_alt, display_order, status)
    SELECT u.industry, u.stat, u.stat_label, u.quote, u.author_role, u.author_company,
           u.image_url, u.author_company, u.position, 'ACTIVE'
      FROM unnest(
             $1::text[], $2::text[], $3::text[], $4::text[],
             $5::text[], $6::text[], $7::text[], $8::int[]
           )
        AS u(industry, stat, stat_label, quote, author_role, author_company,
             image_url, position)
    `,
    [
      CARDS.map((c) => c.industry),
      CARDS.map((c) => c.stat),
      CARDS.map((c) => c.statLabel),
      CARDS.map((c) => c.quote),
      CARDS.map((c) => c.authorRole),
      CARDS.map((c) => c.authorCompany),
      CARDS.map((c) => c.imageUrl),
      CARDS.map((_, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}
