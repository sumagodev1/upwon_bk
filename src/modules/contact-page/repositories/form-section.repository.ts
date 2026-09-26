// src/modules/contact-page/repositories/form-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import {
  ContactFormSection,
  ReplaceContactFormSectionInput,
} from '../types/form-section.types';

/** A singleton row pinned to id = 1 by a CHECK constraint. */
const SINGLETON_ID = 1;

const COLUMNS = `
  eyebrow, heading,
  business_types, revenue_ranges, platforms,
  footnote, success_heading, success_body,
  updated_by, created_at, updated_at
`;

interface ContactFormSectionRow {
  eyebrow: string;
  heading: string;
  /** pg parses jsonb, so these arrive as the arrays they were stored as. */
  business_types: unknown;
  revenue_ranges: unknown;
  platforms: unknown;
  footnote: string;
  success_heading: string;
  success_body: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/** The CHECK guarantees an array; this guarantees an array of strings. */
const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const toSection = (row: ContactFormSectionRow): ContactFormSection => ({
  eyebrow: row.eyebrow,
  heading: row.heading,
  businessTypes: toStringList(row.business_types),
  revenueRanges: toStringList(row.revenue_ranges),
  platforms: toStringList(row.platforms),
  footnote: row.footnote,
  successHeading: row.success_heading,
  successBody: row.success_body,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the section has never been authored. */
export const find = async (executor?: Executor): Promise<ContactFormSection | null> => {
  const result = await runQuery<ContactFormSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM contact_form_section WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise. */
export const findForUpdate = async (executor: Executor): Promise<ContactFormSection | null> => {
  const result = await runQuery<ContactFormSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM contact_form_section WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Writes the whole section; the first save creates the row. */
export const upsert = async (
  input: ReplaceContactFormSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ContactFormSection> => {
  // The three lists are serialised explicitly: handed a JS array, pg would
  // encode it as a Postgres array literal, which is not valid jsonb.
  const sql = `
    INSERT INTO contact_form_section
      (id, eyebrow, heading, business_types, revenue_ranges, platforms,
       footnote, success_heading, success_body, updated_by)
    VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, $9, $10)
    ON CONFLICT (id) DO UPDATE SET
      eyebrow = EXCLUDED.eyebrow,
      heading = EXCLUDED.heading,
      business_types = EXCLUDED.business_types,
      revenue_ranges = EXCLUDED.revenue_ranges,
      platforms = EXCLUDED.platforms,
      footnote = EXCLUDED.footnote,
      success_heading = EXCLUDED.success_heading,
      success_body = EXCLUDED.success_body,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<ContactFormSectionRow>(executor, sql, [
    SINGLETON_ID,
    input.eyebrow,
    input.heading,
    JSON.stringify(input.businessTypes),
    JSON.stringify(input.revenueRanges),
    JSON.stringify(input.platforms),
    input.footnote,
    input.successHeading,
    input.successBody,
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
