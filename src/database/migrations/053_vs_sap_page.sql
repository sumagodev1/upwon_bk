-- UpWon vs SAP CMS: the /compare/upwon-vs-sap page's hero, its "The straight
-- answer" section and its capability comparison table. Managed from the admin
-- panel's "Resource Page > UpWon vs SAP" sidebar item.
--
-- Four tables, one per thing the user asked to manage:
--
--   vs_sap_hero_slides          the hero carousel - free_audit_hero_slides (051)
--                               column for column.
--   vs_sap_answer_section       singleton (id = 1): the two side-by-side cards
--                               under "The straight answer".
--   vs_sap_comparison_section   singleton (id = 1): the comparison table's copy
--                               and its "Total Cost of Ownership" row.
--   vs_sap_capabilities         an ordered child list: the table's rows.
--
-- These values used to live in the website's code: HERO_SLIDES, WINS and
-- WHEN_SAP in src/pages/VsSap/VsSapPage.jsx, and - for the table - the shared
-- ComparisonMatrix component, which reads COMPETITORS from src/data/metrics.js
-- and hard-codes its TCO labels. That component is also drawn on the Tally
-- comparison and the alternatives page, which keep reading metrics.js: only
-- this page's copy of the table is authored here. The site keeps today's
-- content as its fallback and prefers the API whenever it answers.
--
-- Only what the page renders is stored. The "THE MATH" band under the table,
-- the SEO tags, the hero's accent colour and every button (label and target)
-- stay in the page's code and have no column here.
--
-- No default rows are inserted here. Today's copy, both cards' points and
-- every capability row are seeded (src/database/seeds/vs-sap-page.data.ts), so
-- the panel shows the live content from its first run.
--
-- As in 049, the CHECKs below are the last line of defence, not the rules: the
-- validators in modules/vs-sap-page own the exact formats and give the field
-- errors, and every VARCHAR size here is the validator's own limit.

-- ── the hero ──────────────────────────────────────────────────────────────
--
-- The page renders the site's shared HeroSlider, the same component as the
-- /free-audit hero, so it is authored the same way: free_audit_hero_slides
-- (051) column for column, with the same decisions -
--
--   an eyebrow column, required: the page's pill is authored copy
--     ('HONEST COMPARISON'), not derived from the URL.
--   no image_alt column. HeroSlider draws the backdrop as decoration
--     (alt=""), so there is no text to author.
--   no mobile_image_url column. Pictures are uploads; the page has never had
--     a phone crop to carry over, so the phone image is a file id only.
--   image_url is legacy / seed-only: it holds the seeded slide's site artwork
--     ('/images/hero%20bg.webp'), for which no uploaded file exists, and the
--     admin API never writes a URL into it. The slide's first upload, or
--     removing its picture, clears it.
--
-- No button labels: the site fixes both buttons in its code
-- (VsSapPage.jsx: 'Request a Demo' -> /demo, 'Calculate Your ROI' ->
-- /roi-calculator).

