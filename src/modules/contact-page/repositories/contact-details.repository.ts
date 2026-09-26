// src/modules/contact-page/repositories/contact-details.repository.ts

import { Executor, runQuery } from '../../../config/database';
import {
  ContactDetailsSection,
  ContactOffice,
  ReplaceContactDetailsSectionInput,
} from '../types/contact-details.types';

/** A singleton row pinned to id = 1 by a CHECK constraint. */
const SINGLETON_ID = 1;

const COLUMNS = `
  offices_title, offices, direct_title,
  email, phone, whatsapp,
  updated_by, created_at, updated_at
`;

interface ContactDetailsSectionRow {
  offices_title: string;
  /** pg parses jsonb, so this arrives as the array it was stored as. */
  offices: unknown;
  direct_title: string;
  email: string;
  phone: string;
  whatsapp: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * The CHECK guarantees an array; this guarantees an array of well-formed
 * offices. An entry that is not one is dropped rather than rendered as
 * `undefined` on the live card.
 */
const toOffices = (value: unknown): ContactOffice[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return [];
    const { name, detail } = entry as { name?: unknown; detail?: unknown };
    if (typeof name !== 'string' || typeof detail !== 'string') return [];
    return [{ name, detail }];
  });
};

const toSection = (row: ContactDetailsSectionRow): ContactDetailsSection => ({
  officesTitle: row.offices_title,
  offices: toOffices(row.offices),
  directTitle: row.direct_title,
  email: row.email,
  phone: row.phone,
  whatsapp: row.whatsapp,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the section has never been authored. */
export const find = async (executor?: Executor): Promise<ContactDetailsSection | null> => {
  const result = await runQuery<ContactDetailsSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM contact_details_section WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise. */
export const findForUpdate = async (
  executor: Executor,
): Promise<ContactDetailsSection | null> => {
  const result = await runQuery<ContactDetailsSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM contact_details_section WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Writes both cards; the first save creates the row. */
export const upsert = async (
  input: ReplaceContactDetailsSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ContactDetailsSection> => {
  // offices is serialised explicitly: handed a JS array, pg would encode it as
  // a Postgres array literal, which is not valid jsonb.
  const sql = `
    INSERT INTO contact_details_section
      (id, offices_title, offices, direct_title, email, phone, whatsapp, updated_by)
    VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      offices_title = EXCLUDED.offices_title,
      offices = EXCLUDED.offices,
      direct_title = EXCLUDED.direct_title,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      whatsapp = EXCLUDED.whatsapp,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<ContactDetailsSectionRow>(executor, sql, [
    SINGLETON_ID,
    input.officesTitle,
    JSON.stringify(input.offices),
    input.directTitle,
    input.email,
    input.phone,
    input.whatsapp,
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
