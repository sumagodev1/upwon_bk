// src/database/seeds/erp-comparison.seed.ts

import { PoolClient } from 'pg';

/**
 * "UPWON vs the Alternatives", exactly as the ERP page renders it.
 *
 * Written against the column keys the live file uses, and turned into real
 * column ids on the way in - so the cells are matched up here once rather than
 * the site ever having to know a column by name.
 */

const PAGE_KEY = 'erp';
const SECTION_KEY = 'alternatives';

/** The leader column, whose header sits above the parameter names. */
const LEADER = {
  label: 'How They Compare',
  description: 'On what food & FMCG operators care about',
};

interface SeedColumn {
  key: string;
  name: string;
  description: string;
  columnType: 'OURS' | 'COMPETITOR';
  highlight: boolean;
}

const COLUMNS: SeedColumn[] = [
  {
    key: 'upwon',
    name: 'UPWON',
    description: 'Built for food & FMCG',
    columnType: 'OURS',
    highlight: true,
  },
  {
    key: 'global',
    name: 'Global ERPs',
    description: 'SAP · Oracle · Dynamics',
    columnType: 'COMPETITOR',
    highlight: false,
  },
  {
    key: 'generic',
    name: 'Generic / Open-Source',
    description: 'Odoo · ERPNext · Zoho · Tally',
    columnType: 'COMPETITOR',
    highlight: false,
  },
];

interface SeedRow {
  parameter: string;
  /** Keyed by the column keys above. */
  values: Record<string, string>;
}

interface SeedCategory {
  name: string;
  rows: SeedRow[];
}

const CATEGORIES: SeedCategory[] = [
  {
    name: 'Cost & rollout',
    rows: [
      {
        parameter: 'Cost & time to go-live',
        values: {
          upwon: '30–45 days, a fraction of enterprise TCO',
          global: '12–18 months, high licence + SI cost',
          generic: 'Varies — heavy customisation to fit food',
        },
      },
      {
        parameter: '3-year total cost of ownership',
        values: {
          upwon: 'A fraction of SAP B1 / Oracle NetSuite',
          global: 'High licence + implementation',
          generic: 'Lower licence, high build & maintain cost',
        },
      },
    ],
  },
  {
    name: 'Food & compliance',
    rows: [
      {
        parameter: 'Food- & FSSAI-specific workflows',
        values: {
          upwon: 'Built in — recipe/BOM, batch, FEFO, FSSAI',
          global: 'Add-ons or a custom build',
          generic: 'Not food-specific — build it yourself',
        },
      },
      {
        parameter: 'GST & e-invoice, native',
        values: {
          upwon: 'Native',
          global: 'Localisation packs',
          generic: 'Plugin or manual',
        },
      },
    ],
  },
  {
    name: 'India distribution',
    rows: [
      {
        parameter: 'GT/MT distribution logic',
        values: {
          upwon: 'Native GT/MT',
          global: 'Partner add-ons',
          generic: 'Limited or manual',
        },
      },
      {
        parameter: 'SFA-DMS field force',
        values: {
          upwon: 'Built in',
          global: 'Third-party integration',
          generic: 'Separate tool',
        },
      },
    ],
  },
  {
    name: 'Partnership & support',
    rows: [
      {
        parameter: 'Access to the team building the product',
        values: {
          upwon: 'Direct access to the product team',
          global: 'Via SI partners and support tickets',
          generic: 'Community or third-party vendors',
        },
      },
    ],
  },
];

/**
 * Seeds the grid: its section row, its columns, its bands, their rows and every
 * cell.
 *
 * Guarded on the section, because the four tables only make sense together -
 * columns without rows or rows without columns is not a state worth filling in
 * halfway.
 */
