// src/database/seeds/erp-journey.seed.ts

import { PoolClient } from 'pg';

/**
 * "UPWON ERP - Benefits for Everyone", exactly as the ERP page renders it.
 *
 * Kept in its own file for the same reason the industry switcher is: five
 * audiences carrying forty lines between them reads better beside its own notes
 * than buried in the shared seed.
 *
 * The eyebrow on each row reads "For the {role} · {context}" on the live page.
 * It is split here because that is how it is stored - the API composes the
 * sentence back, so the website component never holds the pattern.
 */

interface SeedPersona {
  role: string;
  context: string;
  title: string;
  description: string;
  /** Set to animate up from zero. Exclusive with metricText. */
  metricCountTo: number | null;
  /** Set for a figure that cannot count, like a range. Exclusive with metricCountTo. */
  metricText: string | null;
  metricSuffix: string | null;
  metricLabel: string;
  authorDesignation: string;
  authorCompany: string;
  avatarUrl: string;
  avatarColor: string;
  outcomes: string[];
  points: string[];
}

const PERSONAS: SeedPersona[] = [
  {
    role: 'Operator',
    context: 'Plant floor, QC, stores & gate',
    title: 'Cut wastage, bill same-day',
    description:
      'The plant floor, QC, stores, billing and gate recorded in-system — not on paper, not revalidated by hand.',
    metricCountTo: 18,
    metricText: null,
    metricSuffix: '%',
    metricLabel: 'wastage reduction within the first year (Kaka Foods)',
    authorDesignation: 'Plant Operations Head',
    authorCompany: 'Kaka Foods',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=70',
    avatarColor: '#C8820A',
    outcomes: [
      'Credit notes cut from 5–6 days and 3 staff to same-day (Kaka Foods)',
      '18% wastage reduction within the first year (Kaka Foods)',
      'Billing 48% faster at the point of dispatch (Kaka Foods)',
      'Batch and expiry tracked automatically via FEFO — no manual log',
    ],
    points: [
      'Recipe/BOM and batch costing calculated by the system, not revalidated by hand',
      'In-process QC and batch hold/release built into the workflow, not a separate paper trail',
      'Vendor GRN matched against PO and quality gate automatically',
      'Gate entry, exit and dispatch recorded digitally instead of a logbook',
    ],
  },
  {
    role: 'Manager',
    context: 'Production, QC & Finance',
    title: 'See every plant in real time',
    description:
      'No real-time view of yield or quality holds, multi-plant stock invisible from one place, month-end close taking weeks.',
    metricCountTo: null,
    metricText: '50–80%',
    metricSuffix: null,
    metricLabel: 'reduction in operational leakage within plant operations',
    authorDesignation: 'Production & QC Manager',
    authorCompany: 'Kaka Foods',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=70',
    avatarColor: '#006D77',
    outcomes: [
      '50–80% reduction in operational leakage within plant operations',
      '20–35% higher dispatch and fulfilment accuracy from the plant',
      'Month-end close taken from weeks to a single, real-time process (Kaka Foods)',
      'Cost per batch and per SKU visible same-day, not reconstructed at month-end',
    ],
    points: [
      'Multi-plant inventory and production visible from one screen',
      'Quality holds and rejects flagged in real time, not discovered after dispatch',
      'Wastage and yield variance visible by batch, shift and SKU',
      'Cost Centre and Asset Management tracked in-system, not on parallel spreadsheets',
    ],
  },
  {
    role: 'CTO',
    context: 'Technology & data architecture',
    title: 'One connected data model',
    description:
      'Stitched-together point systems, unclear data architecture and mounting integration debt.',
    metricCountTo: 10,
    metricText: null,
    metricSuffix: null,
    metricLabel: 'connected modules on one data model',
    authorDesignation: 'Technology Lead',
    authorCompany: 'Live UPWON deployment',
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=70',
    avatarColor: '#2E7D32',
    outcomes: [
      '10 connected modules — Procurement, Production, Quality, Inventory, Dispatch, Sales & Billing, Finance, Cost Centre, Gate, Asset Management — on one data model',
      '3,500+ daily ERP users live today — proven at real transaction volume, not a pilot',
      'FSSAI, GST and e-invoice compliance built into the core data model, not a bolt-on',
      'Live accounting-system interoperability with Tally, SAP, Oracle and MS Dynamics',
    ],
    points: [
      'One data model across procurement through finance — no separate systems to sync',
      'Production numbers flow into inventory and finance automatically, no manual reconciliation',
      'SOP-documented go-live process, not an ad hoc customisation project',
      'Working toward ISO 27001 readiness and DPDP Act alignment (in progress, not yet certified)',
    ],
  },
  {
    role: 'CFO',
    context: 'Cost, compliance & return',
    title: 'Live cost and margin visibility',
    description:
      'Unclear ROI, statutory risk, and working capital tied up in slow reconciliation.',
    metricCountTo: null,
    metricText: '8–18%',
    metricSuffix: null,
    metricLabel: 'profitability improvement within 6–12 months',
    authorDesignation: 'Finance Director',
    authorCompany: 'Kaka Foods',
    avatarUrl:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=70',
    avatarColor: '#E85A2A',
    outcomes: [
      '8–18% profitability improvement within 6–12 months',
      '50–80% reduction in plant-level operational leakage',
      'Credit note cycle: 5–6 days and 3 staff, down to same-day (Kaka Foods)',
      'A fraction of the 3-year total cost of ownership of SAP B1 or Oracle NetSuite at comparable ERP depth',
    ],
    points: [
      'Cost per batch and per SKU visible in real time, not reconstructed at month-end',
      'GST, e-invoice and FSSAI compliance native — lower statutory and audit exposure',
      'Asset Management and Cost Centre MIS remove the need for parallel finance trackers',
      'Faster, more predictable close instead of a multi-week scramble',
    ],
  },
  {
    role: 'CEO / Founder',
    context: 'Scaling the plant',
    title: 'Scale without the chaos',
    description:
      'A new plant adds headcount and chaos before it adds output; production truth scattered across registers, Excel and memory.',
    metricCountTo: 8,
    metricText: null,
    metricSuffix: ' yrs',
    metricLabel: 'of live production deployment — proven, not a first-time bet',
    authorDesignation: 'Founder & CEO',
    authorCompany: 'Kaka Foods',
    avatarUrl:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=70',
    avatarColor: '#1565C0',
    outcomes: [
      '8–18% profitability improvement within 6–12 months',
      '18% wastage reduction within the first year at a live plant (Kaka Foods)',
      '3,500+ people running the ERP daily, across live plants',
      '8 years of live production deployment — proven, not a first-time bet',
    ],
    points: [
      'A new plant can be added without adding proportional back-office headcount',
      'Production, quality and finance trusted as one source, not reconciled from silos',
      'Margin visible at the batch level, not discovered at month-end',
      'Leadership time shifts from firefighting the plant to running the business',
    ],
  },
];

