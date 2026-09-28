// src/modules/knowledgebase/repositories/articles.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateKbArticleInput,
  KbArticle,
  KbArticleCard,
  KbArticleFilters,
  KbBodyBlock,
  KbFaq,
  UpdateKbArticleInput,
} from '../types/articles.types';

/*
 * The SQL follows the Blog posts repository statement for statement. The
 * differences are the columns: no pictures, author or lead (the excerpt is
 * the lead), a required read_time, updated_on where a post has published_on,
 * and a faqs column beside the body.
 */

/**
 * Columns an update may touch as they are. body and faqs are absent because
 * they need a jsonb cast and updated_on a date cast - all three are handled
 * explicitly in update(). slug is absent because nothing changes it once the
 * article is created.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  categoryId: 'category_id',
  title: 'title',
  excerpt: 'excerpt',
  readTime: 'read_time',
  status: 'status',
} as const;

/**
 * Qualified by `a` (the article, a table or a CTE aliased to it) and `c` (its
 * category, always joined), so reads and writes return the same shape.
 *
 * updated_on is formatted in SQL: handed a DATE, pg builds a JS Date at the
 * server's local midnight, which JSON-serialises as the previous day anywhere
 * east of UTC. The ten characters are the value; they travel as text.
 */
const COLUMNS = `
  a.id, a.slug, a.category_id, c.slug AS category_slug, c.name AS category_name,
  a.title, a.excerpt, a.read_time,
  to_char(a.updated_on, 'YYYY-MM-DD') AS updated_on,
  a.body, a.faqs,
  a.status, a.created_by, a.updated_by, a.created_at, a.updated_at
`;

/** A card's worth of an article: no body or FAQs. */
const CARD_COLUMNS = `
  a.slug, c.slug AS category_slug, a.title, a.excerpt, a.read_time,
  to_char(a.updated_on, 'YYYY-MM-DD') AS updated_on
`;

const WITH_CATEGORY = 'JOIN kb_categories c ON c.id = a.category_id';

/**
 * Newest first - the category page's only ordering. created_at breaks a
 * same-day tie, newest again, and the slug makes the order total.
 */
const ARTICLE_ORDER = 'a.updated_on DESC, a.created_at DESC, a.slug ASC';

/** What the public side may see: a published article under a published category. */
const PUBLISHED = `a.status = 'ACTIVE' AND c.status = 'ACTIVE'`;

