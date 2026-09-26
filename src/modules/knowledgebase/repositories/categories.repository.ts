// src/modules/knowledgebase/repositories/categories.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateKbCategoryInput,
  KbCategory,
  KbCategoryFilters,
  KbCategorySummary,
  PublicKbCategory,
  PublicKbCategoryCard,
  UpdateKbCategoryInput,
} from '../types/categories.types';

/*
 * The SQL mirrors the Blog categories repository statement for statement; only
 * the table and its copy columns differ (a name and a description where a blog
 * chip has a label), and the count is of articles rather than posts.
 */

/**
 * Columns an update may touch. created_by / updated_by come from the request
 * context, never from the body, display_order is absent because position is
 * changed only by applyOrder(), which rewrites the whole set, and slug because
 * it is fixed when the category is created.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  name: 'name',
  description: 'description',
  icon: 'icon',
  status: 'status',
} as const;

/** Qualified by `c`, so the same list reads a table or a CTE aliased to it. */
const COLUMNS = `
  c.id, c.slug, c.name, c.description, c.icon,
  c.status, c.display_order, c.created_by, c.updated_by, c.created_at, c.updated_at
`;

/**
 * Every article filed under the category, of any status - the admin row's
 * articleCount. A scalar subquery rather than a GROUP BY join so it composes
 * with the CTE the writes return through, and kb_articles_category_idx makes
 * it an index lookup per row of a list that holds at most MAX_KB_CATEGORIES.
 */
const ARTICLE_COUNT = `
  (SELECT COUNT(*) FROM kb_articles a WHERE a.category_id = c.id) AS article_count
`;

/** created_at breaks display_order ties, so the list order is stable. */
const CATEGORY_ORDER = 'ORDER BY c.display_order ASC, c.created_at ASC';

interface KbCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  status: string;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface KbCategorySummaryRow extends KbCategoryRow {
  article_count: number;
}

const toCategory = (row: KbCategoryRow): KbCategory => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  icon: row.icon,
  status: row.status as ContentStatus,
  displayOrder: row.display_order,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSummary = (row: KbCategorySummaryRow): KbCategorySummary => ({
  ...toCategory(row),
  // INT8 is parsed globally; Number() keeps a driver change from leaking a string.
  articleCount: Number(row.article_count),
});

// ── admin reads ───────────────────────────────────────────────────────────

/**
 * Every category with its article count, unpaginated - the set holds at most
 * LIMITS.MAX_KB_CATEGORIES, and the reorder arrows need the whole ordered set.
 */
export const findAll = async (
  filters: KbCategoryFilters,
  executor?: Executor,
): Promise<KbCategorySummary[]> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    builder.raw(
      '(c.name ILIKE ? OR c.slug ILIKE ? OR c.description ILIKE ?)',
      pattern,
      pattern,
      pattern,
    );
  }

  const sql = `
    SELECT ${COLUMNS}, ${ARTICLE_COUNT}
      FROM kb_categories c
    ${builder.buildWhere()}
    ${CATEGORY_ORDER}
  `;
  const result = await runQuery<KbCategorySummaryRow>(executor, sql, builder.getValues());
  return result.rows.map(toSummary);
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<KbCategorySummary | null> => {
  const result = await runQuery<KbCategorySummaryRow>(
    executor,
    `SELECT ${COLUMNS}, ${ARTICLE_COUNT} FROM kb_categories c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toSummary(result.rows[0]) : null;
};

/**
 * Locks the row, so two administrators editing the same category serialise.
 *
 * It is also what makes the "in use" check on a delete hold: an article insert
 * naming this category takes a KEY SHARE lock on it for its foreign key, which
 * waits behind this one - so no article can be filed under a category between
 * the count and the delete.
 */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<KbCategory | null> => {
  const result = await runQuery<KbCategoryRow>(
    executor,
    `SELECT ${COLUMNS} FROM kb_categories c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

/**
 * Every slug in use - what a new category's derived slug is numbered around.
 * The set holds at most LIMITS.MAX_KB_CATEGORIES.
 */
export const findAllSlugs = async (executor?: Executor): Promise<string[]> => {
  const result = await runQuery<{ slug: string }>(executor, 'SELECT slug FROM kb_categories');
  return result.rows.map((row) => row.slug);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM kb_categories',
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Every article filed under one category, of any status. */
export const countArticles = async (categoryId: string, executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM kb_articles WHERE category_id = $1',
    [categoryId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end of the grid" default on create. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM kb_categories',
  );
  return Number(result.rows[0]?.next ?? 0);
};

/** Returns the ids that exist, so a reorder can reject the rest. */
export const findExistingIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM kb_categories WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

// ── public reads ──────────────────────────────────────────────────────────

/**
 * The hub's cards: ACTIVE categories in display order, each with the number of
 * ACTIVE articles filed under it - the "N guides" a reader finds when they
 * open it. An ACTIVE category with no ACTIVE articles is still a card, with a 0.
 */
export const findPublishedWithCounts = async (
  executor?: Executor,
): Promise<PublicKbCategoryCard[]> => {
  const sql = `
    SELECT c.slug, c.name, c.description, c.icon,
           (SELECT COUNT(*)
              FROM kb_articles a
             WHERE a.category_id = c.id AND a.status = 'ACTIVE') AS count
      FROM kb_categories c
     WHERE c.status = 'ACTIVE'
    ${CATEGORY_ORDER}
  `;
  const result = await runQuery<{
    slug: string;
    name: string;
    description: string;
    icon: string;
    count: number;
  }>(executor, sql, []);
  return result.rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    count: Number(row.count),
  }));
};

