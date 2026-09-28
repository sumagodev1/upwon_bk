// src/modules/blog/repositories/posts.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  BlogBodyBlock,
  BlogPost,
  BlogPostCard,
  BlogPostFilters,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from '../types/posts.types';

/**
 * Columns an update may touch as they are. The desktop image file id is absent
 * because setting it also clears the legacy image_url (the phone crop's has no
 * such partner, so it is listed), body because it needs a jsonb cast and
 * published_on a date cast - all three are handled explicitly in update().
 * slug is absent because nothing changes it once the post is created.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  categoryId: 'category_id',
  title: 'title',
  excerpt: 'excerpt',
  mobileImageFileId: 'mobile_image_file_id',
  readTime: 'read_time',
  author: 'author',
  lead: 'lead',
  status: 'status',
} as const;

/**
 * Qualified by `p` (the post, a table or a CTE aliased to it) and `c` (its
 * category, always joined), so reads and writes return the same shape.
 *
 * published_on is formatted in SQL: handed a DATE, pg builds a JS Date at the
 * server's local midnight, which JSON-serialises as the previous day anywhere
 * east of UTC. The ten characters are the value; they travel as text.
 */
const COLUMNS = `
  p.id, p.slug, p.category_id, c.slug AS category_slug, c.label AS category_label,
  p.title, p.excerpt, p.image_url, p.image_file_id, p.mobile_image_file_id,
  p.read_time,
  to_char(p.published_on, 'YYYY-MM-DD') AS published_on,
  p.author, p.lead, p.body,
  p.status, p.created_by, p.updated_by, p.created_at, p.updated_at
`;

/** A card's worth of a post: no lead or body. */
const CARD_COLUMNS = `
  p.slug, c.slug AS category_slug, p.title, p.excerpt,
  p.image_url, p.image_file_id, p.mobile_image_file_id, p.read_time,
  to_char(p.published_on, 'YYYY-MM-DD') AS published_on, p.author
`;

const WITH_CATEGORY = 'JOIN blog_categories c ON c.id = p.category_id';

/**
 * Newest first - the page's only ordering, and the one the featured card is
 * picked by. created_at breaks a same-day tie, newest again.
 */
const POST_ORDER = 'ORDER BY p.published_on DESC, p.created_at DESC';

/** What the public side may see: a published post under a published topic. */
const PUBLISHED = `p.status = 'ACTIVE' AND c.status = 'ACTIVE'`;

interface BlogPostRow {
  id: string;
  slug: string;
  category_id: string;
  category_slug: string;
  category_label: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  image_file_id: string | null;
  mobile_image_file_id: string | null;
  read_time: string | null;
  published_on: string;
  author: string;
  lead: string;
  /** pg parses jsonb, so this arrives as the array it was stored as. */
  body: unknown;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface BlogPostCardRow {
  slug: string;
  category_slug: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  image_file_id: string | null;
  mobile_image_file_id: string | null;
  read_time: string | null;
  published_on: string;
  author: string;
}

const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * The CHECK constraint guarantees a non-empty array; this guarantees an array of
 * well-formed blocks, so a hand-edited row cannot put a shape in front of the
 * renderer that it does not know how to draw. A malformed block is dropped
 * rather than failing the whole article.
 */
const toBlocks = (body: unknown): BlogBodyBlock[] => {
  if (!Array.isArray(body)) return [];

  const blocks: BlogBodyBlock[] = [];
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

const toPost = (row: BlogPostRow): BlogPost => ({
  id: row.id,
  slug: row.slug,
  categoryId: row.category_id,
  category: { id: row.category_id, slug: row.category_slug, label: row.category_label },
  title: row.title,
  excerpt: row.excerpt,
  legacyImageUrl: row.image_url,
  imageFileId: row.image_file_id,
  mobileImageFileId: row.mobile_image_file_id,
  readTime: row.read_time,
  publishedOn: row.published_on,
  author: row.author,
  lead: row.lead,
  body: toBlocks(row.body),
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toCard = (row: BlogPostCardRow): BlogPostCard => ({
  slug: row.slug,
  categorySlug: row.category_slug,
  title: row.title,
  excerpt: row.excerpt,
  legacyImageUrl: row.image_url,
  imageFileId: row.image_file_id,
  mobileImageFileId: row.mobile_image_file_id,
  readTime: row.read_time,
  publishedOn: row.published_on,
  author: row.author,
});

// ── admin reads ───────────────────────────────────────────────────────────

/**
 * Every matching post, newest first, unpaginated - the set is bounded by
 * LIMITS.MAX_BLOG_POSTS. Search covers what an editor remembers a post by.
 */
export const findAll = async (
  filters: BlogPostFilters,
  executor?: Executor,
): Promise<BlogPost[]> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'p.status',
    operator: '=',
    value: filters.status,
  });
  builder.whereIf(filters.categoryId, {
    column: 'p.category_id',
    operator: '=',
    value: filters.categoryId,
  });
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    builder.raw(
      '(p.title ILIKE ? OR p.slug ILIKE ? OR p.excerpt ILIKE ? OR p.author ILIKE ?)',
      pattern,
      pattern,
      pattern,
      pattern,
    );
  }

