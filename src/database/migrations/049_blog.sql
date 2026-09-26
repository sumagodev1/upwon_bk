-- Blog CMS: the /blog page's hero and topics copy, its topic categories, and
-- the posts themselves.
--
-- The admin panel files this under a "Resource Page" sidebar parent, with Blog
-- as its first child. Four tables, on the shapes the rest of the CMS already
-- uses:
--
--   blog_hero_section     singleton (id = 1): the one hero slide's copy and
--                         its two button labels.
--   blog_topics_section   singleton (id = 1): the "Insights by Topic" intro
--                         above the category chips.
--   blog_categories       an ordered child list: the chips, each a lucide icon
--                         name and a label.
--   blog_posts            the articles. NOT ordered by hand - the page lists
--                         them newest first by their publish date, and the
--                         newest one is the featured card - so there is no
--                         display_order here, only published_on.
--
-- These values used to live in the website's code: src/data/blog.js
-- (CATEGORIES and POSTS, bodies included) and the HERO_SLIDES and SectionIntro
-- copy in src/pages/Blog/BlogPage.jsx. The site keeps both as its fallback -
-- data/blog.js still feeds the prerendered /blog/<slug> routes - and prefers
-- the API whenever it answers.
--
-- No default rows are inserted here. Today's copy, the six categories and
-- every post are seeded (src/database/seeds/blog.data.ts), so the panel shows
-- the live content from its first run.
--
-- As in 017, the CHECKs below are the last line of defence, not the rules: the
-- validators in modules/blog own the exact formats and give the field errors,
-- and every VARCHAR size here is the validator's own limit.


-- -- the hero ----------------------------------------------------------------

CREATE TABLE blog_hero_section (
  id                   SMALLINT      PRIMARY KEY DEFAULT 1,

  -- The small caps line above the headline ('THE UPWON BLOG').
  eyebrow              VARCHAR(60)   NOT NULL,
  -- Plain text: HeroSlider draws the headline as it is written.
  heading              VARCHAR(160)  NOT NULL,
  subtext              VARCHAR(300)  NOT NULL,

  /*
   * The labels of the two buttons under the copy. Both required: the slider
   * lays them out as a pair, and a hero with one of them missing is a layout
   * the page has never had. Only the wording is authored - where the buttons
   * go is fixed in the site's code (BlogPage.jsx: primary -> /demo, secondary
   * -> /knowledgebase), so no link is stored here.
   */
  primary_cta_label    VARCHAR(40)   NOT NULL,
  secondary_cta_label  VARCHAR(40)   NOT NULL,

  updated_by           UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT blog_hero_section_singleton_check
    CHECK (id = 1),
  CONSTRAINT blog_hero_section_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> ''
      AND btrim(primary_cta_label) <> '' AND btrim(secondary_cta_label) <> ''
    )
);

CREATE TRIGGER blog_hero_section_set_updated_at
  BEFORE UPDATE ON blog_hero_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -- the topics intro --------------------------------------------------------

CREATE TABLE blog_topics_section (
  id           SMALLINT      PRIMARY KEY DEFAULT 1,

  eyebrow      VARCHAR(60)   NOT NULL,
  -- The home heading markup: '**accent**' marks the orange span
  -- ('Pick the Lane **You Operate In.**'). Parsed server-side into
  -- headingLines, so the site never interprets markup itself.
  heading      VARCHAR(160)  NOT NULL,
  subtext      VARCHAR(300)  NOT NULL,

  updated_by   UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT blog_topics_section_singleton_check
    CHECK (id = 1),
  CONSTRAINT blog_topics_section_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> '')
);

CREATE TRIGGER blog_topics_section_set_updated_at
  BEFORE UPDATE ON blog_topics_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -- the categories ----------------------------------------------------------

CREATE TABLE blog_categories (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * A stable key for the category ('food-mfg'), and what a post's summary
   * names its category by on the public side. The seeded six keep the ids
   * data/blog.js gave them, so the site's built-in posts and the API's agree
   * on what 'franchise' means. Unique, and in the same URL-segment format as
   * every other slug in the schema. Never typed by an administrator: the
   * service derives it from the label on create (numbering a collision -2,
   * -3...) and no edit ever changes it.
   */
  slug           VARCHAR(60)   NOT NULL,
  label          VARCHAR(60)   NOT NULL,

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images. The allowlist
  -- lives in modules/blog/utils/icons.ts.
  icon           VARCHAR(60)   NOT NULL,

  status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  display_order  INTEGER       NOT NULL DEFAULT 0,

  created_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT blog_categories_slug_key UNIQUE (slug),

  CONSTRAINT blog_categories_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT blog_categories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT blog_categories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT blog_categories_copy_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(icon) <> '')
);

