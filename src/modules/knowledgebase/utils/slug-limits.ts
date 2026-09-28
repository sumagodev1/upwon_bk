// src/modules/knowledgebase/utils/slug-limits.ts

/**
 * The column sizes of the knowledgebase's two slugs (052_knowledgebase.sql).
 *
 * A derived slug is trimmed to these, and a public :slug longer than any real
 * one is answered with a 404 before any query runs (the blog's isPlausibleSlug).
 * Every other slug rule - the format, deriving one from free text, numbering a
 * collision away - is the Blog module's (blog/utils/slug.ts), shared rather
 * than copied, so a knowledgebase URL segment is shaped exactly like a blog one.
 *
 *   category  /knowledgebase/<slug>, derived from a name of up to 80 characters.
 *   article   /knowledgebase/<category>/<slug>, derived from a title of up to
 *             200, trimmed to the blog post slug's 120.
 */
export const KB_CATEGORY_SLUG_MAX = 80;
export const KB_ARTICLE_SLUG_MAX = 120;
