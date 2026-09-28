-- The Vendor Portal (VMS) product page.
--
-- Six sections arrive together, because the page is being taken over from the
-- copy the site ships rather than grown section by section: the hero slider,
-- the proof strip, the capability carousel, the customer-outcome showcase,
-- the FAQ and the closing band.
--
-- Each table follows the shape its equivalent carries on the WMS, HREasy and
-- POS pages. Where this page differs it is because the design differs, and
-- each of those is commented where it happens.
--
-- The eyebrow, heading and subtext for five of the six live once each in
-- page_section_copy under ('vms', <section>). The hero is the exception, as on
-- every other product page: its slides each carry their own.
--
-- 'vms' is a new page key, so that check widens first. Every section key this
-- page uses - 'proof', 'capabilities', 'outcomes', 'faq', 'cta' - is already
-- allowed by other pages, so the section check is left alone.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp', 'sfa-dms', 'fms', 'pos', 'hreasy', 'wms', 'vms'));

-- ── the hero slider ───────────────────────────────────────────────────────
--
-- Five slides, each its own pitch. The same shape as vms_hero_slides' WMS
-- equivalent, down to the optional phone crop: the slider component is shared
-- across every product page, so a slide that differed in shape would need a
-- second component.

CREATE TABLE vms_hero_slides (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  eyebrow               VARCHAR(120)  NOT NULL,
  -- Authored text, not HTML: a newline is a line break and **like this** is the
  -- orange accent. Parsed server-side into headlineLines.
  headline              TEXT          NOT NULL,
  subhead               TEXT          NOT NULL,
  -- The small reassurance line under the buttons. Unused by the shipped
  -- slides, kept because the shared slider draws it when it is set.
  micro_trust           VARCHAR(300),

  -- Both buttons are optional, and each needs both halves to be usable.
  cta_label             VARCHAR(120),
  cta_href              VARCHAR(500),
  secondary_label       VARCHAR(120),
  secondary_href        VARCHAR(500),

  -- The slide background, from one of two mutually exclusive sources.
  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The portrait crop shown under 768px. Null falls back to the desktop image,
  -- which is what every slide does today.
  mobile_image_url      VARCHAR(1000),
  mobile_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT vms_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT vms_hero_slides_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT vms_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT vms_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  -- A button is both halves or neither: a label with no destination is a dead
  -- link, and a destination with no label is invisible.
  CONSTRAINT vms_hero_slides_cta_pair_check
    CHECK (num_nonnulls(cta_label, cta_href) <> 1),
  CONSTRAINT vms_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT vms_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> ''
    )
);

CREATE INDEX idx_vms_hero_slides_order ON vms_hero_slides (display_order, created_at);
CREATE INDEX idx_vms_hero_slides_status ON vms_hero_slides (status);

-- ── the proof strip ───────────────────────────────────────────────────────
--
-- A twelve-column bento, not the uniform row the WMS page carries. Five tiles
-- today in two rows: a metric card beside a wide picture, then a picture and
-- two narrower metric cards.
--
-- One table with two kinds rather than two tables - the same reasoning as
-- hreasy_proof_tiles. They are one thing to an editor (a tile in the bento),
-- they share an ordering, and the per-kind columns are guarded by a CHECK so
-- a METRIC row cannot carry a picture and an IMAGE row cannot carry a figure.
--
-- col_span is what makes the bento a bento. It is stored rather than derived
-- because the layout is an editorial choice, not a consequence of the order:
-- the shipped set is 5+7 then 5+3+4, and nothing about the tiles themselves
-- says so.

