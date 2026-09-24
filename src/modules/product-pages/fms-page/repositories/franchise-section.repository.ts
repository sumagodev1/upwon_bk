// src/modules/product-pages/fms-page/repositories/franchise-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { FmsIconName } from '../utils/icons';
import {
  CreateFmsFranchiseCategoryInput,
  CreateFmsFranchiseEntryInput,
  FmsFranchiseCategory,
  FmsFranchiseCategoryFilters,
  FmsFranchiseStep,
  UpdateFmsFranchiseCategoryInput,
  UpdateFmsFranchiseEntryInput,
} from '../types/franchise-section.types';

/**
 * Three tables behind one section: the categories, their flow steps and their
 * benefits. Both child lists are read in bulk by category id rather than one
 * query per category, so assembling the whole section is three round trips
 * however many categories there are.
 */

// -- categories -------------------------------------------------------------

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  name: 'c.name',
  slug: 'c.slug',
  tagline: 'c.tagline',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/**
 * Columns an update may touch directly. The two media pairs are absent because
 * each needs the "setting one clears the other" handling below, and updated_by
 * is absent because it comes from the request context.
 */
const CATEGORY_UPDATABLE: Readonly<Record<string, string>> = {
  name: 'name',
  slug: 'slug',
  tagline: 'tagline',
  description: 'description',
  accentColor: 'accent_color',
  surfaceColor: 'surface_color',
  exploreLabel: 'explore_label',
  exploreHref: 'explore_href',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const CATEGORY_COLUMNS = `
  c.id, c.name, c.slug, c.tagline, c.description,
  c.icon_url, c.icon_file_id, c.image_url, c.image_file_id,
  c.accent_color, c.surface_color, c.explore_label, c.explore_href,
  c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const CATEGORY_RETURNING = `
  id, name, slug, tagline, description,
  icon_url, icon_file_id, image_url, image_file_id,
  accent_color, surface_color, explore_label, explore_href,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  icon_url: string | null;
  icon_file_id: string | null;
  image_url: string | null;
  image_file_id: string | null;
  accent_color: string;
  surface_color: string;
  explore_label: string;
  explore_href: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCategory = (row: CategoryRow): FmsFranchiseCategory => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  tagline: row.tagline,
  description: row.description,
  iconUrl: row.icon_url,
  iconFileId: row.icon_file_id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  // CHAR(7) pads nothing at seven characters, but trim anyway so a hand-written
  // row cannot hand the site a colour with a trailing space in it.
  accentColor: row.accent_color.trim(),
  surfaceColor: row.surface_color.trim(),
  exploreLabel: row.explore_label,
  exploreHref: row.explore_href,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * created_at is the tiebreaker rather than id, so two rows sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
const PUBLISHED_ORDER = 'ORDER BY c.display_order ASC, c.created_at ASC';

export const findCategoryById = async (
  id: string,
  executor?: Executor,
): Promise<FmsFranchiseCategory | null> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM fms_franchise_categories c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findCategoryByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<FmsFranchiseCategory | null> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM fms_franchise_categories c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

/** Lets the service report a duplicate slug as a field error, not a 409. */
export const findCategoryBySlug = async (
  slug: string,
  executor?: Executor,
): Promise<FmsFranchiseCategory | null> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM fms_franchise_categories c WHERE c.slug = $1`,
    [slug],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

export const findAllCategories = async (
  filters: FmsFranchiseCategoryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<FmsFranchiseCategory>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      `(c.name ILIKE ? OR c.slug ILIKE ? OR c.tagline ILIKE ? OR c.description ILIKE ?)`,
      ...Array.from({ length: 4 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the tab row.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${CATEGORY_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM fms_franchise_categories c
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<CategoryRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toCategory),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedCategories = async (
  executor?: Executor,
): Promise<FmsFranchiseCategory[]> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${CATEGORY_COLUMNS} FROM fms_franchise_categories c
      WHERE c.status = 'ACTIVE'
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toCategory);
};

export const countCategories = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM fms_franchise_categories',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextCategoryOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM fms_franchise_categories',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createCategory = async (
  input: CreateFmsFranchiseCategoryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<FmsFranchiseCategory> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `INSERT INTO fms_franchise_categories
       (name, slug, tagline, description,
        icon_url, icon_file_id, image_url, image_file_id,
        accent_color, surface_color, explore_label, explore_href,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
     RETURNING ${CATEGORY_RETURNING}`,
    [
      input.name,
      input.slug,
      input.tagline,
      input.description,
      input.iconUrl,
      input.iconFileId,
      input.imageUrl,
      input.imageFileId,
      input.accentColor,
      input.surfaceColor,
      input.exploreLabel,
      input.exploreHref,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toCategory(result.rows[0]);
};

export const updateCategory = async (
  id: string,
  patch: UpdateFmsFranchiseCategoryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<FmsFranchiseCategory | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(CATEGORY_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  /*
   * Each pair of media columns is mutually exclusive by CHECK, so setting one
   * has to clear the other in the same statement. Without this, patching a URL
   * onto a row that already has a file id violates the constraint instead of
   * replacing the image.
   */
  const assignExclusivePair = (
    urlColumn: string,
    fileColumn: string,
    url: string | null | undefined,
    fileId: string | null | undefined,
  ): void => {
    if (url !== undefined) {
      assign(urlColumn, url);
      if (url !== null && fileId === undefined) assign(fileColumn, null);
    }
    if (fileId !== undefined) {
      assign(fileColumn, fileId);
      if (fileId !== null && url === undefined) assign(urlColumn, null);
    }
  };

  assignExclusivePair('icon_url', 'icon_file_id', patch.iconUrl, patch.iconFileId);
  assignExclusivePair('image_url', 'image_file_id', patch.imageUrl, patch.imageFileId);

  if (assignments.length === 0) return findCategoryById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<CategoryRow>(
    executor,
    `UPDATE fms_franchise_categories SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${CATEGORY_RETURNING}`,
    values,
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

export const updateCategoryStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<FmsFranchiseCategory | null> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `UPDATE fms_franchise_categories SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${CATEGORY_RETURNING}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

export const applyCategoryOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE fms_franchise_categories AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingCategoryIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM fms_franchise_categories WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** The steps and benefits go with it - both child tables cascade on delete. */
export const removeCategory = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM fms_franchise_categories WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};

// -- the two child lists ----------------------------------------------------

/**
 * Steps and benefits are the same five columns owned by the same parent, so
 * one set of functions is built twice over rather than written twice.
 *
 * They are still two tables, not one with a `kind` column: the flow and the
 * strip are ordered separately, counted separately and capped separately, and
 * a shared table would mean every query carrying a discriminator that only
 * ever has two values.
 *
 * The table name is closed over from this file, never from a request - it is
 * interpolated into SQL, which parameters cannot do.
 */
interface EntryRow {
  id: string;
  category_id: string;
  title: string;
  description: string;
  icon: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const ENTRY_UPDATABLE: Readonly<Record<string, string>> = {
  title: 'title',
  description: 'description',
  icon: 'icon',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const ENTRY_COLUMNS = `
  e.id, e.category_id, e.title, e.description, e.icon,
  e.display_order, e.status,
  e.created_by, e.updated_by, e.created_at, e.updated_at
`;

const ENTRY_RETURNING = `
  id, category_id, title, description, icon,
  display_order, status, created_by, updated_by, created_at, updated_at
`;

const toEntry = (row: EntryRow): FmsFranchiseStep => ({
  id: row.id,
  categoryId: row.category_id,
  title: row.title,
  description: row.description,
  icon: row.icon as FmsIconName,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const entryRepository = (table: 'fms_franchise_steps' | 'fms_franchise_benefits') => ({
  findById: async (id: string, executor?: Executor): Promise<FmsFranchiseStep | null> => {
    const result = await runQuery<EntryRow>(
      executor,
      `SELECT ${ENTRY_COLUMNS} FROM ${table} e WHERE e.id = $1`,
      [id],
    );
    return result.rows[0] ? toEntry(result.rows[0]) : null;
  },

  findByIdForUpdate: async (
    id: string,
    executor: Executor,
  ): Promise<FmsFranchiseStep | null> => {
    const result = await runQuery<EntryRow>(
      executor,
      `SELECT ${ENTRY_COLUMNS} FROM ${table} e WHERE e.id = $1 FOR UPDATE`,
      [id],
    );
    return result.rows[0] ? toEntry(result.rows[0]) : null;
  },

  /** One category's entries, every status, in order. */
  findByCategory: async (
    categoryId: string,
    executor?: Executor,
  ): Promise<FmsFranchiseStep[]> => {
    const result = await runQuery<EntryRow>(
      executor,
      `SELECT ${ENTRY_COLUMNS} FROM ${table} e
        WHERE e.category_id = $1
        ORDER BY e.display_order ASC, e.created_at ASC`,
      [categoryId],
    );
    return result.rows.map(toEntry);
  },

  /**
   * Every active entry for the given categories, in one query.
   *
   * Assembling the section otherwise means a query per category - and the tab
   * row autoplays, so the page would be paying that cost every few seconds.
   */
  findActiveForCategories: async (
    categoryIds: string[],
    executor?: Executor,
  ): Promise<FmsFranchiseStep[]> => {
    if (categoryIds.length === 0) return [];
    const result = await runQuery<EntryRow>(
      executor,
      `SELECT ${ENTRY_COLUMNS} FROM ${table} e
        WHERE e.category_id = ANY($1::uuid[]) AND e.status = 'ACTIVE'
        ORDER BY e.display_order ASC, e.created_at ASC`,
      [categoryIds],
    );
    return result.rows.map(toEntry);
  },

  count: async (categoryId: string, executor?: Executor): Promise<number> => {
    const result = await runQuery<{ count: number }>(
      executor,
      `SELECT COUNT(*) AS count FROM ${table} WHERE category_id = $1`,
      [categoryId],
    );
    return Number(result.rows[0]?.count ?? 0);
  },

  nextOrder: async (categoryId: string, executor?: Executor): Promise<number> => {
    const result = await runQuery<{ next: number }>(
      executor,
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
         FROM ${table} WHERE category_id = $1`,
      [categoryId],
    );
    return Number(result.rows[0]?.next ?? 0);
  },

  create: async (
    categoryId: string,
    input: CreateFmsFranchiseEntryInput & { displayOrder: number },
    createdBy: string | null,
    executor?: Executor,
  ): Promise<FmsFranchiseStep> => {
    const result = await runQuery<EntryRow>(
      executor,
      `INSERT INTO ${table}
         (category_id, title, description, icon, display_order, status, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       RETURNING ${ENTRY_RETURNING}`,
      [
        categoryId,
        input.title,
        input.description,
        input.icon,
        input.displayOrder,
        input.status,
        createdBy,
      ],
    );
    return toEntry(result.rows[0]);
  },

  update: async (
    id: string,
    patch: UpdateFmsFranchiseEntryInput,
    updatedBy: string | null,
    executor?: Executor,
  ): Promise<FmsFranchiseStep | null> => {
    const assignments: string[] = [];
    const values: unknown[] = [];
    const assign = (column: string, value: unknown): void => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    for (const [key, column] of Object.entries(ENTRY_UPDATABLE)) {
      const value = (patch as Record<string, unknown>)[key];
      if (value === undefined) continue;
      assign(column, value);
    }

    if (assignments.length === 0) {
      const result = await runQuery<EntryRow>(
        executor,
        `SELECT ${ENTRY_COLUMNS} FROM ${table} e WHERE e.id = $1`,
        [id],
      );
      return result.rows[0] ? toEntry(result.rows[0]) : null;
    }

    assign('updated_by', updatedBy);
    values.push(id);

    const result = await runQuery<EntryRow>(
      executor,
      `UPDATE ${table} SET ${assignments.join(', ')}
        WHERE id = $${values.length}
       RETURNING ${ENTRY_RETURNING}`,
      values,
    );
    return result.rows[0] ? toEntry(result.rows[0]) : null;
  },

  applyOrder: async (
    categoryId: string,
    orderedIds: string[],
    updatedBy: string | null,
    executor: Executor,
  ): Promise<number> => {
    if (orderedIds.length === 0) return 0;
    const result = await runQuery(
      executor,
      `UPDATE ${table} AS e
          SET display_order = ordered.position, updated_by = $3
         FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
        WHERE e.id = ordered.id AND e.category_id = $2`,
      [orderedIds, categoryId, updatedBy],
    );
    return result.rowCount ?? 0;
  },

  remove: async (id: string, executor?: Executor): Promise<boolean> => {
    const result = await runQuery(executor, `DELETE FROM ${table} WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  },
});

/**
 * The two lists, each bound to its own table. Callers say `steps.create(...)`
 * or `benefits.create(...)`, so which table a write lands in is decided here
 * and never travels as an argument.
 */
export const steps = entryRepository('fms_franchise_steps');
export const benefits = entryRepository('fms_franchise_benefits');