/**
 * One category's page header, by its URL segment, with the id its articles
 * are looked up by. Null for an unknown slug and for an INACTIVE category - an
 * unpublished category has no page, exactly as it has no card.
 */
export const findPublishedBySlug = async (
  slug: string,
  executor?: Executor,
): Promise<(PublicKbCategory & { id: string }) | null> => {
  const result = await runQuery<{
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
  }>(
    executor,
    `SELECT c.id, c.slug, c.name, c.description, c.icon
       FROM kb_categories c
      WHERE c.slug = $1 AND c.status = 'ACTIVE'`,
    [slug],
  );
  return result.rows[0] ?? null;
};

// ── writes ────────────────────────────────────────────────────────────────

/*
 * Every write returns through a CTE aliased `c`, so the row comes back with its
 * article count in the same statement - the admin row's shape on every
 * response, with no second round trip.
 */

export const create = async (
  input: CreateKbCategoryInput & { slug: string; displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<KbCategorySummary> => {
  const sql = `
    WITH c AS (
      INSERT INTO kb_categories
        (slug, name, description, icon, status, display_order, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      RETURNING *
    )
    SELECT ${COLUMNS}, ${ARTICLE_COUNT} FROM c
  `;
  const result = await runQuery<KbCategorySummaryRow>(executor, sql, [
    input.slug,
    input.name,
    input.description,
    input.icon,
    input.status,
    input.displayOrder,
    createdBy,
  ]);
  return toSummary(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateKbCategoryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<KbCategorySummary | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    // undefined is "leave it alone". No column here is nullable.
    if (value === undefined) continue;
    assign(column, value);
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);

  values.push(id);
  const sql = `
    WITH c AS (
      UPDATE kb_categories SET ${assignments.join(', ')}
       WHERE id = $${values.length}
      RETURNING *
    )
    SELECT ${COLUMNS}, ${ARTICLE_COUNT} FROM c
  `;
  const result = await runQuery<KbCategorySummaryRow>(executor, sql, values);
  return result.rows[0] ? toSummary(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<KbCategorySummary | null> => {
  const sql = `
    WITH c AS (
      UPDATE kb_categories SET status = $2, updated_by = $3
       WHERE id = $1
      RETURNING *
    )
    SELECT ${COLUMNS}, ${ARTICLE_COUNT} FROM c
  `;
  const result = await runQuery<KbCategorySummaryRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toSummary(result.rows[0]) : null;
};

/**
 * Rewrites display_order for every listed category in one statement, each
 * row's position taken from its index in the array.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const sql = `
    UPDATE kb_categories AS kc
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE kc.id = ordered.id
  `;
  const result = await runQuery(executor, sql, [orderedIds, updatedBy]);
  return result.rowCount ?? 0;
};

/**
 * A hard delete; INACTIVE covers "not on the hub right now". The foreign key
 * from kb_articles is RESTRICT, so this fails rather than orphaning an article
 * - the service checks first and answers KB_CATEGORY_IN_USE instead.
 */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM kb_categories WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
