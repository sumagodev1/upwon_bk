-- FMS product page CMS: "Not a Pitch. Just What's Already Running."
--
-- One heading over two panels. The left is a wall of customer brand marks that
-- scrolls in three columns; the right is a two-by-two grid of sourced numbers.
--
-- Two tables, because they are two different edits: a logo is added the day a
-- network goes live, and a figure is revised when the quarter's numbers land.
--
-- The eyebrow, heading and subtext above both panels live once in
-- page_section_copy under ('fms', 'proof'). That section key is already allowed
-- - the SFA-DMS page uses it - so no check widens here.

-- ── the brand wall ────────────────────────────────────────────────────────
--
-- A separate list from the SFA-DMS page's proof logos even though the artwork
-- overlaps today: that strip says "brands running SFA-DMS", this one says
-- "franchise networks running FMS", and the day those stop being the same set
-- an editor needs to be able to say so without touching the other page.

CREATE TABLE fms_proof_logos (
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

  CONSTRAINT fms_proof_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_proof_logos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT fms_proof_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- Unlike the optional artwork elsewhere, a logo with no image is nothing at
  -- all: the row exists only to show one.
  CONSTRAINT fms_proof_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT fms_proof_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_fms_proof_logos_order ON fms_proof_logos (display_order, created_at);
CREATE INDEX idx_fms_proof_logos_status ON fms_proof_logos (status);

CREATE INDEX idx_fms_proof_logos_image_file
  ON fms_proof_logos (image_file_id)
  WHERE image_file_id IS NOT NULL;

-- ── the numbers ───────────────────────────────────────────────────────────

CREATE TABLE fms_proof_stats (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,
  -- What the figure counts.
  label             VARCHAR(160)  NOT NULL,
  -- Where it comes from, which is what keeps the number honest.
  subtext           VARCHAR(160)  NOT NULL,
  /*
   * The figure as it is read: "200+", "1.5L+", "16". Text rather than a number,
   * because the grid renders it verbatim and the suffix carries as much meaning
   * as the digits.
   */
  value             VARCHAR(40)   NOT NULL,
  /*
   * The card's accent, as #RRGGBB. The icon's tint is this at ten percent
   * alpha, computed on the site, so the two cannot drift apart.
   */
  accent_color      CHAR(7)       NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_proof_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_proof_stats_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT fms_proof_stats_accent_color_check
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT fms_proof_stats_not_blank_check
    CHECK (
      btrim(icon) <> ''
      AND btrim(label) <> ''
      AND btrim(subtext) <> ''
      AND btrim(value) <> ''
    )
);

CREATE INDEX idx_fms_proof_stats_order ON fms_proof_stats (display_order, created_at);
CREATE INDEX idx_fms_proof_stats_status ON fms_proof_stats (status);

CREATE TRIGGER fms_proof_logos_set_updated_at
  BEFORE UPDATE ON fms_proof_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fms_proof_stats_set_updated_at
  BEFORE UPDATE ON fms_proof_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
