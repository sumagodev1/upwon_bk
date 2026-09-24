-- The comparison grid learns to hold ratings as well as prose.
--
-- The SFA-DMS page's "UpWon vs the Alternatives" is the same five entities the
-- ERP page's grid already uses - a section, its columns, its rows and their
-- cells - drawn differently: each cell is a score out of five rather than a
-- sentence, and the table closes on a cost-of-ownership row whose cells are
-- short coloured badges.
--
-- So this widens the shared tables rather than adding a parallel set. Every
-- default keeps the ERP grid exactly as it is: TEXT cells, STANDARD rows, and
-- prose content.

-- ── how a section's cells are authored and drawn ──────────────────────────

ALTER TABLE comparison_sections
  ADD COLUMN cell_type VARCHAR(20) NOT NULL DEFAULT 'TEXT';

ALTER TABLE comparison_sections
  ADD CONSTRAINT comparison_sections_cell_type_check
    CHECK (cell_type IN ('TEXT', 'RATING'));

COMMENT ON COLUMN comparison_sections.cell_type IS
  'TEXT: each cell is a sentence. RATING: each cell is a score out of five.';

-- ── a row can be the table''s closing summary ─────────────────────────────
--
-- A SUMMARY row''s cells are short badges whatever the section''s cell type -
-- "BEST", "MEDIUM" - so it is a row shape rather than a second table.

ALTER TABLE comparison_rows
  ADD COLUMN row_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD';

ALTER TABLE comparison_rows
  ADD CONSTRAINT comparison_rows_row_type_check
    CHECK (row_type IN ('STANDARD', 'SUMMARY'));

-- ── a cell is prose or a score, never both ────────────────────────────────

ALTER TABLE comparison_values
  ADD COLUMN rating SMALLINT;

/*
 * The tone a summary badge is drawn in. Named rather than a colour, because
 * the three tones are the site's own palette - an authored hex here would let
 * somebody pick something outside it.
 */
ALTER TABLE comparison_values
  ADD COLUMN tone VARCHAR(20);

-- A rating cell carries no prose, so content stops being required.
ALTER TABLE comparison_values
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE comparison_values
  DROP CONSTRAINT comparison_values_content_check;

ALTER TABLE comparison_values
  ADD CONSTRAINT comparison_values_content_check
    CHECK (content IS NULL OR length(btrim(content)) > 0);

/*
 * Exactly one of the two. A cell with neither is an empty box the grid would
 * draw a gap for; a cell with both is two answers to the same question, and
 * nothing decides which one renders.
 */
ALTER TABLE comparison_values
  ADD CONSTRAINT comparison_values_single_form_check
    CHECK (num_nonnulls(content, rating) = 1);

/*
 * Zero is meaningful: it is the dash the grid draws for "not available
 * natively", which is a different claim from one star.
 */
ALTER TABLE comparison_values
  ADD CONSTRAINT comparison_values_rating_range_check
    CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

ALTER TABLE comparison_values
  ADD CONSTRAINT comparison_values_tone_check
    CHECK (tone IS NULL OR tone IN ('BEST', 'GOOD', 'NEUTRAL'));
