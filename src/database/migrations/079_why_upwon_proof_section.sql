-- Why UpWon page CMS: the product proof section.
--
-- "See Everything. Control Everything." The copy over the dashboard artwork,
-- with four callouts pinned to the dashed connectors drawn into it - each an
-- icon, a title and a line of detail.
--
-- The QSR page's core capabilities shape (071): one panel record for the
-- artwork and its description, and one list. The corner each callout sits in,
-- and the colour of its icon, follow display order - which is why the list is
-- capped at four in the application: the artwork draws four connectors.
--
-- The copy lives in page_section_copy under ('why-upwon', 'proof'). Both keys
-- are already allowed, so no check widens here.

-- ── the artwork panel ─────────────────────────────────────────────────────

CREATE TABLE why_upwon_proof_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The artwork, from one of two mutually exclusive sources. Optional: with
  -- neither, the site keeps the one it ships.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- Read aloud in place of the artwork. Required: it shows the workflows.
  image_alt         VARCHAR(300)  NOT NULL,

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT why_upwon_proof_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT why_upwon_proof_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT why_upwon_proof_panel_alt_check
    CHECK (btrim(image_alt) <> '')
);

-- ── the callouts ──────────────────────────────────────────────────────

CREATE TABLE why_upwon_proof_callouts (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  title             VARCHAR(120)  NOT NULL,
  description       VARCHAR(300)  NOT NULL,
  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT why_upwon_proof_callouts_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT why_upwon_proof_callouts_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT why_upwon_proof_callouts_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '' AND btrim(icon) <> '')
);

CREATE INDEX idx_why_upwon_proof_callouts_order
  ON why_upwon_proof_callouts (display_order, created_at);
CREATE INDEX idx_why_upwon_proof_callouts_status ON why_upwon_proof_callouts (status);

CREATE TRIGGER why_upwon_proof_panel_set_updated_at
  BEFORE UPDATE ON why_upwon_proof_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER why_upwon_proof_callouts_set_updated_at
  BEFORE UPDATE ON why_upwon_proof_callouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