CREATE TABLE vs_sap_hero_slides (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The small caps pill above the headline.
  eyebrow               VARCHAR(120)  NOT NULL,
  -- Plain text. HeroSlider sets the weight itself by splitting on an em-dash,
  -- so there is no accent markup to store.
  heading               TEXT          NOT NULL,
  subtext               TEXT          NOT NULL,

  -- The desktop background: an upload (image_file_id), or the legacy seeded
  -- site path (image_url - see above). At most one of them; neither means the
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

  CONSTRAINT vs_sap_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT vs_sap_hero_slides_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT vs_sap_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  -- Blank-but-present copy renders as an empty headline, which is worse than a
  -- validation error at write time.
  CONSTRAINT vs_sap_hero_slides_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> '')
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX vs_sap_hero_slides_published_idx
  ON vs_sap_hero_slides (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Let the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX vs_sap_hero_slides_image_file_idx
  ON vs_sap_hero_slides (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE INDEX vs_sap_hero_slides_mobile_image_file_idx
  ON vs_sap_hero_slides (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

CREATE TRIGGER vs_sap_hero_slides_set_updated_at
  BEFORE UPDATE ON vs_sap_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── the straight answer ───────────────────────────────────────────────────
--
-- The headline, then two cards side by side - the orange "why operators choose
-- UpWon" card and the white "when SAP B1 is the right choice" card - each a
-- small caps title over a list of points, and the italic verdict under the
-- second card. One singleton row, because it is one editing job: the two lists
-- are an argument made against each other, and splitting them would mean two
-- saves for one intent.

CREATE TABLE vs_sap_answer_section (
  id             SMALLINT      PRIMARY KEY DEFAULT 1,

  -- The small label above the headline ('The straight answer').
  eyebrow        VARCHAR(60)   NOT NULL,

  -- The home heading markup with at most ONE '**accent**' span - the orange
  -- phrase at the end ('When UpWon Wins. When SAP Wins. **No Spin.**'). Parsed
  -- server-side into headingLines, so the site never interprets markup itself.
  heading        VARCHAR(200)  NOT NULL,

  -- The orange card: its title, then its ticked points.
  upwon_title    VARCHAR(120)  NOT NULL,

  /*
   * An ordered array of plain strings, one per point, 1..10 of them and each at
   * most 240 characters (the validator's rule). jsonb rather than a child table
   * for the reason contact_form_section's choice lists are: ordered copy with
   * no identity, status or order of its own, always written as a whole set with
   * the card around it.
   */
  upwon_points   JSONB         NOT NULL DEFAULT '[]'::jsonb,

  -- The white card: the same pair.
  sap_title      VARCHAR(120)  NOT NULL,
  sap_points     JSONB         NOT NULL DEFAULT '[]'::jsonb,

  -- The italic line under the white card's points.
  closing_line   VARCHAR(240)  NOT NULL,

  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT vs_sap_answer_section_singleton_check
    CHECK (id = 1),

  -- The shape of each entry is enforced by the validator, which can report a
  -- field error; a CHECK can only say the whole column is wrong.
  CONSTRAINT vs_sap_answer_section_upwon_points_is_array_check
    CHECK (jsonb_typeof(upwon_points) = 'array'),

  CONSTRAINT vs_sap_answer_section_sap_points_is_array_check
    CHECK (jsonb_typeof(sap_points) = 'array'),

  CONSTRAINT vs_sap_answer_section_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> ''
      AND btrim(upwon_title) <> '' AND btrim(sap_title) <> ''
      AND btrim(closing_line) <> ''
    )
);

CREATE TRIGGER vs_sap_answer_section_set_updated_at
  BEFORE UPDATE ON vs_sap_answer_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── the capability comparison ─────────────────────────────────────────────
--
-- Two tables for one tab, on the About page's Number section split (026): the
-- table's copy is a singleton, and its rows are created, edited, published,
-- reordered and deleted.
--
-- The columns are fixed at three - UpWon, SAP B1 and Oracle NetSuite - because
-- that is the comparison this page makes (ComparisonMatrix's subset there).
-- Their headers are the component's own labels and are not authored.

CREATE TABLE vs_sap_comparison_section (
  id             SMALLINT      PRIMARY KEY DEFAULT 1,

  -- The small label above the headline ('Capability comparison').
  eyebrow        VARCHAR(60)   NOT NULL,
  -- Plain text: the table's heading component draws no accent span.
  heading        VARCHAR(200)  NOT NULL,
  subtext        VARCHAR(300)  NOT NULL,

  /*
   * The "Total Cost of Ownership (3 yr)" row under the capabilities: one short
   * verdict per column, printed in capitals ('BEST', 'HIGHEST', 'VERY HIGH').
   * Only the words are authored - the row's label and each cell's colour stay
   * in the component.
   */
  tco_upwon      VARCHAR(40)   NOT NULL,
  tco_sap        VARCHAR(40)   NOT NULL,
  tco_netsuite   VARCHAR(40)   NOT NULL,

  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT vs_sap_comparison_section_singleton_check
    CHECK (id = 1),

  CONSTRAINT vs_sap_comparison_section_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> ''
      AND btrim(tco_upwon) <> '' AND btrim(tco_sap) <> '' AND btrim(tco_netsuite) <> ''
    )
);

CREATE TRIGGER vs_sap_comparison_section_set_updated_at
  BEFORE UPDATE ON vs_sap_comparison_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE vs_sap_capabilities (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The row's label in the table's first column ('FSSAI compliance (native)').
  capability     VARCHAR(120)  NOT NULL,

  /*
   * One rating per column, as the site draws it: 1 to 5 filled stars out of
   * five, and 0 for "not available natively", which renders as a dash rather
   * than as five empty stars. Integers, not text: the component counts stars
   * from them, and a value outside 0..5 would draw a row that means nothing.
   */
  upwon          INTEGER       NOT NULL,
  sap            INTEGER       NOT NULL,
  netsuite       INTEGER       NOT NULL,

  status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  display_order  INTEGER       NOT NULL DEFAULT 0,

  created_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT vs_sap_capabilities_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT vs_sap_capabilities_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT vs_sap_capabilities_rating_range_check
    CHECK (
      upwon BETWEEN 0 AND 5 AND sap BETWEEN 0 AND 5 AND netsuite BETWEEN 0 AND 5
    ),

  CONSTRAINT vs_sap_capabilities_capability_not_blank_check
    CHECK (btrim(capability) <> '')
);

-- The public read path: ACTIVE rows in display order, with created_at as the
-- tie-break - see about_number_stats_published_idx.
CREATE INDEX vs_sap_capabilities_published_idx
  ON vs_sap_capabilities (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE INDEX vs_sap_capabilities_order_idx
  ON vs_sap_capabilities (display_order ASC, created_at ASC);

CREATE TRIGGER vs_sap_capabilities_set_updated_at
  BEFORE UPDATE ON vs_sap_capabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