  const sql = `
    SELECT ${COLUMNS}
      FROM blog_posts p
      ${WITH_CATEGORY}
    ${builder.buildWhere()}
    ${POST_ORDER}
  `;
  const result = await runQuery<BlogPostRow>(executor, sql, builder.getValues());
  return result.rows.map(toPost);
};

export const findById = async (id: string, executor?: Executor): Promise<BlogPost | null> => {
  const sql = `
    SELECT ${COLUMNS}
      FROM blog_posts p
      ${WITH_CATEGORY}
     WHERE p.id = $1
  `;
  const result = await runQuery<BlogPostRow>(executor, sql, [id]);
  return result.rows[0] ? toPost(result.rows[0]) : null;
};

/**
 * Locks the post - only the post: OF p keeps the join from also locking its
 * category, which would serialise every edit filed under the same topic.
 */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BlogPost | null> => {
  const sql = `
    SELECT ${COLUMNS}
      FROM blog_posts p
      ${WITH_CATEGORY}
     WHERE p.id = $1
       FOR UPDATE OF p
  `;
  const result = await runQuery<BlogPostRow>(executor, sql, [id]);
  return result.rows[0] ? toPost(result.rows[0]) : null;
};

/**
 * Every slug in use - what a new post's derived slug is numbered around. The
 * set holds at most LIMITS.MAX_BLOG_POSTS.
 */
export const findAllSlugs = async (executor?: Executor): Promise<string[]> => {
  const result = await runQuery<{ slug: string }>(executor, 'SELECT slug FROM blog_posts');
  return result.rows.map((row) => row.slug);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM blog_posts',
  );
  return Number(result.rows[0]?.count ?? 0);
};

// ── public reads ──────────────────────────────────────────────────────────

/** The grid: every published post under a published topic, newest first. */
export const findPublishedCards = async (executor?: Executor): Promise<BlogPostCard[]> => {
  const sql = `
    SELECT ${CARD_COLUMNS}
      FROM blog_posts p
      ${WITH_CATEGORY}
     WHERE ${PUBLISHED}
    ${POST_ORDER}
  `;
  const result = await runQuery<BlogPostCardRow>(executor, sql, []);
  return result.rows.map(toCard);
};

/**
 * One article by its URL segment. Null for an unknown slug, an unpublished
 * post, and a post whose topic is unpublished - a hidden category hides what is
 * filed under it, on the article page exactly as in the grid.
 */
export const findPublishedBySlug = async (
  slug: string,
  executor?: Executor,
): Promise<BlogPost | null> => {
  const sql = `
    SELECT ${COLUMNS}
      FROM blog_posts p
      ${WITH_CATEGORY}
     WHERE p.slug = $1 AND ${PUBLISHED}
  `;
  const result = await runQuery<BlogPostRow>(executor, sql, [slug]);
  return result.rows[0] ? toPost(result.rows[0]) : null;
};

