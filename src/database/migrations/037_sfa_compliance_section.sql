-- SFA-DMS product page CMS: "Compliant by Design. Connected to What You
-- Already Use."
--
-- Two panels under one heading. The left is a column of compliance badges over
-- a piece of artwork; the right is the integration sphere.
--
-- Two tables. One holds the panels themselves - their headers, their accents
-- and the artwork behind the left one - because those are a single small form.
-- The other holds the badges, which are a list that grows.
--
-- The sphere has no table. It draws the same logos as the home page's platform
-- integrations section - the same assets, saying the same thing about the same
-- partners - so it reads them from home_integrations_entries rather than
-- keeping a second list that would drift the first time somebody added a
-- partner to one and not the other. This is the arrangement the ERP page's
-- equivalent section already uses.
--
-- The eyebrow, heading and description above the panels live once in
-- page_section_copy under ('sfa-dms', 'establishers'). That section key is
-- already allowed - the ERP page uses it - so no check widens here.

-- ── the two panel headers ─────────────────────────────────────────────────
--
-- One record: the section has two fixed panels, and they are configured
-- together or not at all.

CREATE TABLE sfa_compliance_section (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton               BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The left panel: the small caps header over the badge column.
  compliance_label        VARCHAR(120)  NOT NULL,
  -- A name from the icon allowlist, drawn in the circle beside the label.
  compliance_icon         VARCHAR(60)   NOT NULL,

  /*
   * The artwork behind the left panel, from one of two mutually exclusive
   * sources. Optional: without it the panel keeps its cream ground, which is a
   * design rather than a hole.
   */
  background_image_url    VARCHAR(1000),
  background_image_file_id UUID         REFERENCES files(id) ON DELETE SET NULL,

  -- The right panel, which has no artwork of its own - the sphere is drawn.
  ecosystem_label         VARCHAR(120)  NOT NULL,
  ecosystem_icon          VARCHAR(60)   NOT NULL,
  /*
   * The right panel's accent, as #RRGGBB. The icon's tint is this at ten
   * percent alpha, computed on the site, so the two cannot drift apart. The
   * left panel has no equivalent column: it is the section's orange, which is
   * the site's own brand colour rather than something authored per section.
   */
  ecosystem_color         CHAR(7)       NOT NULL,

  created_by              UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by              UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT sfa_compliance_section_singleton_check
    CHECK (singleton),
  CONSTRAINT sfa_compliance_section_single_background_source_check
    CHECK (background_image_url IS NULL OR background_image_file_id IS NULL),
  CONSTRAINT sfa_compliance_section_color_check
    CHECK (ecosystem_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT sfa_compliance_section_not_blank_check
    CHECK (
      btrim(compliance_label) <> ''
      AND btrim(compliance_icon) <> ''
      AND btrim(ecosystem_label) <> ''
      AND btrim(ecosystem_icon) <> ''
    )
);

-- ── the compliance badges ─────────────────────────────────────────────────

CREATE TABLE sfa_compliance_badges (
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

  CONSTRAINT sfa_compliance_badges_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sfa_compliance_badges_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT sfa_compliance_badges_not_blank_check
    CHECK (
      btrim(icon) <> '' AND btrim(title) <> '' AND btrim(subtext) <> ''
    )
);

CREATE INDEX idx_sfa_compliance_badges_order
  ON sfa_compliance_badges (display_order, created_at);
CREATE INDEX idx_sfa_compliance_badges_status ON sfa_compliance_badges (status);

CREATE TRIGGER sfa_compliance_section_set_updated_at
  BEFORE UPDATE ON sfa_compliance_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sfa_compliance_badges_set_updated_at
  BEFORE UPDATE ON sfa_compliance_badges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