CREATE INDEX blog_categories_published_idx
  ON blog_categories (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE INDEX blog_categories_order_idx
  ON blog_categories (display_order ASC, created_at ASC);

CREATE TRIGGER blog_categories_set_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -- the posts ---------------------------------------------------------------

CREATE TABLE blog_posts (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The URL segment: /blog/<slug>. Unique across the blog, not per category -
  -- the category is not part of the URL.
  slug                   VARCHAR(120)   NOT NULL,

  /*
   * RESTRICT, not CASCADE: deleting a topic must never quietly delete the
   * articles filed under it. The service answers a delete of a category that
   * still holds posts with a 409 BLOG_CATEGORY_IN_USE before this is reached;
   * the constraint is what makes that true under concurrency too.
   */
  category_id            UUID           NOT NULL
                                        REFERENCES blog_categories(id) ON DELETE RESTRICT,

  title                  VARCHAR(200)   NOT NULL,
  -- The two lines on the card, and the featured card's standfirst.
  excerpt                VARCHAR(400)   NOT NULL,

  /*
   * The picture is an upload (image_file_id): the admin API takes no URL.
   * image_url is legacy / seed-only - it holds the nine seeded posts' existing
   * pictures (the Unsplash URLs data/blog.js has always used, for which no
   * uploaded file exists) and is NEVER written by the admin API; the first
   * upload for a post (or removing its picture) clears it. Never both, as the
   * CHECK below insists. Neither is allowed - the site then draws the card
   * without a picture - but every seeded post has one.
   */
  image_url              VARCHAR(1000),
  image_file_id          UUID           REFERENCES files(id) ON DELETE SET NULL,

  /*
   * An optional second crop of the same picture for narrow screens, which the
   * site serves through a <picture> source at (max-width: 767px) - the article
   * header behind the title is a portrait band on a phone, and the wide
   * desktop picture would lose most of its width there. An upload only, like
   * image_file_id: there is no mobile_image_url column at all, since no post
   * has ever had a phone picture to carry over and the admin API never takes a
   * URL. NULL means the desktop picture serves every width, which is what every
   * seeded post does. Never set without a desktop picture - the site only
   * swaps a source under one, so the service refuses a mobile crop on its own.
   */
  mobile_image_file_id   UUID           REFERENCES files(id) ON DELETE SET NULL,
  -- No image_alt column, by design: the site's alt text for a post's picture
  -- is always its title, so there is nothing separate to author.

  -- Copy, not a number ('6 min read'): authors write it the way it reads.
  read_time              VARCHAR(40),

  /*
   * The date printed on the card ('28 May 2026') and the only ordering the
   * page has: newest first, created_at breaking a same-day tie. A DATE, not a
   * timestamp - a post is "from 28 May", and a time of day would only invite
   * the timezone to move it to the 27th.
   */
  published_on           DATE           NOT NULL,

  author                 VARCHAR(120)   NOT NULL,
  -- The large intro paragraph above the article body.
  lead                   VARCHAR(1000)  NOT NULL,

  /*
   * The article as structured blocks, exactly the shape data/blog.js has
   * always used, so no markdown or HTML is ever stored or interpreted:
   *
   *   { "type": "p",     "text": "..." }
   *   { "type": "h2",    "text": "..." }
   *   { "type": "ul",    "items": ["...", ...] }
   *   { "type": "quote", "text": "...", "cite": "..." | null }
   *
   * The block shapes are the validator's job (validators/posts.validator.ts);
   * the table only insists on a non-empty array of at most 80.
   */
  body                   JSONB          NOT NULL,

  status                 VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',

  created_by             UUID           REFERENCES admins(id) ON DELETE SET NULL,
  updated_by             UUID           REFERENCES admins(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT blog_posts_slug_key UNIQUE (slug),

  CONSTRAINT blog_posts_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT blog_posts_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT blog_posts_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT blog_posts_body_shape_check
    CHECK (
      jsonb_typeof(body) = 'array'
      AND jsonb_array_length(body) BETWEEN 1 AND 80
    ),
  CONSTRAINT blog_posts_copy_not_blank_check
    CHECK (
      btrim(title) <> '' AND btrim(excerpt) <> ''
      AND btrim(author) <> '' AND btrim(lead) <> ''
    ),
  CONSTRAINT blog_posts_optional_copy_not_blank_check
    CHECK (read_time IS NULL OR btrim(read_time) <> '')
);

-- The public index and the admin list: newest first.
CREATE INDEX blog_posts_published_idx
  ON blog_posts (published_on DESC, created_at DESC)
  WHERE status = 'ACTIVE';

CREATE INDEX blog_posts_order_idx
  ON blog_posts (published_on DESC, created_at DESC);

-- The chip counts, the "in use" check on a category delete, and the RESTRICT
-- foreign key itself, which would otherwise scan the table on every delete.
CREATE INDEX blog_posts_category_idx
  ON blog_posts (category_id);

CREATE INDEX blog_posts_image_file_idx
  ON blog_posts (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE INDEX blog_posts_mobile_image_file_idx
  ON blog_posts (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

CREATE TRIGGER blog_posts_set_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
