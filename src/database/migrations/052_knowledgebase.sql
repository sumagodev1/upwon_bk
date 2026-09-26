-- Knowledgebase CMS: the /knowledgebase hub's hero and category cards, and the
-- articles each /knowledgebase/<category> page lists and each
-- /knowledgebase/<category>/<article> page renders. Managed from the admin
-- panel's "Resource Page > Knowledgebase" sidebar item, on the Blog's shapes
-- (049, 050):
--
--   kb_hero_slides   the hub's hero carousel - blog_hero_slides column for
--                    column.
--   kb_categories    an ordered child list: the hub's cards, each also the
--                    page its slug names.
--   kb_articles      the guides. NOT ordered by hand - a category page lists
--                    them newest first by their "Updated" date - so there is
--                    no display_order here, only updated_on.
--
-- These values used to live in the website's code: src/data/knowledgebase.js
-- (KB_CATEGORIES and KB_ARTICLES, bodies and FAQs included) and the
-- HERO_SLIDES copy in src/pages/Knowledgebase/KnowledgebasePage.jsx. The site
-- keeps both as its fallback - data/knowledgebase.js still feeds the
-- prerendered /knowledgebase routes and the sitemap - and prefers the API
-- whenever it answers.
--
-- Only what the site renders is stored. data/knowledgebase.js also carries a
-- search description and keywords per category and article, a publish date,
-- and a hand-picked `related` list; none is authored here. An article's search
-- description is its excerpt, a category's is its description, its one date
-- is updated_on, and its related guides are derived (same category first).
--
-- No default rows are inserted here. Today's copy, the three categories and
-- every article are seeded (src/database/seeds/knowledgebase.data.ts), so the
-- panel shows the live content from its first run.
--
-- As in 049, the CHECKs below are the last line of defence, not the rules: the
-- validators in modules/knowledgebase own the exact formats and give the field
-- errors, and every VARCHAR size here is the validator's own limit.


-- -- the hero ----------------------------------------------------------------
--
-- blog_hero_slides (050) with the same decisions -
--
--   an eyebrow column, required: the hub's pill is authored copy
--     ('KNOWLEDGEBASE'), not derived from the URL.
--   no image_alt column. HeroSlider draws the backdrop as decoration
--     (alt=""), so there is no text to author.
--   no mobile_image_url column. Pictures are uploads; the hub has never had a
--     phone crop to carry over, so the phone image is a file id only.
--   image_url is legacy / seed-only: it holds the seeded slide's backdrop (the
--     Unsplash photograph KnowledgebasePage.jsx has always used), for which no
--     uploaded file exists, and the admin API never writes a URL into it. The
--     slide's first upload, or removing its picture, clears it.
--
-- No button labels: the site fixes both buttons in its code
-- (KnowledgebasePage.jsx: 'Request a Demo' -> /demo, 'Read the Blog' -> /blog).

