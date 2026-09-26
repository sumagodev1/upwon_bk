-- POS product page CMS: "Not a Pitch. Just What's Already Running."
--
-- One heading over a single card holding two panels. The left is a wall of
-- customer brand marks that scrolls in two horizontal rows; the right is a
-- four-up row of sourced counter-level numbers.
--
-- Two tables, because they are two different edits: a logo is added the day a
-- chain goes live, and a figure is revised when the quarter's numbers land.
--
-- The eyebrow, heading and subtext above both panels live once in
-- page_section_copy under ('pos', 'proof'). Both halves of that key already
-- pass their checks - 'pos' was widened in by 047, and 'proof' is used by the
-- SFA-DMS and FMS pages - so no constraint widens here.

-- ── the brand wall ────────────────────────────────────────────────────────
--
-- A separate list from the FMS and SFA-DMS pages' proof logos even though the
-- artwork overlaps today: that strip says "franchise networks running FMS",
-- this one says "counters running POS", and the day those stop being the same
-- set an editor needs to be able to say so without touching the other pages.

CREATE TABLE pos_proof_logos (
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

  CONSTRAINT pos_proof_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_proof_logos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_proof_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- Unlike the optional artwork elsewhere, a logo with no image is nothing at
  -- all: the row exists only to show one.
  CONSTRAINT pos_proof_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT pos_proof_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_pos_proof_logos_order ON pos_proof_logos (display_order, created_at);
CREATE INDEX idx_pos_proof_logos_status ON pos_proof_logos (status);

CREATE INDEX idx_pos_proof_logos_image_file
  ON pos_proof_logos (image_file_id)
  WHERE image_file_id IS NOT NULL;

-- ── the numbers ───────────────────────────────────────────────────────────
--
-- Three columns where the FMS page's equivalent has five. That page draws its
-- figures as separate cards, each with its own accent and a second line naming
-- the source; this one draws a single divided row in one accent, with the
-- source folded into the label itself ("faster billing (Kaka Halwai)").
--
-- So there is deliberately no accent_color and no subtext here. Storing either
-- would be storing something the section has no way to render, which reads to
-- the next editor as a field that is broken rather than one that is unused.

CREATE TABLE pos_proof_stats (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,
  /*
   * The figure as it is read: "6,000+", "Rs 23L+", "48%". Text rather than a
   * number, because the row renders it verbatim and the suffix carries as much
   * meaning as the digits.
   */
  value             VARCHAR(40)   NOT NULL,
  /*
   * What the figure counts, and where it comes from. The source is part of the
   * line rather than a column of its own because that is how the row draws it.
   */
  label             VARCHAR(160)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_proof_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_proof_stats_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_proof_stats_not_blank_check
    CHECK (
      btrim(icon) <> ''
      AND btrim(value) <> ''
      AND btrim(label) <> ''
    )
);

CREATE INDEX idx_pos_proof_stats_order ON pos_proof_stats (display_order, created_at);
CREATE INDEX idx_pos_proof_stats_status ON pos_proof_stats (status);

CREATE TRIGGER pos_proof_logos_set_updated_at
  BEFORE UPDATE ON pos_proof_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pos_proof_stats_set_updated_at
  BEFORE UPDATE ON pos_proof_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
