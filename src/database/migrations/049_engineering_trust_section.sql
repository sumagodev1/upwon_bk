-- Engineering & Manufacturing industry page CMS: the trust section.
--
-- "Built to Keep Raw Materials, Production, Quality, Warehouses, and Every
-- Finished Product Movement Connected." One heading over a row of figure cards
-- and a marquee of customer logos.
--
-- Two tables, on the FMS proof strip's pattern, because they are two different
-- edits: a logo is added the day a brand goes live, and a figure is revised
-- when the numbers change.
--
-- The eyebrow, heading and subtext above both live once in page_section_copy
-- under ('engineering-manufacturing', 'trust'). The section key is already
-- allowed - the home and ERP pages use it - but the page key is new, so the
-- page-key check widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp', 'sfa-dms', 'fms', 'pos', 'engineering-manufacturing'));

-- ── the logo marquee ──────────────────────────────────────────────────────

CREATE TABLE engineering_trust_logos (
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

  CONSTRAINT engineering_trust_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT engineering_trust_logos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT engineering_trust_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- A logo row exists only to show one.
  CONSTRAINT engineering_trust_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT engineering_trust_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_engineering_trust_logos_order
  ON engineering_trust_logos (display_order, created_at);
CREATE INDEX idx_engineering_trust_logos_status ON engineering_trust_logos (status);
CREATE INDEX idx_engineering_trust_logos_image_file
  ON engineering_trust_logos (image_file_id)
  WHERE image_file_id IS NOT NULL;

-- ── the figure cards ──────────────────────────────────────────────────────
--
-- One row per card. A card turns over between two figures on a timer, so it
-- carries a first figure (required) and a second (optional - a card without
-- one simply holds still).

CREATE TABLE engineering_trust_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,
  -- The icon's colour and the square behind it, both as #RRGGBB. Stored
  -- separately rather than derived, because the shipped cards pair each ink
  -- with a hand-picked wash rather than a fixed alpha of it.
  accent_color      CHAR(7)       NOT NULL,
  tint_color        CHAR(7)       NOT NULL,

  -- The figure as it is read: "2.5 Cr+", "Real-time". Text, not a number.
  value             VARCHAR(40)   NOT NULL,
  label             VARCHAR(160)  NOT NULL,
  -- The figure the card turns over to. Both halves or neither.
  alt_value         VARCHAR(40),
  alt_label         VARCHAR(160),

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT engineering_trust_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT engineering_trust_cards_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT engineering_trust_cards_accent_color_check
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT engineering_trust_cards_tint_color_check
    CHECK (tint_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT engineering_trust_cards_alt_pair_check
    CHECK (num_nonnulls(alt_value, alt_label) <> 1),
  CONSTRAINT engineering_trust_cards_not_blank_check
    CHECK (btrim(icon) <> '' AND btrim(value) <> '' AND btrim(label) <> ''),
  CONSTRAINT engineering_trust_cards_alt_not_blank_check
    CHECK (alt_value IS NULL OR (btrim(alt_value) <> '' AND btrim(alt_label) <> ''))
);

CREATE INDEX idx_engineering_trust_cards_order
  ON engineering_trust_cards (display_order, created_at);
CREATE INDEX idx_engineering_trust_cards_status ON engineering_trust_cards (status);

CREATE TRIGGER engineering_trust_logos_set_updated_at
  BEFORE UPDATE ON engineering_trust_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER engineering_trust_cards_set_updated_at
  BEFORE UPDATE ON engineering_trust_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
