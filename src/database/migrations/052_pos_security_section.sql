-- POS product page CMS: "GST-Compliant by Default. Your Sales Data Stays
-- Yours."
--
-- The largest band on the page, and four things to edit rather than one:
--
--   the singleton   the two panel labels, the shield, the line under the
--                   sphere, and the whole data-ownership strip
--   the badges      the compliance marks flanking the shield
--   the logos       the marks pinned to the integration sphere
--   the assurances  the "You own it." row at the foot of the strip
--
-- The eyebrow, heading and subtext above it all live once in
-- page_section_copy under ('pos', 'establishers'). That is the key the ERP
-- page uses for the same band - "Compliant by Design. Connected to What You
-- Already Use." - so it already passes its check and nothing widens here.

-- ── the fixed furniture ───────────────────────────────────────────────────

CREATE TABLE pos_security_section (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What an upsert conflicts on, so the first save creates the row and every
  -- later save replaces it.
  singleton                 BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  /*
   * The two small headings over the panels: "Compliant by Design" and
   * "Connected to What You Already Use".
   *
   * These were hardcoded in the component, and on the ERP page they still
   * are. They belong to the section rather than to either list under them,
   * which is why they sit here and not on the badges.
   */
  panel_one_label           VARCHAR(120)  NOT NULL,
  panel_two_label           VARCHAR(120)  NOT NULL,

  -- The shield between the two columns of badges. Optional: without it the
  -- columns simply close up, which is a working layout rather than a hole.
  shield_image_url          VARCHAR(1000),
  shield_image_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  /*
   * The line under the sphere: "Seamless integrations. Stronger operations."
   *
   * Drawn with an orange half, so it is authored in the grammar the headings
   * use - **like this** - and parsed server-side into an accent tree.
   * Optional; the sphere reads fine without a caption.
   */
  sphere_footnote           VARCHAR(240),

  -- ── the data-ownership strip ──
  --
  -- Required, unlike the artwork around it: the strip is the section's actual
  -- promise about customer data, and a band that raises the subject and then
  -- says nothing would be worse than one that never raised it.
  data_icon                 VARCHAR(60)   NOT NULL,
  data_heading              VARCHAR(160)  NOT NULL,
  data_body                 VARCHAR(600)  NOT NULL,

  -- The two illustrations flanking it. Optional - both are hidden below the
  -- md breakpoint already, so the strip is designed to work without them.
  data_left_image_url       VARCHAR(1000),
  data_left_image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,
  data_right_image_url      VARCHAR(1000),
  data_right_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  created_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_security_section_singleton_check
    CHECK (singleton = TRUE),

  CONSTRAINT pos_security_section_shield_source_check
    CHECK (shield_image_url IS NULL OR shield_image_file_id IS NULL),
  CONSTRAINT pos_security_section_left_source_check
    CHECK (data_left_image_url IS NULL OR data_left_image_file_id IS NULL),
  CONSTRAINT pos_security_section_right_source_check
    CHECK (data_right_image_url IS NULL OR data_right_image_file_id IS NULL),

  -- Absent is how the caption is turned off; blank is a row that renders as
  -- an empty gap under the sphere, so it is rejected rather than stored.
  CONSTRAINT pos_security_section_sphere_footnote_check
    CHECK (sphere_footnote IS NULL OR btrim(sphere_footnote) <> ''),
  CONSTRAINT pos_security_section_not_blank_check
    CHECK (
      btrim(panel_one_label) <> ''
      AND btrim(panel_two_label) <> ''
      AND btrim(data_icon) <> ''
      AND btrim(data_heading) <> ''
      AND btrim(data_body) <> ''
    )
);

CREATE INDEX idx_pos_security_section_shield_file
  ON pos_security_section (shield_image_file_id)
  WHERE shield_image_file_id IS NOT NULL;
CREATE INDEX idx_pos_security_section_left_file
  ON pos_security_section (data_left_image_file_id)
  WHERE data_left_image_file_id IS NOT NULL;
CREATE INDEX idx_pos_security_section_right_file
  ON pos_security_section (data_right_image_file_id)
  WHERE data_right_image_file_id IS NOT NULL;

-- ── the compliance badges ─────────────────────────────────────────────────

CREATE TABLE pos_security_badges (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,
  title             VARCHAR(160)  NOT NULL,
  -- The line under the title.
  subtext           VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_security_badges_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_security_badges_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_security_badges_not_blank_check
    CHECK (btrim(icon) <> '' AND btrim(title) <> '' AND btrim(subtext) <> '')
);

CREATE INDEX idx_pos_security_badges_order
  ON pos_security_badges (display_order, created_at);
CREATE INDEX idx_pos_security_badges_status ON pos_security_badges (status);

-- ── the sphere's marks ────────────────────────────────────────────────────
--
-- Its own list rather than the home page's home_integrations_entries, which
-- is what the ERP page's equivalent reads.
--
-- The two lists are nearly the same today and deliberately not identical: the
-- shipped POS sphere carries fifteen of the home page's sixteen marks and
-- leaves out the attendance device, because this sphere sits under a claim
-- about what a counter connects to - payment rails and aggregators - and
-- somebody curated it that way. Pointing this page at the home list would
-- quietly add that mark back.

CREATE TABLE pos_security_logos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The partner's name, read aloud by a screen reader in place of the image.
  alt               VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_security_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_security_logos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_security_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- A mark with no image is nothing at all: the row exists only to show one.
  CONSTRAINT pos_security_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT pos_security_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_pos_security_logos_order
  ON pos_security_logos (display_order, created_at);
CREATE INDEX idx_pos_security_logos_status ON pos_security_logos (status);
CREATE INDEX idx_pos_security_logos_image_file
  ON pos_security_logos (image_file_id)
  WHERE image_file_id IS NOT NULL;

-- ── the assurances ────────────────────────────────────────────────────────
--
-- The short row at the foot of the data strip: "You own it.", "You control
-- it.", "You decide." An icon and a phrase, nothing else.

CREATE TABLE pos_security_assurances (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  icon              VARCHAR(60)   NOT NULL,
  label             VARCHAR(120)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_security_assurances_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_security_assurances_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_security_assurances_not_blank_check
    CHECK (btrim(icon) <> '' AND btrim(label) <> '')
);

CREATE INDEX idx_pos_security_assurances_order
  ON pos_security_assurances (display_order, created_at);
CREATE INDEX idx_pos_security_assurances_status ON pos_security_assurances (status);

CREATE TRIGGER pos_security_section_set_updated_at
  BEFORE UPDATE ON pos_security_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pos_security_badges_set_updated_at
  BEFORE UPDATE ON pos_security_badges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pos_security_logos_set_updated_at
  BEFORE UPDATE ON pos_security_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pos_security_assurances_set_updated_at
  BEFORE UPDATE ON pos_security_assurances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