CREATE TABLE vms_proof_tiles (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  kind              VARCHAR(20)   NOT NULL,

  /*
   * How many of the twelve columns this tile occupies on a desktop grid.
   * Below that breakpoint every tile is full width, so this is ignored.
   */
  col_span          SMALLINT      NOT NULL DEFAULT 4,

  -- METRIC: a pictogram, the figure, which way the arrow points, and the copy.
  icon              VARCHAR(60),
  value             VARCHAR(40),
  /*
   * Which way the little arrow beside the figure points. It is the direction
   * of the change, not of the benefit: "32% processing time" is an
   * improvement drawn with a down arrow.
   */
  direction         VARCHAR(10),
  title             VARCHAR(200),
  description       TEXT,

  -- IMAGE: the picture and what a screen reader reads in its place.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  image_alt         VARCHAR(255),

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT vms_proof_tiles_kind_check
    CHECK (kind IN ('METRIC', 'IMAGE')),
  CONSTRAINT vms_proof_tiles_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT vms_proof_tiles_display_order_check
    CHECK (display_order >= 0),
  -- A tile narrower than a quarter of the grid cannot hold its own copy, and
  -- one wider than the grid would wrap on its own.
  CONSTRAINT vms_proof_tiles_col_span_check
    CHECK (col_span BETWEEN 3 AND 12),
  CONSTRAINT vms_proof_tiles_direction_check
    CHECK (direction IS NULL OR direction IN ('up', 'down')),
  CONSTRAINT vms_proof_tiles_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  /*
   * Each kind carries its own fields and not the other's.
   *
   * A METRIC needs all five of its own and no picture; an IMAGE needs exactly
   * one source and none of the metric fields. Without this a tile could be
   * saved half as one kind and half as the other, and the site would draw
   * whichever half its component happened to read.
   */
  CONSTRAINT vms_proof_tiles_metric_shape_check
    CHECK (
      kind <> 'METRIC' OR (
        btrim(coalesce(icon, '')) <> ''
        AND btrim(coalesce(value, '')) <> ''
        AND direction IS NOT NULL
        AND btrim(coalesce(title, '')) <> ''
        AND btrim(coalesce(description, '')) <> ''
        AND num_nonnulls(image_url, image_file_id) = 0
      )
    ),
  CONSTRAINT vms_proof_tiles_image_shape_check
    CHECK (
      kind <> 'IMAGE' OR (
        num_nonnulls(image_url, image_file_id) = 1
        AND icon IS NULL
        AND value IS NULL
        AND direction IS NULL
        AND title IS NULL
        AND description IS NULL
      )
    ),
  -- Absent is how alt text is left off; blank is a stored empty string that
  -- reads the same but looks like an oversight, so it is rejected.
  CONSTRAINT vms_proof_tiles_image_alt_check
    CHECK (image_alt IS NULL OR btrim(image_alt) <> '')
);

CREATE INDEX idx_vms_proof_tiles_order ON vms_proof_tiles (display_order, created_at);
CREATE INDEX idx_vms_proof_tiles_status ON vms_proof_tiles (status);
CREATE INDEX idx_vms_proof_tiles_image_file
  ON vms_proof_tiles (image_file_id) WHERE image_file_id IS NOT NULL;

-- ── the capability carousel ───────────────────────────────────────────────
--
-- Seven cards the visitor scrolls sideways through, each a screenshot with a
-- title and a line.
--
-- No number column. The cards read 01 to 07 on the page, but that is their
-- position rather than their identity - storing it would let an editor
-- reorder the carousel and leave the numbers scrambled behind them.

CREATE TABLE vms_capability_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  title             VARCHAR(160)  NOT NULL,
  description       VARCHAR(400)  NOT NULL,

  -- The screenshot, from one of two mutually exclusive sources, and required:
  -- the card is mostly its picture.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  image_alt         VARCHAR(255),

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT vms_capability_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT vms_capability_cards_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT vms_capability_cards_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT vms_capability_cards_image_alt_check
    CHECK (image_alt IS NULL OR btrim(image_alt) <> ''),
  CONSTRAINT vms_capability_cards_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '')
);

CREATE INDEX idx_vms_capability_cards_order
  ON vms_capability_cards (display_order, created_at);
CREATE INDEX idx_vms_capability_cards_status ON vms_capability_cards (status);
CREATE INDEX idx_vms_capability_cards_image_file
  ON vms_capability_cards (image_file_id) WHERE image_file_id IS NOT NULL;

-- ── the customer-outcome showcase ─────────────────────────────────────────
--
-- A player with a tab strip beside it. Picking a tab swaps the video and the
-- block of copy under it.
--
-- The video is optional even though the section is a player: the three
-- entries shipped today all point at one placeholder clip borrowed from the
-- POS page, and a row that could not be saved until a real film existed would
-- stop an editor writing the copy first. Absent means the site keeps whatever
-- it ships.