interface KbArticleRow {
  id: string;
  slug: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  title: string;
  excerpt: string;
  read_time: string;
  updated_on: string;
  /** pg parses jsonb, so these arrive as the arrays they were stored as. */
  body: unknown;
  faqs: unknown;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface KbArticleCardRow {
  slug: string;
  category_slug: string;
  title: string;
  excerpt: string;
  read_time: string;
  updated_on: string;
}

const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * The CHECK constraint guarantees a non-empty array; this guarantees an array of
 * well-formed blocks, so a hand-edited row cannot put a shape in front of the
 * renderer that it does not know how to draw. A malformed block is dropped
 * rather than failing the whole article - the blog's rule.
 */
const toBlocks = (body: unknown): KbBodyBlock[] => {
  if (!Array.isArray(body)) return [];

  const blocks: KbBodyBlock[] = [];
  for (const entry of body) {
    if (!entry || typeof entry !== 'object') continue;
    const block = entry as Record<string, unknown>;

    if ((block.type === 'p' || block.type === 'h2') && isString(block.text)) {
      blocks.push({ type: block.type, text: block.text });
    } else if (block.type === 'ul' && Array.isArray(block.items)) {
      blocks.push({ type: 'ul', items: block.items.filter(isString) });
    } else if (block.type === 'quote' && isString(block.text)) {
      blocks.push({
        type: 'quote',
        text: block.text,
        cite: isString(block.cite) && block.cite.trim() !== '' ? block.cite : null,
      });
    }
  }
  return blocks;
};

/** The same guarantee for the FAQs: only complete { question, answer } pairs. */
const toFaqs = (faqs: unknown): KbFaq[] => {
  if (!Array.isArray(faqs)) return [];

  const entries: KbFaq[] = [];
  for (const entry of faqs) {
    if (!entry || typeof entry !== 'object') continue;
    const faq = entry as Record<string, unknown>;
    if (isString(faq.question) && isString(faq.answer)) {
      entries.push({ question: faq.question, answer: faq.answer });
    }
  }
  return entries;
};

const toArticle = (row: KbArticleRow): KbArticle => ({
  id: row.id,
  slug: row.slug,
  categoryId: row.category_id,
  category: { id: row.category_id, slug: row.category_slug, name: row.category_name },
  title: row.title,
  excerpt: row.excerpt,
  readTime: row.read_time,
  updatedOn: row.updated_on,
  body: toBlocks(row.body),
  faqs: toFaqs(row.faqs),
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toCard = (row: KbArticleCardRow): KbArticleCard => ({
  slug: row.slug,
  categorySlug: row.category_slug,
  title: row.title,
  excerpt: row.excerpt,
  readTime: row.read_time,
  updatedOn: row.updated_on,
});

// ── admin reads ───────────────────────────────────────────────────────────

/**
 * Every matching article, newest first, unpaginated - the set is bounded by
 * LIMITS.MAX_KB_ARTICLES. Search covers what an editor remembers an article by.
 */
export const findAll = async (
  filters: KbArticleFilters,
  executor?: Executor,
): Promise<KbArticle[]> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'a.status',
    operator: '=',
    value: filters.status,
  });
  builder.whereIf(filters.categoryId, {
    column: 'a.category_id',
    operator: '=',
    value: filters.categoryId,
  });
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    builder.raw(
      '(a.title ILIKE ? OR a.slug ILIKE ? OR a.excerpt ILIKE ?)',
      pattern,
      pattern,
      pattern,
    );
  }

  const sql = `
    SELECT ${COLUMNS}
      FROM kb_articles a
      ${WITH_CATEGORY}
    ${builder.buildWhere()}
     ORDER BY ${ARTICLE_ORDER}
  `;
  const result = await runQuery<KbArticleRow>(executor, sql, builder.getValues());
  return result.rows.map(toArticle);
};

export const findById = async (id: string, executor?: Executor): Promise<KbArticle | null> => {
  const sql = `
    SELECT ${COLUMNS}
      FROM kb_articles a
      ${WITH_CATEGORY}
     WHERE a.id = $1
  `;
  const result = await runQuery<KbArticleRow>(executor, sql, [id]);
  return result.rows[0] ? toArticle(result.rows[0]) : null;
};

/**
 * Locks the article - only the article: OF a keeps the join from also locking
 * its category, which would serialise every edit filed under the same one.
 */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<KbArticle | null> => {
  const sql = `
    SELECT ${COLUMNS}
      FROM kb_articles a
      ${WITH_CATEGORY}
     WHERE a.id = $1
       FOR UPDATE OF a
  `;
  const result = await runQuery<KbArticleRow>(executor, sql, [id]);
  return result.rows[0] ? toArticle(result.rows[0]) : null;
};

/**
 * Every slug in use - what a new article's derived slug is numbered around.
 * The set holds at most LIMITS.MAX_KB_ARTICLES.
 */
export const findAllSlugs = async (executor?: Executor): Promise<string[]> => {
  const result = await runQuery<{ slug: string }>(executor, 'SELECT slug FROM kb_articles');
  return result.rows.map((row) => row.slug);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM kb_articles',
  );
  return Number(result.rows[0]?.count ?? 0);
};

// ── public reads ──────────────────────────────────────────────────────────

/**
 * One category page's cards: every ACTIVE article filed under it, newest
 * first. The caller has already established that the category is ACTIVE.
 */
export const findPublishedCardsByCategory = async (
  categoryId: string,
  executor?: Executor,
): Promise<KbArticleCard[]> => {
  const sql = `
    SELECT ${CARD_COLUMNS}
      FROM kb_articles a
      ${WITH_CATEGORY}
     WHERE a.category_id = $1 AND ${PUBLISHED}
     ORDER BY ${ARTICLE_ORDER}
  `;
  const result = await runQuery<KbArticleCardRow>(executor, sql, [categoryId]);
  return result.rows.map(toCard);
};

/**
 * One article by its URL - both segments. Null for an unknown slug, an
 * unpublished article, an article whose category is unpublished, and an
 * article filed under a different category than the URL names: an article
 * answers on exactly one address.
 */
