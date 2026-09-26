-- HREasy product page CMS: "UpWon HRMS - Just What's Already Running."
--
-- A continuously-scrolling bento of mixed-size cards, not the logo wall the
-- other product pages carry. Two things make it different, and both shape the
-- schema:
--
--   1. A card is one of three kinds - a client logo, a figure, or a named
--      proof - and each kind draws different fields.
--   2. The cards are grouped into columns of fixed width, each holding one,
--      two or three cards depending on its shape.
--
-- So: tiles hold the content, cells hold the arrangement, and a cell points at
-- the tiles it draws.
--
-- The eyebrow, heading and subtext above the bento live once in
-- page_section_copy under ('hreasy', 'proof'). That section key is already
-- allowed - the SFA-DMS, FMS and POS pages use it - so no check widens here.

-- ── the tiles ─────────────────────────────────────────────────────────────
--
-- One table with three kinds rather than three tables: they are the same
-- thing to an editor - a card in the bento - and a cell has to be able to
-- point at any of them from the same slot.
--
-- The per-kind columns are nullable and guarded by a CHECK, so a LOGO row
-- cannot carry a figure and a STAT row cannot carry a picture.

CREATE TABLE hreasy_proof_tiles (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  kind              VARCHAR(20)   NOT NULL,

  -- LOGO: the brand mark, from one of two mutually exclusive sources, and the
  -- name a screen reader reads in its place.
  name              VARCHAR(160),
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- STAT: the figure, what it counts, and whose number it is.
  value             VARCHAR(40),
  label             VARCHAR(160),

  -- PROOF: the headline number and the line under it. `client` is shared with
  -- STAT - both name the customer in the same orange caps.
  client            VARCHAR(160),
  headline          VARCHAR(200),
  line              VARCHAR(400),

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT hreasy_proof_tiles_kind_check
    CHECK (kind IN ('LOGO', 'STAT', 'PROOF')),

  CONSTRAINT hreasy_proof_tiles_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  /*
   * Each kind carries exactly its own fields and none of the others'. Written
   * as one check per kind so the error names the shape that failed rather
   * than a column list.
   */
  CONSTRAINT hreasy_proof_tiles_logo_shape_check
    CHECK (
      kind <> 'LOGO'
      OR (
        btrim(name) <> ''
        AND num_nonnulls(image_url, image_file_id) = 1
        AND value IS NULL AND label IS NULL
        AND client IS NULL AND headline IS NULL AND line IS NULL
      )
    ),
  CONSTRAINT hreasy_proof_tiles_stat_shape_check
    CHECK (
      kind <> 'STAT'
      OR (
        btrim(value) <> '' AND btrim(label) <> '' AND btrim(client) <> ''
        AND name IS NULL AND image_url IS NULL AND image_file_id IS NULL
        AND headline IS NULL AND line IS NULL
      )
    ),
  CONSTRAINT hreasy_proof_tiles_proof_shape_check
    CHECK (
      kind <> 'PROOF'
      OR (
        btrim(client) <> '' AND btrim(headline) <> '' AND btrim(line) <> ''
        AND name IS NULL AND image_url IS NULL AND image_file_id IS NULL
        AND value IS NULL AND label IS NULL
      )
    )
);

CREATE INDEX idx_hreasy_proof_tiles_kind ON hreasy_proof_tiles (kind);
CREATE INDEX idx_hreasy_proof_tiles_image_file
  ON hreasy_proof_tiles (image_file_id)
  WHERE image_file_id IS NOT NULL;

-- ── the cells ─────────────────────────────────────────────────────────────
--
-- A column of the bento: a fixed width, a shape, and the tiles it draws.
--
--   TALL     one card filling the column
--   STACK    two cards, one above the other
--   WIDE_TOP a wide card over two half-width cards
--
-- Width and shape are enums rather than free values because the site draws
-- them with Tailwind classes, which have to exist in the source at build
-- time - a width string from here would name a class nobody generated, and
-- the column would collapse to nothing.

CREATE TABLE hreasy_proof_cells (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  width             VARCHAR(20)   NOT NULL,
  shape             VARCHAR(20)   NOT NULL,

  /*
   * The tiles this cell draws. RESTRICT rather than CASCADE or SET NULL: a
   * tile that is still on the page should not vanish because somebody tidied
   * the tile list, and a cell with a hole in it is worse than a refusal that
   * says which cell is using it.
   */
  tile_a_id         UUID          NOT NULL REFERENCES hreasy_proof_tiles(id) ON DELETE RESTRICT,
  tile_b_id         UUID          REFERENCES hreasy_proof_tiles(id) ON DELETE RESTRICT,
  tile_c_id         UUID          REFERENCES hreasy_proof_tiles(id) ON DELETE RESTRICT,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT hreasy_proof_cells_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT hreasy_proof_cells_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT hreasy_proof_cells_width_check
    CHECK (width IN ('NARROW', 'SMALL', 'MEDIUM', 'WIDE')),
  CONSTRAINT hreasy_proof_cells_shape_check
    CHECK (shape IN ('TALL', 'STACK', 'WIDE_TOP')),

  /*
   * The shape says how many tiles the cell draws, so it also says which slots
   * must be filled. A cell with a spare tile nobody renders is a quiet
   * inconsistency; refusing it is how an editor finds out at save time.
   */
  CONSTRAINT hreasy_proof_cells_slots_match_shape_check
    CHECK (
      (shape = 'TALL' AND tile_b_id IS NULL AND tile_c_id IS NULL)
      OR (shape = 'STACK' AND tile_b_id IS NOT NULL AND tile_c_id IS NULL)
      OR (shape = 'WIDE_TOP' AND tile_b_id IS NOT NULL AND tile_c_id IS NOT NULL)
    )
);

CREATE INDEX idx_hreasy_proof_cells_order ON hreasy_proof_cells (display_order, created_at);
CREATE INDEX idx_hreasy_proof_cells_status ON hreasy_proof_cells (status);

-- Lets a delete answer "is this tile still on the page?" without a sequential
-- scan, which is what the RESTRICT above leans on.
CREATE INDEX idx_hreasy_proof_cells_tile_a ON hreasy_proof_cells (tile_a_id);
CREATE INDEX idx_hreasy_proof_cells_tile_b
  ON hreasy_proof_cells (tile_b_id) WHERE tile_b_id IS NOT NULL;
CREATE INDEX idx_hreasy_proof_cells_tile_c
  ON hreasy_proof_cells (tile_c_id) WHERE tile_c_id IS NOT NULL;

CREATE TRIGGER hreasy_proof_tiles_set_updated_at
  BEFORE UPDATE ON hreasy_proof_tiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER hreasy_proof_cells_set_updated_at
  BEFORE UPDATE ON hreasy_proof_cells
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