CREATE TABLE vms_outcome_videos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The tab's own label, down the side of the player.
  label             VARCHAR(120)  NOT NULL,
  -- The pill over the player, and the running time beside it. Both are shown
  -- rather than measured, so both are text.
  badge             VARCHAR(120)  NOT NULL,
  duration          VARCHAR(20),

  -- The copy under the player for this tab.
  title             VARCHAR(200)  NOT NULL,
  description       TEXT          NOT NULL,

  -- The link under the copy. Both halves or neither, as everywhere else.
  button_label      VARCHAR(120),
  button_href       VARCHAR(500),

  -- The film itself, from one of two mutually exclusive sources.
  video_url         VARCHAR(1000),
  video_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The still shown before it plays.
  poster_url        VARCHAR(1000),
  poster_file_id    UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT vms_outcome_videos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT vms_outcome_videos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT vms_outcome_videos_single_video_source_check
    CHECK (video_url IS NULL OR video_file_id IS NULL),
  CONSTRAINT vms_outcome_videos_single_poster_source_check
    CHECK (poster_url IS NULL OR poster_file_id IS NULL),
  CONSTRAINT vms_outcome_videos_button_pair_check
    CHECK (num_nonnulls(button_label, button_href) <> 1),
  CONSTRAINT vms_outcome_videos_duration_check
    CHECK (duration IS NULL OR btrim(duration) <> ''),
  CONSTRAINT vms_outcome_videos_not_blank_check
    CHECK (
      btrim(label) <> '' AND btrim(badge) <> ''
      AND btrim(title) <> '' AND btrim(description) <> ''
    )
);

CREATE INDEX idx_vms_outcome_videos_order
  ON vms_outcome_videos (display_order, created_at);
CREATE INDEX idx_vms_outcome_videos_status ON vms_outcome_videos (status);

-- ── the FAQ ───────────────────────────────────────────────────────────────

CREATE TABLE vms_faq_entries (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  question          VARCHAR(300)  NOT NULL,
  answer            TEXT          NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT vms_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT vms_faq_entries_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT vms_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_vms_faq_entries_order ON vms_faq_entries (display_order, created_at);
CREATE INDEX idx_vms_faq_entries_status ON vms_faq_entries (status);

-- ── the closing band ──────────────────────────────────────────────────────
--
-- A singleton: the page has exactly one, and it either exists or the site
-- keeps the band it ships. `singleton` is the one-row guard every other CMS
-- singleton in this codebase uses.
--
-- No trust strip and no button icons, unlike the WMS band: this design is two
-- plain buttons over a photograph, with both drawing the same arrow.

CREATE TABLE vms_cta_section (
  singleton             BOOLEAN       PRIMARY KEY DEFAULT TRUE,

  -- The photograph behind the copy, and the phone crop of it. Both from one
  -- of two mutually exclusive sources.
  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,
  mobile_image_url      VARCHAR(1000),
  mobile_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  primary_label         VARCHAR(120)  NOT NULL,
  primary_href          VARCHAR(500)  NOT NULL,
  secondary_label       VARCHAR(120),
  secondary_href        VARCHAR(500),

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT vms_cta_section_singleton_check CHECK (singleton),
  CONSTRAINT vms_cta_section_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT vms_cta_section_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT vms_cta_section_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT vms_cta_section_not_blank_check
    CHECK (btrim(primary_label) <> '' AND btrim(primary_href) <> '')
);

-- ── updated_at triggers ───────────────────────────────────────────────────

CREATE TRIGGER vms_hero_slides_set_updated_at
  BEFORE UPDATE ON vms_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER vms_proof_tiles_set_updated_at
  BEFORE UPDATE ON vms_proof_tiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER vms_capability_cards_set_updated_at
  BEFORE UPDATE ON vms_capability_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER vms_outcome_videos_set_updated_at
  BEFORE UPDATE ON vms_outcome_videos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER vms_faq_entries_set_updated_at
  BEFORE UPDATE ON vms_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER vms_cta_section_set_updated_at
  BEFORE UPDATE ON vms_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