export async function seedErpComparison(client: PoolClient): Promise<{
  columns: number;
  categories: number;
  rows: number;
  values: number;
}> {
  const existing = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM comparison_sections WHERE page_key = $1 AND section_key = $2',
    [PAGE_KEY, SECTION_KEY],
  );
  if (Number(existing.rows[0].count) > 0) {
    return { columns: 0, categories: 0, rows: 0, values: 0 };
  }

  const section = await client.query<{ id: string }>(
    `INSERT INTO comparison_sections (page_key, section_key, leader_label, leader_description)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [PAGE_KEY, SECTION_KEY, LEADER.label, LEADER.description],
  );
  const sectionId = section.rows[0].id;

  const insertedColumns = await client.query<{ id: string; name: string }>(
    `
    INSERT INTO comparison_columns
      (section_id, name, description, column_type, highlight_column, display_order, status)
    SELECT $1, u.name, u.description, u.column_type, u.highlight, u.position, 'ACTIVE'
      FROM unnest($2::text[], $3::text[], $4::text[], $5::boolean[], $6::int[])
        AS u(name, description, column_type, highlight, position)
    RETURNING id, name
    `,
    [
      sectionId,
      COLUMNS.map((c) => c.name),
      COLUMNS.map((c) => c.description),
      COLUMNS.map((c) => c.columnType),
      COLUMNS.map((c) => c.highlight),
      COLUMNS.map((_, index) => index),
    ],
  );

  // Back from the returned rows to the keys the cells are written against.
  const idByName = new Map(insertedColumns.rows.map((row) => [row.name, row.id]));
  const idByKey = new Map(
    COLUMNS.map((column) => [column.key, idByName.get(column.name) as string]),
  );

  const insertedCategories = await client.query<{ id: string; name: string }>(
    `
    INSERT INTO comparison_categories (section_id, name, display_order, status)
    SELECT $1, u.name, u.position, 'ACTIVE'
      FROM unnest($2::text[], $3::int[]) AS u(name, position)
    RETURNING id, name
    `,
    [sectionId, CATEGORIES.map((c) => c.name), CATEGORIES.map((_, index) => index)],
  );
  const categoryIdByName = new Map(
    insertedCategories.rows.map((row) => [row.name, row.id]),
  );

  const flatRows = CATEGORIES.flatMap((category) =>
    category.rows.map((row, index) => ({
      categoryId: categoryIdByName.get(category.name) as string,
      parameter: row.parameter,
      position: index,
      values: row.values,
    })),
  );

  const insertedRows = await client.query<{ id: string; parameter: string }>(
    `
    INSERT INTO comparison_rows (category_id, parameter, display_order, status)
    SELECT u.category_id, u.parameter, u.position, 'ACTIVE'
      FROM unnest($1::uuid[], $2::text[], $3::int[])
        AS u(category_id, parameter, position)
    RETURNING id, parameter
    `,
    [
      flatRows.map((r) => r.categoryId),
      flatRows.map((r) => r.parameter),
      flatRows.map((r) => r.position),
    ],
  );

  /*
   * Matched on parameter, which is unique across the grid as it ships. The
   * returning rows come back in insert order, so the index would work too -
   * this reads as what it is.
   */
  const rowIdByParameter = new Map(insertedRows.rows.map((row) => [row.parameter, row.id]));

  const flatValues = flatRows.flatMap((row) =>
    Object.entries(row.values).map(([key, content]) => ({
      rowId: rowIdByParameter.get(row.parameter) as string,
      columnId: idByKey.get(key) as string,
      content,
    })),
  );

  const insertedValues = await client.query(
    `
    INSERT INTO comparison_values (row_id, column_id, content)
    SELECT u.row_id, u.column_id, u.content
      FROM unnest($1::uuid[], $2::uuid[], $3::text[]) AS u(row_id, column_id, content)
    `,
    [
      flatValues.map((v) => v.rowId),
      flatValues.map((v) => v.columnId),
      flatValues.map((v) => v.content),
    ],
  );

  return {
    columns: insertedColumns.rowCount ?? 0,
    categories: insertedCategories.rowCount ?? 0,
    rows: insertedRows.rowCount ?? 0,
    values: insertedValues.rowCount ?? 0,
  };
}