CREATE TABLE kb_hero_slides (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The small caps pill above the headline.
  eyebrow               VARCHAR(120)  NOT NULL,
  -- Plain text. HeroSlider sets the weight itself by splitting on an em-dash,
  -- so there is no accent markup to store.
  heading               TEXT          NOT NULL,
  subtext               TEXT          NOT NULL,

  -- The desktop background: an upload (image_file_id), or the legacy seeded
  -- backdrop (image_url - see above). At most one of them; neither means the
  -- site draws the slide on its built-in backdrop.
  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- Narrow-viewport art, an upload only. NULL falls back to the desktop image.
  mobile_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- Ascending. Not UNIQUE, for the same reason as home_hero_slides: a reorder
  -- rewrites the whole set in one statement.
  display_order         INTEGER       NOT NULL DEFAULT 0,

  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT kb_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT kb_hero_slides_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT kb_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  -- Blank-but-present copy renders as an empty headline, which is worse than a
  -- validation error at write time.
  CONSTRAINT kb_hero_slides_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> '')
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX kb_hero_slides_published_idx
  ON kb_hero_slides (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Let the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX kb_hero_slides_image_file_idx
  ON kb_hero_slides (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE INDEX kb_hero_slides_mobile_image_file_idx
  ON kb_hero_slides (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

CREATE TRIGGER kb_hero_slides_set_updated_at
  BEFORE UPDATE ON kb_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -- the categories ----------------------------------------------------------

CREATE TABLE kb_categories (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * The URL segment: /knowledgebase/<slug>, and what an article's summary
   * names its category by on the public side. The seeded three keep the slugs
   * data/knowledgebase.js gave them, so the site's built-in articles, its
   * prerendered routes and the API agree on what 'compliance' means. Unique,
   * and in the same URL-segment format as every other slug in the schema.
   * Never typed by an administrator: the service derives it from the name on
   * create (numbering a collision -2, -3...) and no edit ever changes it.
   */
  slug           VARCHAR(80)   NOT NULL,
  -- The card's title and the category page's headline.
  name           VARCHAR(80)   NOT NULL,
  -- The card's paragraph and the category page's standfirst.
  description    VARCHAR(300)  NOT NULL,

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images. The allowlist
  -- is the Blog's (modules/knowledgebase/utils/icons.ts).
  icon           VARCHAR(60)   NOT NULL,

  status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  display_order  INTEGER       NOT NULL DEFAULT 0,

  created_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT kb_categories_slug_key UNIQUE (slug),

  CONSTRAINT kb_categories_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT kb_categories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT kb_categories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT kb_categories_copy_not_blank_check
    CHECK (btrim(name) <> '' AND btrim(description) <> '' AND btrim(icon) <> '')
);

CREATE INDEX kb_categories_published_idx
  ON kb_categories (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE INDEX kb_categories_order_idx
  ON kb_categories (display_order ASC, created_at ASC);

CREATE TRIGGER kb_categories_set_updated_at
  BEFORE UPDATE ON kb_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -- the articles ------------------------------------------------------------

CREATE TABLE kb_articles (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * The last URL segment: /knowledgebase/<category>/<slug>. Unique across the
   * whole knowledgebase, not per category, so moving an article to another
   * category can never collide - and the seeded articles keep the slugs
   * data/knowledgebase.js gave them. Derived from the title on create and
   * never changed afterwards.
   */
  slug           VARCHAR(120)   NOT NULL,

  /*
   * RESTRICT, not CASCADE: deleting a category must never quietly delete the
   * guides filed under it. The service answers a delete of a category that
   * still holds articles with a 409 KB_CATEGORY_IN_USE before this is
   * reached; the constraint is what makes that true under concurrency too.
   */
  category_id    UUID           NOT NULL
                                REFERENCES kb_categories(id) ON DELETE RESTRICT,

  title          VARCHAR(200)   NOT NULL,
  -- The card's two lines, AND the article's opening (lead) paragraph - one
  -- piece of copy doing both jobs, as data/knowledgebase.js has always used it.
  excerpt        VARCHAR(600)   NOT NULL,

  -- Copy, not a number ('6 min read'): authors write it the way it reads.
  -- Required: every card and every article header prints it.
  read_time      VARCHAR(40)    NOT NULL,

  /*
   * The "Updated" date printed on the card and under the article's title, and
   * the category page's only ordering: newest first, created_at breaking a
   * same-day tie. A DATE, not a timestamp - a guide is "updated 4 Feb", and a
   * time of day would only invite the timezone to move it to the 3rd. Authored
   * rather than taken from updated_at: fixing a typo is not a new revision.
   */
  updated_on     DATE           NOT NULL,

  /*
   * The article as structured blocks - exactly blog_posts.body's shape, which
   * data/knowledgebase.js has always mirrored, so no markdown or HTML is ever
   * stored or interpreted:
   *
   *   { "type": "p",     "text": "..." }
   *   { "type": "h2",    "text": "..." }
   *   { "type": "ul",    "items": ["...", ...] }
   *   { "type": "quote", "text": "...", "cite": "..." | null }
   *
   * The block shapes are the validator's job; the table only insists on a
   * non-empty array of at most 80.
   */
  body           JSONB          NOT NULL,

  /*
   * The "Frequently asked" accordion under the body:
   *
   *   [{ "question": "...", "answer": "..." }, ...]
   *
   * Zero entries is allowed - the site then draws no FAQ block - and twenty
   * is the most. The entry shapes are the validator's job.
   */
  faqs           JSONB          NOT NULL DEFAULT '[]'::jsonb,

  status         VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',

  created_by     UUID           REFERENCES admins(id) ON DELETE SET NULL,
  updated_by     UUID           REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT kb_articles_slug_key UNIQUE (slug),

  CONSTRAINT kb_articles_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT kb_articles_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT kb_articles_body_shape_check
    CHECK (
      jsonb_typeof(body) = 'array'
      AND jsonb_array_length(body) BETWEEN 1 AND 80
    ),
  CONSTRAINT kb_articles_faqs_shape_check
    CHECK (
      jsonb_typeof(faqs) = 'array'
      AND jsonb_array_length(faqs) <= 20
    ),
  CONSTRAINT kb_articles_copy_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(excerpt) <> '' AND btrim(read_time) <> '')
);

-- The admin list: newest first.
CREATE INDEX kb_articles_order_idx
  ON kb_articles (updated_on DESC, created_at DESC);

-- A category page's list, the hub's counts, the "in use" check on a category
-- delete, and the RESTRICT foreign key itself, which would otherwise scan the
-- table on every delete.
CREATE INDEX kb_articles_category_idx
  ON kb_articles (category_id, updated_on DESC, created_at DESC);

CREATE TRIGGER kb_articles_set_updated_at
  BEFORE UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
