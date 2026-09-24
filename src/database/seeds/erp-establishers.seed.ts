// src/database/seeds/erp-establishers.seed.ts

import { PoolClient } from 'pg';

/**
 * "Compliant by Design. Connected to What You Already Use." - the badges.
 *
 * The sphere beside them is not seeded here: it draws the home page's
 * integration logos, which seedHomeIntegrationsEntries already puts in place.
 */

const BADGES: Array<{ icon: string; title: string; subtext: string }> = [
  { icon: 'ShieldCheck', title: 'FSSAI-native', subtext: 'Dossier auto-generated per batch' },
  { icon: 'FileCheck', title: 'GST & e-invoice ready', subtext: 'Native, not a plugin' },
  { icon: 'BadgeCheck', title: 'ISO-aligned', subtext: 'Working toward ISO 27001' },
  { icon: 'Award', title: 'CMM Level 3', subtext: 'Documented process rigour' },
];

export async function seedErpEstablishers(client: PoolClient): Promise<number> {
  const existing = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM erp_establisher_badges',
  );
  if (Number(existing.rows[0].count) > 0) return 0;

  const result = await client.query(
    `
    INSERT INTO erp_establisher_badges (icon, title, subtext, display_order, status)
    SELECT u.icon, u.title, u.subtext, u.position, 'ACTIVE'
      FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
        AS u(icon, title, subtext, position)
    `,
    [
      BADGES.map((b) => b.icon),
      BADGES.map((b) => b.title),
      BADGES.map((b) => b.subtext),
      BADGES.map((_, index) => index),
    ],
  );

  return result.rowCount ?? 0;
}
