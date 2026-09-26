// src/modules/blog/repositories/categories.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  BlogCategory,
  BlogCategoryFilters,
  BlogCategorySummary,
  CreateBlogCategoryInput,
  PublicBlogCategory,
  UpdateBlogCategoryInput,
} from '../types/categories.types';

/**
 * Columns an update may touch. created_by / updated_by come from the request
 * context, never from the body, display_order is absent because position is
 * changed only by applyOrder(), which rewrites the whole set, and slug because
 * it is fixed when the category is created.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  label: 'label',
  icon: 'icon',
  status: 'status',
} as const;

/** Qualified by `c`, so the same list reads a table or a CTE aliased to it. */
const COLUMNS = `
  c.id, c.slug, c.label, c.icon,
  c.status, c.display_order, c.created_by, c.updated_by, c.created_at, c.updated_at
`;

/**
 * Every post filed under the category, of any status - the admin row's
 * postCount. A scalar subquery rather than a GROUP BY join so it composes with
 * the CTE the writes return through, and blog_posts_category_idx makes it an
 * index lookup per row of a list that holds at most MAX_BLOG_CATEGORIES.
 */
const POST_COUNT = `
  (SELECT COUNT(*) FROM blog_posts p WHERE p.category_id = c.id) AS post_count
`;

/** created_at breaks display_order ties, so the list order is stable. */
const CATEGORY_ORDER = 'ORDER BY c.display_order ASC, c.created_at ASC';

interface BlogCategoryRow {
  id: string;
  slug: string;
  label: string;
  icon: string;
  status: string;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface BlogCategorySummaryRow extends BlogCategoryRow {
  post_count: number;
}

const toCategory = (row: BlogCategoryRow): BlogCategory => ({
  id: row.id,
  slug: row.slug,
  label: row.label,
  icon: row.icon,
  status: row.status as ContentStatus,
  displayOrder: row.display_order,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSummary = (row: BlogCategorySummaryRow): BlogCategorySummary => ({
  ...toCategory(row),
  // INT8 is parsed globally; Number() keeps a driver change from leaking a string.
  postCount: Number(row.post_count),
});

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * Every category with its post count, unpaginated - the set holds at most
 * LIMITS.MAX_BLOG_CATEGORIES, and the reorder arrows need the whole ordered set.
 */
export const findAll = async (
  filters: BlogCategoryFilters,
  executor?: Executor,
): Promise<BlogCategorySummary[]> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    builder.raw('(c.label ILIKE ? OR c.slug ILIKE ?)', pattern, pattern);
  }

  const sql = `
    SELECT ${COLUMNS}, ${POST_COUNT}
      FROM blog_categories c
    ${builder.buildWhere()}
    ${CATEGORY_ORDER}
  `;
  const result = await runQuery<BlogCategorySummaryRow>(executor, sql, builder.getValues());
  return result.rows.map(toSummary);
};

/**
 * The chips: ACTIVE categories in display order, each with the number of
 * ACTIVE posts filed under it - the number a reader finds when they click it.
 * An ACTIVE category with no ACTIVE posts is still a chip, with a 0.
 */
export const findPublishedWithCounts = async (
  executor?: Executor,
): Promise<PublicBlogCategory[]> => {
  const sql = `
    SELECT c.slug, c.label, c.icon,
           (SELECT COUNT(*)
              FROM blog_posts p
             WHERE p.category_id = c.id AND p.status = 'ACTIVE') AS count
      FROM blog_categories c
     WHERE c.status = 'ACTIVE'
    ${CATEGORY_ORDER}
  `;
  const result = await runQuery<{ slug: string; label: string; icon: string; count: number }>(
    executor,
    sql,
    [],
  );
  return result.rows.map((row) => ({
    slug: row.slug,
    label: row.label,
    icon: row.icon,
    count: Number(row.count),
  }));
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<BlogCategorySummary | null> => {
  const result = await runQuery<BlogCategorySummaryRow>(
    executor,
    `SELECT ${COLUMNS}, ${POST_COUNT} FROM blog_categories c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toSummary(result.rows[0]) : null;
};

/**
 * Locks the row, so two administrators editing the same category serialise.
 *
 * It is also what makes the "in use" check on a delete hold: a post insert
 * naming this category takes a KEY SHARE lock on it for its foreign key, which
 * waits behind this one - so no post can be filed under a category between the
 * count and the delete.
 */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BlogCategory | null> => {
  const result = await runQuery<BlogCategoryRow>(
    executor,
    `SELECT ${COLUMNS} FROM blog_categories c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

/**
 * Every slug in use - what a new category's derived slug is numbered around.
 * The set holds at most LIMITS.MAX_BLOG_CATEGORIES.
 */
export const findAllSlugs = async (executor?: Executor): Promise<string[]> => {
  const result = await runQuery<{ slug: string }>(
    executor,
    'SELECT slug FROM blog_categories',
  );
  return result.rows.map((row) => row.slug);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM blog_categories',
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Every post filed under one category, of any status. */
export const countPosts = async (categoryId: string, executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM blog_posts WHERE category_id = $1',
    [categoryId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end of the row" default on create. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM blog_categories',
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
    'SELECT id FROM blog_categories WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

// ── writes ────────────────────────────────────────────────────────────────

/*
 * Every write returns through a CTE aliased `c`, so the row comes back with its
 * post count in the same statement - the admin row's shape on every response,
 * with no second round trip.
 */

export const create = async (
  input: CreateBlogCategoryInput & { slug: string; displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BlogCategorySummary> => {
  const sql = `
    WITH c AS (
      INSERT INTO blog_categories
        (slug, label, icon, status, display_order, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING *
    )
    SELECT ${COLUMNS}, ${POST_COUNT} FROM c
  `;
  const result = await runQuery<BlogCategorySummaryRow>(executor, sql, [
    input.slug,
    input.label,
    input.icon,
    input.status,
    input.displayOrder,
    createdBy,
  ]);
  return toSummary(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateBlogCategoryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BlogCategorySummary | null> => {
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
      UPDATE blog_categories SET ${assignments.join(', ')}
       WHERE id = $${values.length}
      RETURNING *
    )
    SELECT ${COLUMNS}, ${POST_COUNT} FROM c
  `;
  const result = await runQuery<BlogCategorySummaryRow>(executor, sql, values);
  return result.rows[0] ? toSummary(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BlogCategorySummary | null> => {
  const sql = `
    WITH c AS (
      UPDATE blog_categories SET status = $2, updated_by = $3
       WHERE id = $1
      RETURNING *
    )
    SELECT ${COLUMNS}, ${POST_COUNT} FROM c
  `;
  const result = await runQuery<BlogCategorySummaryRow>(executor, sql, [id, status, updatedBy]);
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
    UPDATE blog_categories AS bc
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE bc.id = ordered.id
  `;
  const result = await runQuery(executor, sql, [orderedIds, updatedBy]);
  return result.rowCount ?? 0;
};

/**
 * A hard delete; INACTIVE covers "not a chip right now". The foreign key from
 * blog_posts is RESTRICT, so this fails rather than orphaning an article - the
 * service checks first and answers BLOG_CATEGORY_IN_USE instead.
 */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM blog_categories WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