/**
 * The "keep reading" cards under an article: the same topic first, newest
 * first, then everything else, newest first, never the article itself - the
 * rule data/blog.js's getRelatedPosts has always applied, in one query.
 */
export const findPublishedRelatedCards = async (
  postId: string,
  categoryId: string,
  limit: number,
  executor?: Executor,
): Promise<BlogPostCard[]> => {
  const sql = `
    SELECT ${CARD_COLUMNS}
      FROM blog_posts p
      ${WITH_CATEGORY}
     WHERE ${PUBLISHED} AND p.id <> $1
     ORDER BY (p.category_id = $2) DESC, p.published_on DESC, p.created_at DESC
     LIMIT $3
  `;
  const result = await runQuery<BlogPostCardRow>(executor, sql, [postId, categoryId, limit]);
  return result.rows.map(toCard);
};

// ── writes ────────────────────────────────────────────────────────────────

/*
 * Every write returns through a CTE aliased `p` joined to its category, so the
 * row comes back in the admin shape - category included - in one statement.
 *
 * body is serialised explicitly: handed a JS array, pg would encode it as a
 * Postgres array literal, which is not valid jsonb.
 */

export const create = async (
  input: CreateBlogPostInput & { slug: string },
  createdBy: string | null,
  executor?: Executor,
): Promise<BlogPost> => {
  // image_url is not in the list: it is legacy / seed-only (see 049_blog.sql),
  // and a post created through the API takes both crops from uploads alone.
  const sql = `
    WITH p AS (
      INSERT INTO blog_posts
        (slug, category_id, title, excerpt,
         image_file_id, mobile_image_file_id, read_time,
         published_on, author, lead, body,
         status, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $11::jsonb,
              $12, $13, $13)
      RETURNING *
    )
    SELECT ${COLUMNS} FROM p ${WITH_CATEGORY}
  `;
  const result = await runQuery<BlogPostRow>(executor, sql, [
    input.slug,
    input.categoryId,
    input.title,
    input.excerpt,
    input.imageFileId,
    input.mobileImageFileId,
    input.readTime,
    input.publishedOn,
    input.author,
    input.lead,
    JSON.stringify(input.body),
    input.status,
    createdBy,
  ]);
  return toPost(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateBlogPostInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BlogPost | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown, cast = ''): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}${cast}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    // undefined is "leave it alone"; null clears a nullable column.
    if (value === undefined) continue;
    assign(column, value);
  }

  if (patch.publishedOn !== undefined) assign('published_on', patch.publishedOn, '::date');
  if (patch.body !== undefined) assign('body', JSON.stringify(patch.body), '::jsonb');

  /*
   * Setting the picture - to an upload or to null - always clears the legacy
   * image_url too: a seeded post's original picture is replaced by its first
   * upload and gone once it is removed. It also keeps the table's single-source
   * CHECK satisfied. Nothing else ever writes image_url.
   */
  if (patch.imageFileId !== undefined) {
    assign('image_file_id', patch.imageFileId);
    assign('image_url', null);
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);

  values.push(id);
  const sql = `
    WITH p AS (
      UPDATE blog_posts SET ${assignments.join(', ')}
       WHERE id = $${values.length}
      RETURNING *
    )
    SELECT ${COLUMNS} FROM p ${WITH_CATEGORY}
  `;
  const result = await runQuery<BlogPostRow>(executor, sql, values);
  return result.rows[0] ? toPost(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BlogPost | null> => {
  const sql = `
    WITH p AS (
      UPDATE blog_posts SET status = $2, updated_by = $3
       WHERE id = $1
      RETURNING *
    )
    SELECT ${COLUMNS} FROM p ${WITH_CATEGORY}
  `;
  const result = await runQuery<BlogPostRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toPost(result.rows[0]) : null;
};

/** A hard delete; INACTIVE covers "take it down for now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM blog_posts WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
