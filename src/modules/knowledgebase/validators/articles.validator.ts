// src/modules/knowledgebase/validators/articles.validator.ts

import { CONTENT_STATUSES } from '../../../config/constants';
import { validator } from '../../../core/utils/validation';
import { rawField, readBodyBlocks } from '../../blog/validators/shared';
import {
  CreateKbArticleInput,
  KbArticleFilters,
  UpdateKbArticleInput,
} from '../types/articles.types';
import { readFaqs, readUpdatedOn } from './shared';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin editor's counters are written against and the ones 052_knowledgebase.sql
 * sizes its columns to. Changing one means changing all three.
 *
 * The excerpt is longer than a blog post's (400) because it does two jobs: the
 * card's two lines and the article's opening paragraph, which on a blog post is
 * a separate lead of up to 1000.
 *
 * The body's own limits are the blog's (blog/validators/shared.ts) and the
 * FAQs' are in ./shared.ts, each beside the reader that applies them.
 *
 * There is no slug here, on create or on update: the service derives it from
 * the title when the article is created and never changes it afterwards (see
 * articlesService.create). A slug a client still sends is ignored like any
 * other unknown key.
 */
const TITLE_MIN = 3;
const TITLE_MAX = 200;
const EXCERPT_MIN = 3;
const EXCERPT_MAX = 600;
const READ_TIME_MIN = 1;
const READ_TIME_MAX = 40;

export function validateCreateKbArticle(body: unknown): CreateKbArticleInput {
  const v = validator(body);

  const title = v.requiredString('title', { min: TITLE_MIN, max: TITLE_MAX });

  // A body is required on create: an absent, empty or malformed one is refused
  // with the offending block's index in the message.
  const blocks = readBodyBlocks(v, rawField(body, 'body'));

  const dto: CreateKbArticleInput = {
    categoryId: v.requiredUuid('categoryId'),
    title,
    excerpt: v.requiredString('excerpt', { min: EXCERPT_MIN, max: EXCERPT_MAX }),
    readTime: v.requiredString('readTime', { min: READ_TIME_MIN, max: READ_TIME_MAX }),
    updatedOn: readUpdatedOn(v),
    body: blocks,
    // Optional: an article with no FAQs draws no "Frequently asked" block.
    faqs: readFaqs(v, rawField(body, 'faqs')),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * A partial edit of one article: an absent field is left alone. The editor
 * sends every field on every save, which this reads exactly as a full replace;
 * a caller that only flips one field need not resend the article.
 */
export function validateUpdateKbArticle(body: unknown): UpdateKbArticleInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'categoryId',
    'title',
    'excerpt',
    'readTime',
    'updatedOn',
    'body',
    'faqs',
    'status',
  ]);

  /*
   * The body and the FAQs are each replaced whole, never merged entry by
   * entry. A body that is present must still leave an article behind - empty
   * is refused; FAQs that are present may be empty, which removes them all.
   */
  const blocks = v.has('body') ? readBodyBlocks(v, rawField(body, 'body')) : undefined;
  const faqs = v.has('faqs') ? readFaqs(v, rawField(body, 'faqs')) : undefined;

  const dto: UpdateKbArticleInput = {
    categoryId: v.has('categoryId') ? v.requiredUuid('categoryId') : undefined,
    title: v.has('title')
      ? v.requiredString('title', { min: TITLE_MIN, max: TITLE_MAX })
      : undefined,
    excerpt: v.has('excerpt')
      ? v.requiredString('excerpt', { min: EXCERPT_MIN, max: EXCERPT_MAX })
      : undefined,
    readTime: v.has('readTime')
      ? v.requiredString('readTime', { min: READ_TIME_MIN, max: READ_TIME_MAX })
      : undefined,
    updatedOn: v.has('updatedOn') ? readUpdatedOn(v) : undefined,
    body: blocks,
    faqs,
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/** Publish / unpublish, kept separate from the editor's save. */
export function validateKbArticleStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * The admin list: a search box, a category filter and a status filter.
 *
 * No paging - the list returns every matching article, newest first, as a
 * plain array like the blog's post list. The set is bounded by
 * LIMITS.MAX_KB_ARTICLES. A `page` or `limit` a client sends is ignored rather
 * than refused.
 */
export function validateKbArticleListQuery(query: Record<string, unknown>): KbArticleFilters {
  const v = validator(query);
  // Three filters, each of which a filter bar may send as '' for "any" - read
  // as absent rather than answered with a REQUIRED error.
  const filters: KbArticleFilters = {
    status: v.nullableString('status') ? v.requiredEnum('status', CONTENT_STATUSES) : undefined,
    categoryId: v.nullableString('categoryId') ? v.requiredUuid('categoryId') : undefined,
    search: v.nullableString('search', { max: 120 }) ?? undefined,
  };
  v.assert();
  return filters;
}
