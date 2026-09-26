-- Why UpWon page CMS: the customer trust & testimonials section.
--
-- "Built Around the Way Modern Businesses Work." The copy and a button on the
-- left, a rotating testimonial card on the right, and a scrolling wall of
-- client logos under both.
--
-- Three tables, because they are three different edits: a testimonial is added
-- when a customer gives one, a logo the day a brand goes live (the same shape
-- as the industry pages' trust logos, 056/063/070), and the small lines around
-- them - the lead line over the heading, the button, the wall's label - are
-- one record read and replaced.
--
-- The copy lives in page_section_copy under ('why-upwon', 'testimonials').
-- Both keys are already allowed, so no check widens here.

-- ── the testimonials ──────────────────────────────────────────────────────

CREATE TABLE why_upwon_testimonials (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  quote             VARCHAR(600)  NOT NULL,
  -- Who said it - a role or a team rather than a named person, by convention.
  author            VARCHAR(160)  NOT NULL,
  -- The line under the author - usually the company.
  role              VARCHAR(160)  NOT NULL,
  -- The brand, read in place of its logo.
  brand             VARCHAR(160)  NOT NULL,
  -- The two small lines in the logo plate. Optional.
  category          VARCHAR(120),
  location          VARCHAR(120),

  -- The brand's logo, from one of two mutually exclusive sources. Required:
  -- the card shows it where a portrait would go.
  logo_url          VARCHAR(1000),
  logo_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT why_upwon_testimonials_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT why_upwon_testimonials_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT why_upwon_testimonials_single_logo_source_check
    CHECK (logo_url IS NULL OR logo_file_id IS NULL),
  CONSTRAINT why_upwon_testimonials_logo_required_check
    CHECK (num_nonnulls(logo_url, logo_file_id) = 1),
  CONSTRAINT why_upwon_testimonials_not_blank_check
    CHECK (btrim(quote) <> '' AND btrim(author) <> '' AND btrim(role) <> ''
           AND btrim(brand) <> '')
);

CREATE INDEX idx_why_upwon_testimonials_order
  ON why_upwon_testimonials (display_order, created_at);
CREATE INDEX idx_why_upwon_testimonials_status ON why_upwon_testimonials (status);
CREATE INDEX idx_why_upwon_testimonials_logo_file
  ON why_upwon_testimonials (logo_file_id)
  WHERE logo_file_id IS NOT NULL;

-- ── the client wall ───────────────────────────────────────────────────────

CREATE TABLE why_upwon_client_logos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The mark, from one of two mutually exclusive sources.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The brand name, read aloud by a screen reader in place of the image.
  alt               VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT why_upwon_client_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT why_upwon_client_logos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT why_upwon_client_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- A logo row exists only to show one.
  CONSTRAINT why_upwon_client_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT why_upwon_client_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_why_upwon_client_logos_order
  ON why_upwon_client_logos (display_order, created_at);
CREATE INDEX idx_why_upwon_client_logos_status ON why_upwon_client_logos (status);
CREATE INDEX idx_why_upwon_client_logos_image_file
  ON why_upwon_client_logos (image_file_id)
  WHERE image_file_id IS NOT NULL;

-- ── the panel ─────────────────────────────────────────────────────────────

CREATE TABLE why_upwon_testimonials_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The line between the eyebrow and the heading ("Trusted by Forward-Thinking
  -- Businesses"). Optional.
  lead_line         VARCHAR(160),
  -- The button under the copy. Both halves or neither.
  button_label      VARCHAR(120),
  button_href       VARCHAR(500),
  -- The small caps label over the client wall. Optional.
  wall_label        VARCHAR(160),

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT why_upwon_testimonials_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT why_upwon_testimonials_panel_button_pair_check
    CHECK (num_nonnulls(button_label, button_href) <> 1),
  -- Absent is how a line is turned off; blank would draw an empty one.
  CONSTRAINT why_upwon_testimonials_panel_not_blank_check
    CHECK ((lead_line IS NULL OR btrim(lead_line) <> '')
           AND (button_label IS NULL OR btrim(button_label) <> '')
           AND (button_href IS NULL OR btrim(button_href) <> '')
           AND (wall_label IS NULL OR btrim(wall_label) <> ''))
);

CREATE TRIGGER why_upwon_testimonials_set_updated_at
  BEFORE UPDATE ON why_upwon_testimonials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER why_upwon_client_logos_set_updated_at
  BEFORE UPDATE ON why_upwon_client_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER why_upwon_testimonials_panel_set_updated_at
  BEFORE UPDATE ON why_upwon_testimonials_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