/**
 * The company-wide figures beside each audience's own headline metric.
 *
 * Section-level: the same three show whichever audience is selected, so they
 * are written once rather than five times.
 */
const STATS: Array<{ value: string; label: string }> = [
  { value: '3,500+', label: 'Daily ERP users' },
  { value: '10', label: 'Connected modules' },
  { value: '8 yrs', label: 'Live deployment' },
];

/**
 * Seeds the audiences with their two lists, and the shared statistics row.
 *
 * Guarded on each table separately, so a half-seeded database fills in only the
 * part that is missing. The child rows are inserted against the ids the persona
 * insert returns rather than by a second lookup - the returning rows come back
 * in insert order, which is the order they were built from.
 */
export async function seedErpJourney(
  client: PoolClient,
): Promise<{ personas: number; outcomes: number; points: number; stats: number }> {
  let personas = 0;
  let outcomes = 0;
  let points = 0;
  let stats = 0;

  const existingPersonas = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM erp_journey_personas',
  );

  if (Number(existingPersonas.rows[0].count) === 0) {
    const inserted = await client.query<{ id: string; title: string }>(
      `
      INSERT INTO erp_journey_personas
        (role, context, title, description,
         metric_count_to, metric_text, metric_suffix, metric_label,
         author_designation, author_company, avatar_url, avatar_alt, avatar_color,
         display_order, status)
      SELECT u.role, u.context, u.title, u.description,
             u.metric_count_to, u.metric_text, u.metric_suffix, u.metric_label,
             u.author_designation, u.author_company, u.avatar_url,
             u.author_designation, u.avatar_color,
             u.position, 'ACTIVE'
        FROM unnest(
               $1::text[], $2::text[], $3::text[], $4::text[], $5::int[],
               $6::text[], $7::text[], $8::text[], $9::text[], $10::text[],
               $11::text[], $12::text[], $13::int[]
             )
          AS u(role, context, title, description, metric_count_to,
               metric_text, metric_suffix, metric_label, author_designation,
               author_company, avatar_url, avatar_color, position)
      RETURNING id, title
      `,
      [
        PERSONAS.map((p) => p.role),
        PERSONAS.map((p) => p.context),
        PERSONAS.map((p) => p.title),
        PERSONAS.map((p) => p.description),
        PERSONAS.map((p) => p.metricCountTo),
        PERSONAS.map((p) => p.metricText),
        PERSONAS.map((p) => p.metricSuffix),
        PERSONAS.map((p) => p.metricLabel),
        PERSONAS.map((p) => p.authorDesignation),
        PERSONAS.map((p) => p.authorCompany),
        PERSONAS.map((p) => p.avatarUrl),
        PERSONAS.map((p) => p.avatarColor),
        PERSONAS.map((_, index) => index),
      ],
    );
    personas = inserted.rowCount ?? 0;

    const idByTitle = new Map(inserted.rows.map((row) => [row.title, row.id]));

    // One flat insert per list, each row carrying its parent id and its
    // position within that parent.
    const flatOutcomes = PERSONAS.flatMap((persona) =>
      persona.outcomes.map((text, index) => ({
        personaId: idByTitle.get(persona.title) as string,
        text,
        position: index,
      })),
    );

    const insertedOutcomes = await client.query(
      `
      INSERT INTO erp_journey_outcomes (persona_id, text, icon, display_order, status)
      SELECT u.persona_id, u.text, 'CheckCircle2', u.position, 'ACTIVE'
        FROM unnest($1::uuid[], $2::text[], $3::int[])
          AS u(persona_id, text, position)
      `,
      [
        flatOutcomes.map((o) => o.personaId),
        flatOutcomes.map((o) => o.text),
        flatOutcomes.map((o) => o.position),
      ],
    );
    outcomes = insertedOutcomes.rowCount ?? 0;

    const flatPoints = PERSONAS.flatMap((persona) =>
      persona.points.map((text, index) => ({
        personaId: idByTitle.get(persona.title) as string,
        text,
        position: index,
      })),
    );

    const insertedPoints = await client.query(
      `
      INSERT INTO erp_journey_points (persona_id, text, display_order, status)
      SELECT u.persona_id, u.text, u.position, 'ACTIVE'
        FROM unnest($1::uuid[], $2::text[], $3::int[])
          AS u(persona_id, text, position)
      `,
      [
        flatPoints.map((p) => p.personaId),
        flatPoints.map((p) => p.text),
        flatPoints.map((p) => p.position),
      ],
    );
    points = insertedPoints.rowCount ?? 0;
  }

  const existingStats = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM erp_journey_stats',
  );

  if (Number(existingStats.rows[0].count) === 0) {
    const insertedStats = await client.query(
      `
      INSERT INTO erp_journey_stats (value, label, display_order, status)
      SELECT u.value, u.label, u.position, 'ACTIVE'
        FROM unnest($1::text[], $2::text[], $3::int[])
          AS u(value, label, position)
      `,
      [
        STATS.map((s) => s.value),
        STATS.map((s) => s.label),
        STATS.map((_, index) => index),
      ],
    );
    stats = insertedStats.rowCount ?? 0;
  }

  return { personas, outcomes, points, stats };
}