export const findPublishedBySlugs = async (
  categorySlug: string,
  articleSlug: string,
  executor?: Executor,
): Promise<KbArticle | null> => {
  const sql = `
    SELECT ${COLUMNS}
      FROM kb_articles a
      ${WITH_CATEGORY}
     WHERE a.slug = $1 AND c.slug = $2 AND ${PUBLISHED}
  `;
  const result = await runQuery<KbArticleRow>(executor, sql, [articleSlug, categorySlug]);
  return result.rows[0] ? toArticle(result.rows[0]) : null;
};

/**
 * The "Related guides" beside an article, never the article itself: the same
 * category first, then the other categories in the order the hub draws them,
 * newest first within each.
 *
 * data/knowledgebase.js picked these by hand, per article. This is the rule
 * that reproduces every one of those hand-picked lists as its leading entries
 * - an article's own category, then the hub's first categories - so the CMS
 * version starts out showing what the site showed, without an administrator
 * having to maintain a list per article.
 */
export const findPublishedRelatedCards = async (
  articleId: string,
  categoryId: string,
  limit: number,
  executor?: Executor,
): Promise<KbArticleCard[]> => {
  const sql = `
    SELECT ${CARD_COLUMNS}
      FROM kb_articles a
      ${WITH_CATEGORY}
     WHERE ${PUBLISHED} AND a.id <> $1
     ORDER BY (a.category_id = $2) DESC,
              c.display_order ASC, c.created_at ASC, c.id ASC,
              ${ARTICLE_ORDER}
     LIMIT $3
  `;
  const result = await runQuery<KbArticleCardRow>(executor, sql, [articleId, categoryId, limit]);
  return result.rows.map(toCard);
};

// ── writes ────────────────────────────────────────────────────────────────

/*
 * Every write returns through a CTE aliased `a` joined to its category, so the
 * row comes back in the admin shape - category included - in one statement.
 *
 * body and faqs are serialised explicitly: handed a JS array, pg would encode
 * it as a Postgres array literal, which is not valid jsonb.
 */

export const create = async (
  input: CreateKbArticleInput & { slug: string },
  createdBy: string | null,
  executor?: Executor,
): Promise<KbArticle> => {
  const sql = `
    WITH a AS (
      INSERT INTO kb_articles
        (slug, category_id, title, excerpt, read_time, updated_on,
         body, faqs, status, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6::date, $7::jsonb, $8::jsonb, $9, $10, $10)
      RETURNING *
    )
    SELECT ${COLUMNS} FROM a ${WITH_CATEGORY}
  `;
  const result = await runQuery<KbArticleRow>(executor, sql, [
    input.slug,
    input.categoryId,
    input.title,
    input.excerpt,
    input.readTime,
    input.updatedOn,
    JSON.stringify(input.body),
    JSON.stringify(input.faqs),
    input.status,
    createdBy,
  ]);
  return toArticle(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateKbArticleInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<KbArticle | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown, cast = ''): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}${cast}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    // undefined is "leave it alone". No column here is nullable.
    if (value === undefined) continue;
    assign(column, value);
  }

  if (patch.updatedOn !== undefined) assign('updated_on', patch.updatedOn, '::date');
  if (patch.body !== undefined) assign('body', JSON.stringify(patch.body), '::jsonb');
  if (patch.faqs !== undefined) assign('faqs', JSON.stringify(patch.faqs), '::jsonb');

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);

  values.push(id);
  const sql = `
    WITH a AS (
      UPDATE kb_articles SET ${assignments.join(', ')}
       WHERE id = $${values.length}
      RETURNING *
    )
    SELECT ${COLUMNS} FROM a ${WITH_CATEGORY}
  `;
  const result = await runQuery<KbArticleRow>(executor, sql, values);
  return result.rows[0] ? toArticle(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<KbArticle | null> => {
  const sql = `
    WITH a AS (
      UPDATE kb_articles SET status = $2, updated_by = $3
       WHERE id = $1
      RETURNING *
    )
    SELECT ${COLUMNS} FROM a ${WITH_CATEGORY}
  `;
  const result = await runQuery<KbArticleRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toArticle(result.rows[0]) : null;
};

/** A hard delete; INACTIVE covers "take it down for now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM kb_articles WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
