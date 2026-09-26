-- The comparison grid learns to hold ticks and crosses as well as prose and
-- ratings.
--
-- The HREasy page's "UpWon vs the Alternatives" is the same five entities the
-- ERP, SFA-DMS and POS grids already use - a section, its columns, its rows
-- and their cells - drawn a third way: each cell is a yes or a no, shown as a
-- tick or a cross. "No star ratings", as the section's own subtext puts it.
--
-- So this widens the shared tables again rather than adding a parallel set,
-- exactly as 038 did for ratings. Every default keeps the three existing
-- grids as they are: their sections stay TEXT or RATING, and their cells keep
-- a null flag.

-- ── a third way for a section's cells to be authored ──────────────────────

ALTER TABLE comparison_sections
  DROP CONSTRAINT comparison_sections_cell_type_check;

ALTER TABLE comparison_sections
  ADD CONSTRAINT comparison_sections_cell_type_check
    CHECK (cell_type IN ('TEXT', 'RATING', 'BOOLEAN'));

COMMENT ON COLUMN comparison_sections.cell_type IS
  'TEXT: each cell is a sentence. RATING: a score out of five. BOOLEAN: a tick or a cross.';

-- ── a cell is prose, a score, or a yes/no - never more than one ───────────

ALTER TABLE comparison_values
  ADD COLUMN flag BOOLEAN;

COMMENT ON COLUMN comparison_values.flag IS
  'BOOLEAN sections only: TRUE draws a tick, FALSE a cross. Null elsewhere.';

/*
 * Exactly one of the three. A cell with none of them is an empty box the grid
 * would draw a gap for; a cell with two is two answers to the same question,
 * and nothing decides which one renders.
 *
 * FALSE is a real answer here, not an absence - it is the cross, which is the
 * whole point of the rows where the two columns differ. That is why the check
 * counts non-nulls rather than truthiness.
 */
ALTER TABLE comparison_values
  DROP CONSTRAINT comparison_values_single_form_check;

ALTER TABLE comparison_values
  ADD CONSTRAINT comparison_values_single_form_check
    CHECK (num_nonnulls(content, rating, flag) = 1);
