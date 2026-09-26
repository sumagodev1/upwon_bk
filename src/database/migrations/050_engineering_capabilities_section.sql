-- Engineering & Manufacturing industry page CMS: the core capabilities section.
--
-- "Built to Power Every Part of Your Manufacturing Operations." Copy on the
-- left; on the right, an artwork of a connected plant with eight empty cards
-- drawn into it, each of which the site fills with one capability's number,
-- title and description.
--
-- One row per capability. The card a row lands in on the artwork, and the
-- number printed on it, both follow display order - which is why the list is
-- capped at eight in the application: the artwork draws eight cards and no
-- more. Below 1024px the artwork is replaced by stacked cards, and those are
-- the only place the icon and its two colours are drawn - on the artwork the
-- icons are part of the picture.
--
-- The eyebrow, heading and subtext live once in page_section_copy under
-- ('engineering-manufacturing', 'capabilities'). The section key is new, so
-- the table's check widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_section_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_section_key_check
    CHECK (section_key IN (
      -- home page
      'trust', 'industries', 'values', 'integrations', 'testimonials', 'faq', 'cta',
      -- ERP product page
      'hero', 'recognition', 'benefits', 'alternatives', 'outcomes', 'establishers',
      -- SFA-DMS product page
      'proof', 'video', 'packages',
      -- Engineering & Manufacturing industry page
      'capabilities'
    ));

CREATE TABLE engineering_capabilities (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  title             VARCHAR(160)  NOT NULL,
  description       VARCHAR(400)  NOT NULL,

  -- A name from the icon allowlist, drawn on the stacked cards only.
  icon              VARCHAR(60)   NOT NULL,
  -- The icon's colour and the square behind it, both as #RRGGBB.
  accent_color      CHAR(7)       NOT NULL,
  tint_color        CHAR(7)       NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT engineering_capabilities_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT engineering_capabilities_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT engineering_capabilities_accent_color_check
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT engineering_capabilities_tint_color_check
    CHECK (tint_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT engineering_capabilities_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '' AND btrim(icon) <> '')
);

CREATE INDEX idx_engineering_capabilities_order
  ON engineering_capabilities (display_order, created_at);
CREATE INDEX idx_engineering_capabilities_status ON engineering_capabilities (status);

CREATE TRIGGER engineering_capabilities_set_updated_at
  BEFORE UPDATE ON engineering_capabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
