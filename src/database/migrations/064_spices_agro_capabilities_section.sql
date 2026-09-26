-- Spices & Agro Processing industry page CMS: the core capabilities section.
--
-- "Built to Power Every Step of Your Spices & Agro Processing Business." A dark
-- panel sat on a background of spices and leaves: the copy on its left, and a
-- numbered grid of capabilities on its right, each with an icon, a title and a
-- description.
--
-- Not the Engineering (050) or Beverages (057) shape: no fixed artwork and no
-- screenshots. One panel record (the background) and one list; the number on
-- each capability follows display order, and every icon shares one orange.
--
-- The copy lives in page_section_copy under ('spices-agro', 'capabilities').
-- Both keys are already allowed, so no check widens here.

-- ── the background panel ──────────────────────────────────────────────────

CREATE TABLE spices_agro_capabilities_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The background, from one of two mutually exclusive sources. Optional:
  -- with neither, the site keeps the one it ships. Decoration, so no alt text.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT spices_agro_capabilities_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT spices_agro_capabilities_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL)
);

-- ── the capabilities ──────────────────────────────────────────────────────

CREATE TABLE spices_agro_capabilities (
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

  CONSTRAINT spices_agro_capabilities_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT spices_agro_capabilities_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT spices_agro_capabilities_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '' AND btrim(icon) <> '')
);

CREATE INDEX idx_spices_agro_capabilities_order
  ON spices_agro_capabilities (display_order, created_at);
CREATE INDEX idx_spices_agro_capabilities_status ON spices_agro_capabilities (status);

CREATE TRIGGER spices_agro_capabilities_panel_set_updated_at
  BEFORE UPDATE ON spices_agro_capabilities_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER spices_agro_capabilities_set_updated_at
  BEFORE UPDATE ON spices_agro_capabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
